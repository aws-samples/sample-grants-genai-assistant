import json
import boto3
import os
import sys
import uuid
import time
from datetime import datetime
import logging
import decimal
from typing import List
from urllib.parse import urlparse
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

from appsync_config import get_appsync_config
from grant_normalizer import normalize_grants, convert_decimal_to_float

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def extract_broad_keywords(profile_keywords: List[str], max_queries: int = 3) -> List[str]:
    """
    Extract 2-3 keywords from profile for search queries.
    Keeps multi-word phrases intact (up to 3 words) to match manual search behavior.
    
    Strategy:
    - Keep phrases up to 3 words intact (e.g., "Machine Learning", "Natural Language Processing")
    - Truncate longer phrases to first 3 words with warning
    - This ensures agent discovery uses same queries as manual left-nav search
    - Bayesian scoring then filters results to best profile matches
    """
    broad_terms = []
    
    for keyword in profile_keywords:
        words = keyword.strip().split()
        
        # Keep phrases up to 3 words, truncate longer ones
        if len(words) <= 3:
            broad_terms.append(keyword.strip())
        else:
            # Truncate to first 3 words
            truncated = ' '.join(words[:3])
            broad_terms.append(truncated)
            logger.warning(f"⚠️ Truncated keyword '{keyword}' to '{truncated}' (max 3 words)")
    
    # Deduplicate while preserving order
    unique_terms = list(dict.fromkeys(broad_terms))
    
    # Return top N
    result = unique_terms[:max_queries]
    
    logger.info(f"📋 Selected {len(result)} keywords for searches: {result}")
    
    return result

def call_appsync_iam(endpoint: str, query: str, variables: dict = None) -> dict:
    """
    Call AppSync GraphQL API using IAM authentication (SigV4 signing).
    
    Args:
        endpoint: AppSync GraphQL endpoint URL
        query: GraphQL query or mutation string
        variables: GraphQL variables dict (optional)
    
    Returns:
        GraphQL response data dict
    
    Raises:
        Exception: If request fails or GraphQL returns errors
    """
    logger.info(f"📡 Calling AppSync with IAM auth: {endpoint}")
    
    # Prepare request body
    request_body = json.dumps({
        'query': query,
        'variables': variables or {}
    })
    
    # Parse endpoint
    parsed_url = urlparse(endpoint)
    
    # Create AWS request for signing
    aws_request = AWSRequest(
        method='POST',
        url=endpoint,
        data=request_body,
        headers={
            'Content-Type': 'application/json',
            'host': parsed_url.netloc
        }
    )
    
    # Sign request with SigV4 using Lambda's execution role
    credentials = boto3.Session().get_credentials()
    region = os.environ.get('AWS_REGION', 'us-east-2')
    SigV4Auth(credentials, 'appsync', region).add_auth(aws_request)
    
    # Make HTTP request using urllib (no external dependencies)
    from urllib.request import Request, urlopen
    from urllib.error import HTTPError
    
    req = Request(
        endpoint,
        data=request_body.encode('utf-8'),
        headers=dict(aws_request.headers)
    )
    
    try:
        with urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise Exception(f"AppSync request failed: {e.code} - {error_body}")
    
    # Check for GraphQL errors
    if 'errors' in result:
        raise Exception(f"GraphQL errors: {json.dumps(result['errors'])}")
    
    logger.info("✅ AppSync call successful")
    return result.get('data', {})

def fetch_agent_config(config_id):
    """Fetch AgentConfig from GraphQL API using IAM auth"""
    # Get AppSync configuration
    appsync_config = get_appsync_config()
    graphql_endpoint = appsync_config['endpoint']
    
    query = """
    query GetAgentConfig($id: ID!) {
      getAgentConfig(id: $id) {
        id
        userId
        profileSelected
        grantsSurfaced
        timeInterval
        autoOn
        isActive
      }
    }
    """
    
    result = call_appsync_iam(graphql_endpoint, query, {'id': config_id})
    return result.get('getAgentConfig')

def fetch_user_profile(user_id):
    """Fetch UserProfile from GraphQL API using IAM auth"""
    # Get AppSync configuration
    appsync_config = get_appsync_config()
    graphql_endpoint = appsync_config['endpoint']
    
    # Query by userId attribute using filter (since there's no secondary index)
    query = """
    query ListUserProfiles($userId: String!) {
      listUserProfiles(filter: {userId: {eq: $userId}}) {
        items {
          id
          userId
          name
          email
          researcherType
          keywords
          optimized_keywords
          agencies
          research_areas
          isActive
        }
      }
    }
    """
    
    result = call_appsync_iam(graphql_endpoint, query, {'userId': user_id})
    
    # Return the first matching profile (should be only one per userId)
    items = result.get('listUserProfiles', {}).get('items', [])
    if not items:
        logger.warning(f"No profile found for userId: {user_id}")
        return None
    
    if len(items) > 1:
        logger.warning(f"Multiple profiles found for userId {user_id}, using first one")
    
    return items[0]

def handler(event, context):
    """
    Handle different actions for agent discovery:
    - checkConfig: Check if discovery should run (returns all needed data)
    - invokeSearches: Invoke 6 parallel searches (3 US + 3 EU) and wait for completion
    - consolidate: Read DDB tables, filter, write to S3
    - executeDiscovery: [DEPRECATED] Legacy action for backwards compatibility
    - retrieveResults: [DEPRECATED] Legacy action for backwards compatibility
    
    Supports forceRun flag to bypass scheduling checks
    """
    
    try:
        logger.info(f"Starting agent discovery with event: {json.dumps(event)}")
        
        action = event.get('action', 'executeDiscovery')
        
        # Check for forceRun flag from input (handle nested structure)
        input_data = event.get('input', {})
        
        # Extract forceRun from the correct location
        # Step Function passes: {"action": "checkConfig", "input": {"userId": "...", "configId": "...", "forceRun": true}}
        # So forceRun is at input_data level (event['input']['forceRun'])
        force_run = input_data.get('forceRun', False)
        
        logger.info(f"🔍 Event structure: action={action}, input_data keys={list(input_data.keys())}, forceRun={force_run}")
        
        if action == 'checkConfig':
            # Extract configId and userId from input_data (not nested further)
            config_id_override = input_data.get('configId')
            user_id_override = input_data.get('userId')
            
            logger.info(f"🔍 checkConfig: configId={config_id_override}, userId={user_id_override}, forceRun={force_run}")
            
            return check_agent_config_v2(
                force_run=force_run,
                config_id=config_id_override,
                user_id=user_id_override
            )
        elif action == 'invokeSearches':
            # NEW: Invoke all 6 searches and wait for completion
            config_id = event.get('configId')
            user_id = event.get('userId')
            queries = event.get('queries', [])
            timestamp = event.get('timestamp')
            
            if not config_id or not user_id:
                raise ValueError('configId and userId required for invokeSearches')
            
            return invoke_parallel_searches(config_id, user_id, queries, timestamp, input_data)
        elif action == 'consolidate':
            # NEW: Consolidate results from both DDB tables
            config_id = event.get('configId')
            user_id = event.get('userId')
            timestamp = event.get('timestamp')
            grants_surfaced = event.get('grantsSurfaced', 3)
            us_session_ids = event.get('usSessionIds', [])
            eu_session_ids = event.get('euSessionIds', [])
            
            if not config_id or not user_id or not timestamp:
                raise ValueError('configId, userId, and timestamp required for consolidate')
            
            return consolidate_results(config_id, user_id, timestamp, grants_surfaced, us_session_ids, eu_session_ids)
        elif action == 'executeDiscovery':
            # DEPRECATED: Legacy action for backwards compatibility
            config_id = event.get('configId')
            if not config_id:
                raise ValueError('No configId provided for executeDiscovery')
            user_id = input_data.get('userId')
            return execute_discovery(config_id, user_id)
        elif action == 'retrieveResults':
            # DEPRECATED: Legacy action for backwards compatibility
            session_id = event.get('sessionId')
            config_id = event.get('configId')
            user_id = event.get('userId')
            grants_surfaced = event.get('grantsSurfaced', 3)
            us_session_id = event.get('usSessionId')
            eu_session_id = event.get('euSessionId')
            
            if not session_id or not config_id or not user_id:
                raise ValueError('sessionId, configId, and userId required for retrieveResults')
            
            return retrieve_and_store_results(
                session_id, config_id, user_id, grants_surfaced,
                us_session_id=us_session_id,
                eu_session_id=eu_session_id
            )
        else:
            raise ValueError(f'Unknown action: {action}')
            
    except Exception as e:
        logger.error(f"Error in agent discovery: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'errorType': type(e).__name__
        }

def check_agent_config_v2(force_run=False, config_id=None, user_id=None):
    """
    Check if any agent config needs to run discovery based on timeInterval.
    Returns ALL data needed for Step Function workflow.
    
    Args:
        force_run: If True, bypass scheduling checks and force execution
        config_id: Optional specific config ID to check (for multi-user force runs)
        user_id: Optional specific user ID to check (for multi-user force runs)
        
    Returns:
        {
            'shouldRun': bool,
            'configId': str,
            'userId': str,
            'queries': list[str],  # 3 broad keywords for searches
            'timestamp': int,  # Unix timestamp for session IDs
            'grantsSurfaced': int,  # From AgentConfig
            'message': str
        }
    """
    try:
        # If specific config_id provided, use it directly
        if config_id and user_id:
            logger.info(f"Using specific config: {config_id} for user: {user_id}")
            
            # Fetch agent config
            agent_config = fetch_agent_config(config_id)
            if not agent_config:
                raise ValueError(f"AgentConfig not found: {config_id}")
            
            # Verify userId matches
            if agent_config.get('userId') != user_id:
                raise ValueError(f"Config {config_id} userId mismatch")
            
            # Fetch user profile to get keywords
            user_profile = fetch_user_profile(user_id)
            if not user_profile:
                raise ValueError(f"No profile found for user: {user_id}")
            
            # Extract broad keywords for searches
            profile_keywords = user_profile.get('keywords', [])
            optimized_keywords = user_profile.get('optimized_keywords', [])
            all_keywords = profile_keywords + optimized_keywords
            broad_keywords = extract_broad_keywords(all_keywords, max_queries=3)
            
            if not broad_keywords:
                broad_keywords = ['research']  # Fallback
            
            # Generate timestamp for session IDs
            timestamp = int(datetime.now().timestamp())
            
            # Get grants surfaced from config
            grants_surfaced = agent_config.get('grantsSurfaced', 3)
            
            logger.info(f"🚀 Running for specific config {config_id}, user {user_id}")
            return {
                'statusCode': 200,
                'shouldRun': True,
                'configId': config_id,
                'userId': user_id,
                'queries': broad_keywords,
                'timestamp': timestamp,
                'grantsSurfaced': grants_surfaced,
                'message': f'Running agent discovery for config {config_id}',
                'forceRun': force_run
            }
        
        # NO FALLBACK - configId and userId are REQUIRED for multi-user architecture
        # The Scheduler Lambda MUST pass these values
        raise ValueError(f"configId and userId are required but not provided. configId={config_id}, userId={user_id}")
        
        # If forceRun is True, return immediately with all data
        if force_run:
            logger.info(f"🚀 FORCE RUN: Bypassing schedule check for config {config_id}")
            return {
                'statusCode': 200,
                'shouldRun': True,
                'configId': config_id,
                'userId': user_id,
                'queries': broad_keywords,
                'timestamp': timestamp,
                'grantsSurfaced': grants_surfaced,
                'message': f'Force running agent discovery for config {config_id} (manual override)',
                'forceRun': True
            }
        
        # Check if enough time has passed since lastRun
        # This code path should NOT be reached in multi-user architecture
        # because Scheduler Lambda always passes configId/userId
        raise ValueError("Unreachable code: schedule checking not supported in multi-user mode")
            
    except Exception as e:
        logger.error(f"Error checking agent config: {e}")
        return {
            'statusCode': 500,
            'shouldRun': False,
            'error': str(e)
        }

def invoke_parallel_searches(config_id: str, user_id: str, queries: List[str], timestamp: int, input_data: dict):
    """
    NEW ACTION: Invoke 6 parallel searches (3 US + 3 EU) and wait for completion.
    
    Each search invokes processor via SQS (existing flow unchanged).
    Returns session IDs for consolidation step.
    
    Args:
        config_id: AgentConfig ID
        user_id: User ID
        queries: List of 3 broad keywords for searches
        timestamp: Unix timestamp for session IDs
        input_data: Additional input data (forceRun, etc.)
        
    Returns:
        {
            'statusCode': 200,
            'usSessionIds': list[str],
            'euSessionIds': list[str],
            'message': str
        }
    """
    try:
        logger.info(f"🚀 Invoking parallel searches for user {user_id}")
        logger.info(f"   Queries: {queries}")
        logger.info(f"   Timestamp: {timestamp}")
        
        # Fetch user profile to determine which regions to search
        user_profile = fetch_user_profile(user_id)
        if not user_profile:
            raise ValueError(f"No profile found for user: {user_id}")
        
        profile_agencies = user_profile.get('agencies', [])
        
        # 🌍 MULTI-REGION DETECTION: Check if EU agency is in profile
        # EU programmes: Horizon Europe, Digital Europe, Connecting Europe, LIFE, EUAF, etc.
        EU_PROGRAMMES = ['European Commission', 'Horizon Europe', 'Digital Europe', 'Connecting Europe', 'LIFE', 'EUAF']
        has_eu_agency = any(agency in profile_agencies for agency in EU_PROGRAMMES)
        us_agencies = [a for a in profile_agencies if a not in EU_PROGRAMMES]
        
        logger.info(f"🌍 Agency Detection:")
        logger.info(f"   Profile agencies: {profile_agencies}")
        logger.info(f"   Has EU agency: {has_eu_agency}")
        logger.info(f"   US agencies: {us_agencies}")
        
        us_session_ids = []
        eu_session_ids = []
        
        # 🇺🇸 Invoke US searches (3 queries)
        if us_agencies or not has_eu_agency:
            logger.info(f"🇺🇸 Invoking {len(queries)} US searches")
            
            for idx, keyword in enumerate(queries):
                us_session_id = f"agent_discovery_us_{timestamp}_{idx}_{uuid.uuid4().hex[:6]}"
                logger.info(f"🇺🇸 US Search {idx+1}/{len(queries)}: query='{keyword}' session={us_session_id}")
                
                invoke_us_search(us_session_id, user_id, keyword, us_agencies if us_agencies else profile_agencies)
                us_session_ids.append(us_session_id)
        
        # 🇪🇺 Invoke EU searches (3 queries)
        if has_eu_agency:
            logger.info(f"🇪🇺 Invoking {len(queries)} EU searches")
            
            for idx, keyword in enumerate(queries):
                eu_session_id = f"agent_discovery_eu_{timestamp}_{idx}_{uuid.uuid4().hex[:6]}"
                logger.info(f"🇪🇺 EU Search {idx+1}/{len(queries)}: query='{keyword}' session={eu_session_id}")
                
                invoke_eu_search(eu_session_id, user_id, keyword)
                eu_session_ids.append(eu_session_id)
        
        total_searches = len(us_session_ids) + len(eu_session_ids)
        logger.info(f"✅ All {total_searches} searches invoked successfully")
        logger.info(f"   US Sessions: {us_session_ids}")
        logger.info(f"   EU Sessions: {eu_session_ids}")
        
        return {
            'statusCode': 200,
            'usSessionIds': us_session_ids,
            'euSessionIds': eu_session_ids,
            'totalSearches': total_searches,
            'message': f'Invoked {total_searches} parallel searches ({len(us_session_ids)} US + {len(eu_session_ids)} EU)'
        }
        
    except Exception as e:
        logger.error(f"Error invoking parallel searches: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'error': str(e),
            'errorType': type(e).__name__
        }


def consolidate_results(config_id: str, user_id: str, timestamp: int, grants_surfaced: int, us_session_ids: List[str], eu_session_ids: List[str]):
    """
    NEW ACTION: Consolidate results from both DDB tables, filter, and write to S3.
    
    This replaces the old retrieve_and_store_results action.
    Handles 0-result sessions naturally (no DDB records = empty list).
    
    Args:
        config_id: AgentConfig ID
        user_id: User ID
        timestamp: Unix timestamp for session IDs
        grants_surfaced: Number of grants to surface (from AgentConfig)
        us_session_ids: List of US session IDs
        eu_session_ids: List of EU session IDs
        
    Returns:
        {
            'statusCode': 200,
            'totalGrantsFound': int,
            'topGrantsSelected': int,
            's3Key': str,
            'message': str
        }
    """
    try:
        logger.info(f"🔄 [CONSOLIDATE_START] Starting consolidation for userId: {user_id}")
        logger.info(f"🔄 [CONSOLIDATE_START] ConfigId: {config_id}")
        logger.info(f"🔄 [CONSOLIDATE_START] Timestamp: {timestamp}")
        logger.info(f"🔄 [CONSOLIDATE_START] US Sessions: {us_session_ids}")
        logger.info(f"🔄 [CONSOLIDATE_START] EU Sessions: {eu_session_ids}")
        logger.info(f"🔄 [CONSOLIDATE_START] Grants to surface: {grants_surfaced}")
        
        dynamodb = boto3.resource('dynamodb')
        
        # 🇺🇸 Retrieve US grants from all sessions
        us_grants = []
        if us_session_ids:
            us_table_name = os.environ.get('GRANT_RECORD_TABLE')
            if not us_table_name:
                raise ValueError('GRANT_RECORD_TABLE environment variable not set')
            
            logger.info(f"🔍 [DDB_SCAN] US Table Name: {us_table_name}")
            us_table = dynamodb.Table(us_table_name)
            
            for session in us_session_ids:
                logger.info(f"🔍 [DDB_QUERY] Querying US table for sessionId: {session}")
                
                try:
                    # Paginate through all results using Query (efficient with GSI)
                    session_grants = []
                    us_response = us_table.query(
                        IndexName='grantRecordsBySessionId',
                        KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session)
                    )
                    
                    logger.info(f"🔍 [DDB_QUERY] US ScannedCount: {us_response.get('ScannedCount', 0)}, Count: {us_response.get('Count', 0)}")
                    session_grants.extend(us_response.get('Items', []))
                    
                    # Handle pagination
                    while 'LastEvaluatedKey' in us_response:
                        logger.info(f"🔍 [DDB_QUERY] Paginating US query (LastEvaluatedKey found)...")
                        us_response = us_table.query(
                            IndexName='grantRecordsBySessionId',
                            KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session),
                            ExclusiveStartKey=us_response['LastEvaluatedKey']
                        )
                        logger.info(f"🔍 [DDB_QUERY] US Page ScannedCount: {us_response.get('ScannedCount', 0)}, Count: {us_response.get('Count', 0)}")
                        session_grants.extend(us_response.get('Items', []))
                    
                    us_grants.extend(session_grants)
                    logger.info(f"🇺🇸 Session {session}: {len(session_grants)} grants (after pagination)")
                    
                except Exception as scan_error:
                    logger.error(f"❌ [DDB_QUERY] Error querying US table for session {session}: {str(scan_error)}")
                    import traceback
                    logger.error(f"❌ [DDB_QUERY] Traceback: {traceback.format_exc()}")
            
            logger.info(f"🇺🇸 Total US grants (before dedup): {len(us_grants)}")
        
        # 🇪🇺 Retrieve EU grants from all sessions
        eu_grants = []
        if eu_session_ids:
            eu_table_name = os.environ.get('EU_GRANT_RECORDS_TABLE')
            if not eu_table_name:
                logger.warning("EU_GRANT_RECORDS_TABLE not set, skipping EU grants")
            else:
                logger.info(f"🔍 [DDB_SCAN] EU Table Name: {eu_table_name}")
                eu_table = dynamodb.Table(eu_table_name)
                
                for session in eu_session_ids:
                    logger.info(f"🔍 [DDB_SCAN] Querying for sessionId: {session}")
                    
                    try:
                        # Paginate through all results using Query (efficient with GSI)
                        session_grants = []
                        eu_response = eu_table.query(
                            IndexName='euGrantRecordsBySessionId',
                            KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session)
                        )
                        
                        # Log raw response details
                        logger.info(f"🔍 [DDB_QUERY] Raw response keys: {list(eu_response.keys())}")
                        logger.info(f"🔍 [DDB_QUERY] ScannedCount: {eu_response.get('ScannedCount', 0)}")
                        logger.info(f"🔍 [DDB_QUERY] Count: {eu_response.get('Count', 0)}")
                        
                        session_grants.extend(eu_response.get('Items', []))
                        
                        # Handle pagination
                        while 'LastEvaluatedKey' in eu_response:
                            logger.info(f"🔍 [DDB_QUERY] Paginating EU query (LastEvaluatedKey found)...")
                            eu_response = eu_table.query(
                                IndexName='euGrantRecordsBySessionId',
                                KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session),
                                ExclusiveStartKey=eu_response['LastEvaluatedKey']
                            )
                            logger.info(f"🔍 [DDB_QUERY] EU Page ScannedCount: {eu_response.get('ScannedCount', 0)}, Count: {eu_response.get('Count', 0)}")
                            session_grants.extend(eu_response.get('Items', []))
                        
                        if session_grants:
                            logger.info(f"🔍 [DDB_QUERY] Found {len(session_grants)} grants for session {session} (after pagination)")
                            # Log first grant's sessionId to verify it matches
                            first_grant_session = session_grants[0].get('sessionId', 'MISSING')
                            logger.info(f"🔍 [DDB_QUERY] First grant sessionId: {first_grant_session}")
                        else:
                            logger.warning(f"⚠️ [DDB_QUERY] No grants found for session {session} even after pagination")
                        
                        eu_grants.extend(session_grants)
                        logger.info(f"🇪🇺 Session {session}: {len(session_grants)} grants")
                        
                    except Exception as scan_error:
                        logger.error(f"❌ [DDB_QUERY] Error querying for session {session}: {str(scan_error)}")
                        import traceback
                        logger.error(f"❌ [DDB_QUERY] Traceback: {traceback.format_exc()}")
                
                logger.info(f"🇪🇺 Total EU grants (before dedup): {len(eu_grants)}")
        
        # 🌍 Normalize grants from both regions
        all_grants_raw = normalize_grants(us_grants, eu_grants)
        logger.info(f"🌍 Total grants after normalization (before dedup): {len(all_grants_raw)}")
        
        # 🔄 Deduplicate by grantId
        all_grants = deduplicate_grants(all_grants_raw)
        logger.info(f"🌍 Total unique grants after deduplication: {len(all_grants)}")
        
        # Apply minimum profile match threshold (20%)
        MIN_PROFILE_MATCH_SCORE = 0.20
        
        # 🎯 SEPARATE SELECTION: Select top N from US and top N from EU independently
        # This ensures both regions are represented in multi-region profiles
        top_grants = []
        us_filtered = []
        eu_filtered = []
        
        # 🇺🇸 Select top N US grants
        if us_session_ids:
            us_scored = [g for g in all_grants if g.get('source') == 'US' and g.get('profileMatchScore') is not None]
            us_filtered = [g for g in us_scored if float(g.get('profileMatchScore', 0)) >= MIN_PROFILE_MATCH_SCORE]
            us_filtered.sort(key=lambda x: float(x.get('profileMatchScore', 0)), reverse=True)
            top_us = us_filtered[:grants_surfaced]
            top_grants.extend(top_us)
            logger.info(f"🇺🇸 US: {len(us_scored)} scored, {len(us_filtered)} above threshold, selected top {len(top_us)}")
        
        # 🇪🇺 Select top N EU grants
        if eu_session_ids:
            eu_scored = [g for g in all_grants if g.get('source') == 'EU' and g.get('profileMatchScore') is not None]
            eu_filtered = [g for g in eu_scored if float(g.get('profileMatchScore', 0)) >= MIN_PROFILE_MATCH_SCORE]
            eu_filtered.sort(key=lambda x: float(x.get('profileMatchScore', 0)), reverse=True)
            top_eu = eu_filtered[:grants_surfaced]
            top_grants.extend(top_eu)
            logger.info(f"🇪🇺 EU: {len(eu_scored)} scored, {len(eu_filtered)} above threshold, selected top {len(top_eu)}")
        
        # Calculate total grants above threshold (for return value)
        total_above_threshold = len(us_filtered) + len(eu_filtered)
        
        if top_grants:
            scores = [float(g.get('profileMatchScore', 0)) for g in top_grants]
            us_count = sum(1 for g in top_grants if g.get('source') == 'US')
            eu_count = sum(1 for g in top_grants if g.get('source') == 'EU')
            logger.info(f"✅ Selected {len(top_grants)} total grants:")
            logger.info(f"   🇺🇸 US: {us_count} grants")
            logger.info(f"   🇪🇺 EU: {eu_count} grants")
            logger.info(f"   📊 Profile match scores: {min(scores):.3f} - {max(scores):.3f}")
        else:
            logger.warning(f"⚠️ No grants met the minimum profile match threshold of {MIN_PROFILE_MATCH_SCORE*100}%")
        
        # Generate primary session ID for S3 key
        primary_session_id = f"agent_discovery_consolidated_{timestamp}"
        
        # Store results in S3
        s3_key = store_consolidated_results(
            primary_session_id, config_id, user_id,
            top_grants, all_grants,
            us_grants, eu_grants,
            us_session_ids, eu_session_ids
        )
        
        logger.info(f"✅ Consolidation complete: {len(top_grants)} grants written to S3")
        
        return {
            'statusCode': 200,
            'configId': config_id,
            'userId': user_id,
            'timestamp': timestamp,
            'totalGrantsFound': len(all_grants),
            'usGrantsFound': len(us_grants),
            'euGrantsFound': len(eu_grants),
            'grantsAboveThreshold': total_above_threshold,
            'topGrantsSelected': len(top_grants),
            's3Key': s3_key,
            'message': f'Consolidated {len(top_grants)} grants from {len(all_grants)} total'
        }
        
    except Exception as e:
        logger.error(f"Error consolidating results: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'error': str(e),
            'errorType': type(e).__name__
        }


def execute_discovery(config_id, user_id=None):
    """
    Execute grant discovery for US and/or EU based on profile agencies.
    
    MULTI-REGION LOGIC:
    - Detects "European Commission" in profile agencies
    - If present: Invokes BOTH US and EU searches sequentially
    - If not present: Invokes only US search (current behavior)
    - Returns session IDs for both searches (or just US)
    - Stores session metadata in DynamoDB for event trigger coordination
    """
    try:
        # Fetch AgentConfig to get settings
        agent_config = fetch_agent_config(config_id)
        if not agent_config:
            raise ValueError(f"AgentConfig not found: {config_id}")
        
        # Use userId from input if provided, otherwise fall back to config
        if not user_id:
            user_id = agent_config.get('userId')
        if not user_id:
            raise ValueError(f"No userId provided and AgentConfig {config_id} missing userId field")
        
        logger.info(f"🌍 Processing agent discovery for user: {user_id}")
        
        # Fetch the user's profile dynamically using their userId
        user_profile = fetch_user_profile(user_id)
        if not user_profile:
            raise ValueError(f"No profile found for user: {user_id}")
        
        # Use config values
        grants_surfaced = agent_config.get('grantsSurfaced', 2)  # Respect config!
        
        # Get agencies from profile
        profile_agencies = user_profile.get('agencies', [])
        
        # 🌍 MULTI-REGION DETECTION: Check if EU agency is in profile
        # EU programmes: Horizon Europe, Digital Europe, Connecting Europe, LIFE, EUAF, etc.
        EU_PROGRAMMES = ['European Commission', 'Horizon Europe', 'Digital Europe', 'Connecting Europe', 'LIFE', 'EUAF']
        has_eu_agency = any(agency in profile_agencies for agency in EU_PROGRAMMES)
        us_agencies = [a for a in profile_agencies if a not in EU_PROGRAMMES]
        
        logger.info(f"🌍 Agency Detection:")
        logger.info(f"   Profile agencies: {profile_agencies}")
        logger.info(f"   Has EU agency: {has_eu_agency}")
        logger.info(f"   US agencies: {us_agencies}")
        
        # Generate base timestamp for session IDs
        timestamp = int(datetime.now().timestamp())
        
        # Prepare search queries from profile keywords
        profile_keywords = user_profile.get('keywords', [])
        optimized_keywords = user_profile.get('optimized_keywords', [])
        all_keywords = profile_keywords + optimized_keywords
        
        # Extract 2-3 broad keywords for multiple searches
        # This maximizes candidate pool, then Bayesian scoring filters to best matches
        broad_keywords = extract_broad_keywords(all_keywords, max_queries=3)
        
        if not broad_keywords:
            broad_keywords = ['research']  # Fallback
        
        logger.info(f"🔍 Multi-query strategy: {len(broad_keywords)} searches with keywords: {broad_keywords}")
        
        # Initialize result structure
        result = {
            'statusCode': 202,
            'configId': config_id,
            'userId': user_id,
            'message': '',
            'searchMetadata': {
                'profileId': user_id,
                'searchQueries': broad_keywords,  # Multiple queries instead of single query
                'grantsSurfaced': grants_surfaced,
                'initiatedAt': datetime.now().isoformat()
            }
        }
        
        # 🇺🇸 INVOKE US SEARCHES (multiple queries for broader coverage)
        us_session_ids = []
        if us_agencies or not has_eu_agency:  # Search US if has US agencies OR no EU agency
            logger.info(f"🇺🇸 Initiating {len(broad_keywords)} US searches")
            
            for idx, keyword in enumerate(broad_keywords):
                us_session_id = f"agent_discovery_us_{timestamp}_{idx}_{uuid.uuid4().hex[:6]}"
                logger.info(f"🇺🇸 US Search {idx+1}/{len(broad_keywords)}: query='{keyword}' session={us_session_id}")
                
                invoke_us_search(us_session_id, user_id, keyword, us_agencies if us_agencies else profile_agencies)
                us_session_ids.append(us_session_id)
            
            result['usSessionIds'] = us_session_ids
            result['usSessionId'] = us_session_ids[0]  # Primary for backwards compatibility
            result['message'] = f'US searches initiated ({len(us_session_ids)} queries)'
        
        # 🇪🇺 INVOKE EU SEARCHES (multiple single-keyword queries)
        eu_session_ids = []
        if has_eu_agency:
            logger.info(f"🇪🇺 Initiating {len(broad_keywords)} EU searches (single keywords)")
            
            for idx, keyword in enumerate(broad_keywords):
                eu_session_id = f"agent_discovery_eu_{timestamp}_{idx}_{uuid.uuid4().hex[:6]}"
                logger.info(f"🇪🇺 EU Search {idx+1}/{len(broad_keywords)}: query='{keyword}' session={eu_session_id}")
                
                invoke_eu_search(eu_session_id, user_id, keyword)
                eu_session_ids.append(eu_session_id)
            
            result['euSessionIds'] = eu_session_ids
            result['euSessionId'] = eu_session_ids[0]  # Primary for backwards compatibility
            
            if us_session_ids:
                result['message'] = f'US and EU searches initiated (multi-region, {len(us_session_ids) + len(eu_session_ids)} total queries)'
            else:
                result['message'] = f'EU searches initiated ({len(eu_session_ids)} queries)'
        
        # Set primary session ID for backwards compatibility
        result['sessionId'] = us_session_ids[0] if us_session_ids else (eu_session_ids[0] if eu_session_ids else None)
        
        # 🌍 MULTI-REGION: Store session metadata for event trigger coordination
        # This allows the event trigger to find all session IDs when any completes
        if us_session_ids and eu_session_ids:
            store_session_metadata(us_session_ids, eu_session_ids, config_id, user_id, grants_surfaced)
        
        logger.info(f"✅ Agent discovery initiated:")
        logger.info(f"   US Sessions: {us_session_ids if us_session_ids else 'None'}")
        logger.info(f"   EU Sessions: {eu_session_ids if eu_session_ids else 'None'}")
        logger.info(f"   Total Queries: {len(us_session_ids) + len(eu_session_ids)}")
        logger.info(f"   Mode: {'MULTI-REGION' if (us_session_ids and eu_session_ids) else ('EU-ONLY' if eu_session_ids else 'US-ONLY')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing discovery: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'errorType': type(e).__name__
        }


def invoke_us_search(session_id: str, user_id: str, query: str, agencies: list):
    """Invoke US grants search Lambda with agency filtering"""
    try:
        grants_search_function = os.environ.get('GRANTS_SEARCH_FUNCTION')
        if not grants_search_function:
            raise ValueError('GRANTS_SEARCH_FUNCTION environment variable not set')
        
        # 🎯 AGENCY FILTERING: Include agencies in the query text
        # The Bedrock agent parses natural language, so we need to include agencies in the query
        if agencies:
            # Format agencies for natural language: "NIH or NSF grants about cancer"
            agency_text = " or ".join(agencies)
            enhanced_query = f"{agency_text} grants about {query}"
            logger.info(f"🎯 Enhanced query with agencies: '{enhanced_query}'")
        else:
            enhanced_query = query
        
        search_input = {
            'sessionId': session_id,
            'query': enhanced_query,  # Use enhanced query with agencies
            'profileId': user_id,
            'filters': {
                'agencies': agencies,  # Keep for backwards compatibility
                'fundingInstruments': [],
                'eligibilityTypes': [],
                'categories': []
            }
        }
        
        lambda_payload = {
            'info': {'fieldName': 'startGrantSearch'},
            'arguments': {'input': search_input},
            'identity': {'sub': user_id, 'username': user_id}
        }
        
        lambda_client = boto3.client('lambda')
        
        logger.info(f"🇺🇸 Invoking US Lambda: {grants_search_function}")
        
        invoke_response = lambda_client.invoke(
            FunctionName=grants_search_function,
            InvocationType='RequestResponse',
            Payload=json.dumps(lambda_payload)
        )
        
        response_payload = json.loads(invoke_response['Payload'].read())
        
        if invoke_response['StatusCode'] != 200:
            raise Exception(f"US Lambda invocation failed: {invoke_response['StatusCode']}")
        
        if 'errorMessage' in response_payload:
            raise Exception(f"US Lambda execution error: {response_payload['errorMessage']}")
        
        logger.info(f"✅ US search Lambda invoked successfully")
        
    except Exception as e:
        logger.error(f"❌ Error invoking US search: {str(e)}")
        raise


def invoke_eu_search(session_id: str, user_id: str, query: str):
    """Invoke EU grants search Lambda"""
    try:
        logger.info(f"🇪🇺 [DEBUG] Starting EU search invocation for session: {session_id}")
        logger.info(f"🇪🇺 [DEBUG] Query: {query}, User: {user_id}")
        
        eu_search_function = os.environ.get('EU_GRANTS_SEARCH_FUNCTION')
        logger.info(f"🇪🇺 [DEBUG] EU_GRANTS_SEARCH_FUNCTION env var: {eu_search_function}")
        
        if not eu_search_function:
            error_msg = 'EU_GRANTS_SEARCH_FUNCTION environment variable not set'
            logger.error(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        search_input = {
            'sessionId': session_id,
            'query': query,
            'filters': {},
            'sources': ['EU_FUNDING']
        }
        
        lambda_payload = {
            'info': {'fieldName': 'startEuGrantSearch'},
            'arguments': {'input': search_input},
            'identity': {'sub': user_id, 'username': user_id}
        }
        
        logger.info(f"🇪🇺 [DEBUG] Lambda payload prepared: {json.dumps(lambda_payload)[:200]}...")
        
        lambda_client = boto3.client('lambda')
        logger.info(f"🇪🇺 [DEBUG] Lambda client created")
        
        logger.info(f"🇪🇺 Invoking EU Lambda: {eu_search_function}")
        logger.info(f"🇪🇺 [DEBUG] About to call lambda_client.invoke()...")
        
        invoke_response = lambda_client.invoke(
            FunctionName=eu_search_function,
            InvocationType='RequestResponse',
            Payload=json.dumps(lambda_payload)
        )
        
        logger.info(f"🇪🇺 [DEBUG] Lambda invoke() returned, StatusCode: {invoke_response['StatusCode']}")
        
        response_payload = json.loads(invoke_response['Payload'].read())
        logger.info(f"🇪🇺 [DEBUG] Response payload: {json.dumps(response_payload)[:500]}...")
        
        if invoke_response['StatusCode'] != 200:
            error_msg = f"EU Lambda invocation failed: {invoke_response['StatusCode']}"
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
        
        if 'errorMessage' in response_payload:
            error_msg = f"EU Lambda execution error: {response_payload['errorMessage']}"
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
        
        logger.info(f"✅ EU search Lambda invoked successfully for session {session_id}")
        
    except Exception as e:
        logger.error(f"❌ Error invoking EU search for session {session_id}: {str(e)}")
        logger.error(f"❌ Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        raise


def store_session_metadata(us_session_ids: List[str], eu_session_ids: List[str], config_id: str, user_id: str, grants_surfaced: int):
    """
    Store session metadata in DynamoDB for multi-region coordination.
    
    This allows the event trigger to find all session IDs when any completes,
    enabling proper multi-region result retrieval.
    """
    try:
        # Store metadata as a custom mutation (we'll need to add this to schema)
        # For now, just log it - the event trigger will handle single-region correctly
        # and we can enhance this in Phase 2
        logger.info(f"📝 Multi-region session metadata:")
        logger.info(f"   US Sessions: {us_session_ids}")
        logger.info(f"   EU Sessions: {eu_session_ids}")
        logger.info(f"   Config: {config_id}")
        logger.info(f"   User: {user_id}")
        logger.info(f"   Grants to surface: {grants_surfaced}")
        
        # TODO Phase 2: Store in dedicated SessionMetadata table for proper coordination
        
    except Exception as e:
        logger.error(f"Error storing session metadata: {str(e)}")
        # Don't fail the main operation if metadata storage fails
        pass

def deduplicate_grants(grants: List[dict]) -> List[dict]:
    """
    Deduplicate grants by grantId, keeping the one with highest profileMatchScore.
    
    This is important when multiple searches return the same grant.
    We keep the version with the best score.
    """
    seen = {}
    for grant in grants:
        grant_id = grant.get('grantId') or grant.get('id')
        if not grant_id:
            continue
            
        if grant_id not in seen:
            seen[grant_id] = grant
        else:
            # Keep grant with higher profileMatchScore
            existing_score = float(seen[grant_id].get('profileMatchScore', 0))
            new_score = float(grant.get('profileMatchScore', 0))
            if new_score > existing_score:
                seen[grant_id] = grant
    
    result = list(seen.values())
    logger.info(f"🔄 Deduplication: {len(grants)} grants → {len(result)} unique grants")
    return result

def retrieve_and_store_results(session_id, config_id, user_id, grants_surfaced, us_session_id=None, eu_session_id=None):
    """
    Retrieve completed search results from DynamoDB and store top N in S3.
    
    MULTI-QUERY SUPPORT:
    - Handles multiple session IDs per region (from multi-query searches)
    - Retrieves from all sessions and deduplicates by grantId
    - Merges and sorts by profileMatchScore across all results
    - Filters to top N based on AgentConfig.grantsSurfaced
    
    FILTERING LOGIC:
    - Processor writes ALL grants to DDB (no filtering)
    - This function filters to top N based on AgentConfig.grantsSurfaced
    - Applies minimum profile match threshold (10%)
    - Sorts by profileMatchScore (Bayesian score with profile) descending
    """
    try:
        import boto3
        
        # 🌍 MULTI-QUERY: Handle both single session IDs and lists
        us_sessions = []
        eu_sessions = []
        
        # Convert to lists if needed
        if us_session_id:
            if isinstance(us_session_id, list):
                us_sessions = us_session_id
            else:
                us_sessions = [us_session_id]
        
        if eu_session_id:
            if isinstance(eu_session_id, list):
                eu_sessions = eu_session_id
            else:
                eu_sessions = [eu_session_id]
        
        # Auto-detect from primary session_id if not explicitly provided
        if not us_sessions and not eu_sessions:
            if session_id.startswith('agent_discovery_us_'):
                us_sessions = [session_id]
                logger.info(f"🇺🇸 Detected US-only session: {session_id}")
            elif session_id.startswith('agent_discovery_eu_'):
                eu_sessions = [session_id]
                logger.info(f"🇪🇺 Detected EU-only session: {session_id}")
            else:
                # Legacy session ID format - assume US
                us_sessions = [session_id]
                logger.info(f"📋 Legacy session format, assuming US: {session_id}")
        
        logger.info(f"🌍 Retrieving multi-query results:")
        logger.info(f"   US Sessions ({len(us_sessions)}): {us_sessions}")
        logger.info(f"   EU Sessions ({len(eu_sessions)}): {eu_sessions}")
        logger.info(f"🎯 Will filter to top {grants_surfaced} grants from AgentConfig")
        
        dynamodb = boto3.resource('dynamodb')
        
        # 🇺🇸 Retrieve US grants from all sessions
        us_grants = []
        if us_sessions:
            us_table_name = os.environ.get('GRANT_RECORD_TABLE')
            if not us_table_name:
                raise ValueError('GRANT_RECORD_TABLE environment variable not set')
            
            us_table = dynamodb.Table(us_table_name)
            
            for session in us_sessions:
                # Paginate through all results using Query (efficient with GSI)
                session_grants = []
                us_response = us_table.query(
                    IndexName='grantRecordsBySessionId',
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session)
                )
                session_grants.extend(us_response.get('Items', []))
                
                # Handle pagination
                while 'LastEvaluatedKey' in us_response:
                    us_response = us_table.query(
                        IndexName='grantRecordsBySessionId',
                        KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session),
                        ExclusiveStartKey=us_response['LastEvaluatedKey']
                    )
                    session_grants.extend(us_response.get('Items', []))
                
                us_grants.extend(session_grants)
                logger.info(f"🇺🇸 Session {session}: {len(session_grants)} grants (after pagination)")
            
            logger.info(f"🇺🇸 Total US grants (before dedup): {len(us_grants)}")
        
        # 🇪🇺 Retrieve EU grants from all sessions
        eu_grants = []
        if eu_sessions:
            eu_table_name = os.environ.get('EU_GRANT_RECORDS_TABLE')
            if not eu_table_name:
                logger.warning("EU_GRANT_RECORDS_TABLE not set, skipping EU grants")
            else:
                eu_table = dynamodb.Table(eu_table_name)
                
            for session in eu_sessions:
                # Paginate through all results using Query (efficient with GSI)
                session_grants = []
                eu_response = eu_table.query(
                    IndexName='euGrantRecordsBySessionId',
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session)
                )
                session_grants.extend(eu_response.get('Items', []))
                
                # Handle pagination
                while 'LastEvaluatedKey' in eu_response:
                    eu_response = eu_table.query(
                        IndexName='euGrantRecordsBySessionId',
                        KeyConditionExpression=boto3.dynamodb.conditions.Key('sessionId').eq(session),
                        ExclusiveStartKey=eu_response['LastEvaluatedKey']
                    )
                    session_grants.extend(eu_response.get('Items', []))
                
                eu_grants.extend(session_grants)
                logger.info(f"🇪🇺 Session {session}: {len(session_grants)} grants (after pagination)")
                
                logger.info(f"🇪🇺 Total EU grants (before dedup): {len(eu_grants)}")
        
        # 🌍 Normalize grants from both regions
        all_grants_raw = normalize_grants(us_grants, eu_grants)
        logger.info(f"🌍 Total grants after normalization (before dedup): {len(all_grants_raw)}")
        
        # 🔄 Deduplicate by grantId (important for multi-query)
        all_grants = deduplicate_grants(all_grants_raw)
        logger.info(f"🌍 Total unique grants after deduplication: {len(all_grants)}")
        
        # Filter for grants with profileMatchScore (Bayesian score with profile)
        scored_grants = [g for g in all_grants if g.get('profileMatchScore') is not None]
        logger.info(f"📋 Grants with profile match scores: {len(scored_grants)}")
        
        # Apply minimum profile match threshold (20%)
        MIN_PROFILE_MATCH_SCORE = 0.20
        filtered_grants = [
            g for g in scored_grants 
            if float(g.get('profileMatchScore', 0)) >= MIN_PROFILE_MATCH_SCORE
        ]
        
        logger.info(f"🔍 After applying {MIN_PROFILE_MATCH_SCORE*100}% profile match threshold: {len(filtered_grants)} grants")
        
        # Sort by profileMatchScore (Bayesian score with profile) descending
        # This ensures best grants from BOTH regions rise to the top
        filtered_grants.sort(key=lambda x: float(x.get('profileMatchScore', 0)), reverse=True)
        
        # Take top N grants based on AgentConfig.grantsSurfaced
        top_grants = filtered_grants[:grants_surfaced]
        
        if top_grants:
            scores = [float(g.get('profileMatchScore', 0)) for g in top_grants]
            us_count = sum(1 for g in top_grants if g.get('source') == 'US')
            eu_count = sum(1 for g in top_grants if g.get('source') == 'EU')
            logger.info(f"✅ Selected top {len(top_grants)} grants:")
            logger.info(f"   🇺🇸 US: {us_count} grants")
            logger.info(f"   🇪🇺 EU: {eu_count} grants")
            logger.info(f"   📊 Profile match scores: {min(scores):.3f} - {max(scores):.3f}")
        else:
            logger.warning(f"⚠️ No grants met the minimum profile match threshold of {MIN_PROFILE_MATCH_SCORE*100}%")
        
        # Store results in S3 with userId for segregation
        # Store individual query file (for backwards compatibility)
        s3_key = store_results_in_s3(session_id, config_id, user_id, top_grants, len(all_grants))
        
        # 🌍 MULTI-REGION: Store consolidated file with US/EU breakdown
        # This makes it easier for UI to display both regions
        consolidated_key = store_consolidated_results(
            session_id, config_id, user_id, 
            top_grants, all_grants,
            us_grants, eu_grants,
            us_sessions if us_sessions else [],
            eu_sessions if eu_sessions else []
        )
        
        return {
            'statusCode': 200,
            'sessionId': session_id,
            'usSessionId': us_session_id,
            'euSessionId': eu_session_id,
            'configId': config_id,
            'totalGrantsFound': len(all_grants),
            'usGrantsFound': len(us_grants),
            'euGrantsFound': len(eu_grants),
            'grantsAboveThreshold': len(filtered_grants),
            'topGrantsSelected': len(top_grants),
            'minProfileMatchScore': MIN_PROFILE_MATCH_SCORE,
            's3Key': s3_key,
            'consolidatedKey': consolidated_key
        }
        
    except Exception as e:
        logger.error(f"Error retrieving results: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'error': str(e),
            'errorType': type(e).__name__
        }

def store_results_in_s3(session_id, config_id, user_id, top_grants, total_grants):
    """Store discovery results in S3 with user segregation"""
    try:
        import boto3
        import decimal
        
        s3_client = boto3.client('s3')
        bucket_name = os.environ.get('DISCOVERY_RESULTS_BUCKET')
        
        if not bucket_name:
            raise ValueError('DISCOVERY_RESULTS_BUCKET not configured')
        
        # Prepare results data with userId
        results_data = {
            'timestamp': datetime.now().isoformat(),
            'sessionId': session_id,
            'configId': config_id,
            'userId': user_id,  # Add userId for filtering
            'totalGrantsFound': total_grants,
            'grantsSurfaced': len(top_grants),
            'grants': []
        }
        
        # Convert grants data
        for grant in top_grants:
            grant_data = {
                'id': grant.get('grantId', grant.get('id')),
                'title': grant.get('title'),
                'agency': grant.get('agency'),
                'matchScore': float(grant.get('profileMatchScore', 0)),  # Use profileMatchScore (Bayesian with profile)
                'amount': float(grant.get('amount', 0)) if grant.get('amount') else None,
                'deadline': grant.get('deadline'),
                'description': grant.get('description', ''),  # Full description, no truncation
                'discoveryMetadata': {
                    'sessionId': session_id,
                    'discoveredAt': datetime.now().isoformat(),
                    'userId': user_id,
                    'configId': config_id
                }
            }
            results_data['grants'].append(grant_data)
        
        # Create S3 key with user segregation: results/{userId}/{sessionId}/grants-discovery.json
        now = datetime.now()
        s3_key = f"results/{user_id}/{session_id}/grants-discovery.json"
        logger.info(f"Storing results with user-segregated key: {s3_key}")
        
        # Convert Decimal types for JSON serialization
        def decimal_default(obj):
            if isinstance(obj, decimal.Decimal):
                return float(obj)
            raise TypeError
        
        # Store in S3
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=json.dumps(results_data, default=decimal_default, indent=2),
            ContentType='application/json'
        )
        
        logger.info(f"Stored results in S3: s3://{bucket_name}/{s3_key}")
        
        return s3_key
        
    except Exception as e:
        logger.error(f"Error storing results in S3: {e}")
        raise e


def store_consolidated_results(session_id, config_id, user_id, top_grants, all_grants, us_grants, eu_grants, us_sessions, eu_sessions):
    """
    Store consolidated results with US/EU breakdown for easier UI display.
    
    This creates a single file per discovery run with:
    - Combined top N grants (sorted by score)
    - Separate US and EU grant lists
    - Session metadata for tracking
    """
    try:
        import boto3
        import decimal
        
        s3_client = boto3.client('s3')
        bucket_name = os.environ.get('DISCOVERY_RESULTS_BUCKET')
        
        if not bucket_name:
            raise ValueError('DISCOVERY_RESULTS_BUCKET not configured')
        
        # Separate top grants by region
        us_top_grants = [g for g in top_grants if g.get('source') == 'US']
        eu_top_grants = [g for g in top_grants if g.get('source') == 'EU']
        
        # Convert grant data
        def convert_grant(grant):
            return {
                'id': grant.get('grantId', grant.get('id')),
                'title': grant.get('title'),
                'agency': grant.get('agency'),
                'matchScore': float(grant.get('profileMatchScore', 0)),
                'amount': float(grant.get('amount', 0)) if grant.get('amount') else None,
                'deadline': grant.get('deadline'),
                'description': grant.get('description', ''),
                'source': grant.get('source', 'US'),  # US or EU
                'discoveryMetadata': {
                    'sessionId': session_id,
                    'discoveredAt': datetime.now().isoformat(),
                    'userId': user_id,
                    'configId': config_id
                }
            }
        
        # Prepare consolidated results data
        results_data = {
            'timestamp': datetime.now().isoformat(),
            'sessionId': session_id,  # Primary session ID
            'configId': config_id,
            'userId': user_id,
            'discoveryType': 'multi-region' if (us_grants and eu_grants) else ('us-only' if us_grants else 'eu-only'),
            
            # Overall stats
            'totalGrantsFound': len(all_grants),
            'grantsSurfaced': len(top_grants),
            
            # Regional breakdown
            'usGrantsFound': len(us_grants),
            'euGrantsFound': len(eu_grants),
            'usGrantsSurfaced': len(us_top_grants),
            'euGrantsSurfaced': len(eu_top_grants),
            
            # Session tracking
            'usSessions': us_sessions,
            'euSessions': eu_sessions,
            
            # Combined top grants (sorted by score)
            'grants': [convert_grant(g) for g in top_grants],
            
            # Regional grants (for tabs)
            'usGrants': [convert_grant(g) for g in us_top_grants],
            'euGrants': [convert_grant(g) for g in eu_top_grants]
        }
        
        # Extract timestamp from session_id for file naming
        # session_id format: agent_discovery_us_1767449201_0_2b1dd3
        # We want to use the timestamp part (1767449201) for the consolidated file
        parts = session_id.split('_')
        if len(parts) >= 4:
            timestamp_str = parts[3]  # Extract timestamp
        else:
            timestamp_str = str(int(datetime.now().timestamp()))
        
        # Create S3 key: results/{userId}/consolidated/consolidated_{timestamp}.json
        # This ensures one file per discovery run, not per query
        # Using separate /consolidated/ subfolder to avoid mixing with 200+ individual search results
        s3_key = f"results/{user_id}/consolidated/consolidated_{timestamp_str}.json"
        
        logger.info(f"📝 [S3_WRITE] Writing consolidated file for userId: {user_id}")
        logger.info(f"📝 [S3_WRITE] S3 Key: {s3_key}")
        logger.info(f"📝 [S3_WRITE] Bucket: {bucket_name}")
        logger.info(f"📝 [S3_WRITE] Grants: {len(top_grants)} total ({len(us_top_grants)} US + {len(eu_top_grants)} EU)")
        
        # Convert Decimal types for JSON serialization
        def decimal_default(obj):
            if isinstance(obj, decimal.Decimal):
                return float(obj)
            raise TypeError
        
        # Store in S3
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=json.dumps(results_data, default=decimal_default, indent=2),
            ContentType='application/json',
            Metadata={
                'discovery-type': results_data['discoveryType'],
                'user-id': user_id,
                'timestamp': timestamp_str
            }
        )
        
        logger.info(f"✅ [S3_WRITE_SUCCESS] Successfully wrote to S3 for userId: {user_id}")
        logger.info(f"✅ [S3_WRITE_SUCCESS] Full path: s3://{bucket_name}/{s3_key}")
        
        logger.info(f"✅ Stored consolidated results in S3: s3://{bucket_name}/{s3_key}")
        logger.info(f"   Total grants: {len(top_grants)} ({len(us_top_grants)} US + {len(eu_top_grants)} EU)")
        
        return s3_key
        
    except Exception as e:
        logger.error(f"Error storing consolidated results in S3: {e}")
        # Don't fail the main operation if consolidated storage fails
        return None
