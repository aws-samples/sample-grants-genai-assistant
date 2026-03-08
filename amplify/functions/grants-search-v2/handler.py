"""
Grant Search V2 Initiator Lambda - AgentCore Native

This Lambda function initiates async grant search using AgentCore Runtime's
native async task management. Unlike V1, this does NOT use SQS or a processor Lambda.

The agent itself handles:
- Calling grants.gov API
- Applying Bayesian scoring
- Writing to DynamoDB
- Publishing to AppSync

Flow:
1. Receive request from AppSync
2. Call AgentCore Runtime (returns immediately with "STARTED")
3. Agent spawns background thread
4. Agent writes progress to DynamoDB as it works
5. UI subscribes to DynamoDB changes

Key differences from V1:
- No SQS queue
- No processor Lambda
- Agent is self-contained orchestrator
- Supports up to 8-hour execution (vs 15 min Lambda limit)
"""

import json
import os
import uuid
import boto3
from datetime import datetime, timedelta
from typing import Dict, Any
from decimal import Decimal
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Custom JSON encoder for Decimal objects
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
appsync_client = boto3.client('appsync')
cfn_client = boto3.client('cloudformation')

# Environment variables - All required, no fallbacks
SEARCH_STATUS_TABLE = os.environ['SEARCH_STATUS_TABLE']
BEDROCK_AGENTCORE_REGION = os.environ['BEDROCK_AGENTCORE_REGION']
GRAPHQL_API_ID = os.environ['GRAPHQL_API_ID']
AGENT_ARN_EXPORT_NAME = os.environ.get('AGENT_ARN_EXPORT_NAME')

# Guardrail configuration (optional - gracefully disabled if not set)
GUARDRAIL_ID = os.environ.get('GUARDRAIL_ID', '')
GUARDRAIL_VERSION = os.environ.get('GUARDRAIL_VERSION', '')

# Initialize DynamoDB table
table = dynamodb.Table(SEARCH_STATUS_TABLE)

# Cache for AppSync endpoint and Agent ARN (persists across Lambda invocations)
_cached_appsync_endpoint = None
_cached_agent_arn = None

def get_agent_arn_from_export():
    """Get agent ARN from CloudFormation export"""
    global _cached_agent_arn
    
    if _cached_agent_arn:
        return _cached_agent_arn
    
    if not AGENT_ARN_EXPORT_NAME:
        logger.error("AGENT_ARN_EXPORT_NAME environment variable not set")
        raise ValueError("AGENT_ARN_EXPORT_NAME environment variable is required")
    
    try:
        logger.info(f"[V2] Getting agent ARN from CloudFormation export: {AGENT_ARN_EXPORT_NAME}")
        response = cfn_client.list_exports()
        
        for export in response.get('Exports', []):
            if export['Name'] == AGENT_ARN_EXPORT_NAME:
                _cached_agent_arn = export['Value']
                logger.info(f"[V2] Found agent ARN: {_cached_agent_arn}")
                return _cached_agent_arn
        
        logger.error(f"[V2] CloudFormation export not found: {AGENT_ARN_EXPORT_NAME}")
        raise ValueError(f"CloudFormation export not found: {AGENT_ARN_EXPORT_NAME}")
        
    except Exception as e:
        logger.error(f"[V2] Failed to get agent ARN from CloudFormation export: {e}")
        raise

def discover_appsync_endpoint():
    """Discover AppSync GraphQL endpoint at runtime"""
    global _cached_appsync_endpoint
    
    if _cached_appsync_endpoint:
        return _cached_appsync_endpoint
    
    try:
        logger.info(f"[V2] Discovering AppSync endpoint for API ID: {GRAPHQL_API_ID}")
        response = appsync_client.get_graphql_api(apiId=GRAPHQL_API_ID)
        endpoint = response['graphqlApi']['uris']['GRAPHQL']
        _cached_appsync_endpoint = endpoint
        logger.info(f"[V2] Discovered AppSync endpoint: {endpoint}")
        return endpoint
    except Exception as e:
        logger.error(f"[V2] Failed to discover AppSync endpoint: {e}")
        raise

# Agent configuration - read from CloudFormation export (set by CDK)
US_GRANTS_V2_AGENT_ARN = None  # Will be loaded on first invocation

def get_us_grants_v2_agent_arn():
    """Get agent ARN (cached after first call)"""
    global US_GRANTS_V2_AGENT_ARN
    if not US_GRANTS_V2_AGENT_ARN:
        US_GRANTS_V2_AGENT_ARN = get_agent_arn_from_export()
    return US_GRANTS_V2_AGENT_ARN

def lambda_handler(event, context):
    """
    Main Lambda handler for initiating async grant search (V2)
    
    Expected event structure from GraphQL:
    {
        "info": {"fieldName": "startGrantSearchV2"},
        "arguments": {
            "input": {
                "sessionId": "search_12345",
                "query": "artificial intelligence",
                "filters": {"minAmount": 100000},
                "sources": ["GRANTS_GOV"]
            }
        },
        "identity": {
            "sub": "cognito-user-id",
            "username": "user@example.com"
        }
    }
    """
    try:
        logger.info(f"[V2] Grant search initiator invoked with event: {json.dumps(event)}")
        
        # Extract user identity from Amplify GraphQL context
        user_identity = event.get('identity') or {}
        cognito_user_id = user_identity.get('sub') or user_identity.get('username') if user_identity else None
        
        if cognito_user_id:
            logger.info(f"[V2] Request from Cognito user: {cognito_user_id}")
        else:
            logger.warning("[V2] Request without user authentication")
            cognito_user_id = None
        
        # Extract GraphQL arguments
        arguments = event.get('arguments', {})
        
        # Amplify Gen 2 doesn't always provide fieldName in info
        # Just process the request directly since this Lambda only handles one mutation
        logger.info(f"[V2] Processing startGrantSearchV2 mutation")
        
        return handle_start_grant_search_v2(arguments, cognito_user_id)
            
    except Exception as e:
        logger.error(f"[V2] Error in grant search initiator: {str(e)}")
        
        session_id = event.get('arguments', {}).get('input', {}).get('sessionId', 'unknown')
        
        error_result = {
            'eventType': 'SEARCH_ERROR',
            'sessionId': session_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'error': str(e),
            'message': f'Search failed: {str(e)}',
            'version': 'V2'
        }
        
        # Write error to DynamoDB
        try:
            write_search_event(session_id, error_result)
        except:
            logger.error("[V2] Failed to write error event to DynamoDB")
        
        return error_result

def handle_start_grant_search_v2(arguments: Dict[str, Any], cognito_user_id: str = None) -> Dict[str, Any]:
    """
    Start a grant search using AgentCore Runtime native async pattern
    
    Unlike V1, this does NOT use SQS. The agent handles everything.
    """
    try:
        # Parse input from GraphQL
        input_data = arguments.get('input')
        if isinstance(input_data, str):
            search_input = json.loads(input_data)
        else:
            search_input = input_data
        
        session_id = search_input.get('sessionId')
        query = search_input.get('query')
        filters = search_input.get('filters', {})
        sources = search_input.get('sources', ['GRANTS_GOV'])
        
        logger.info(f"[V2] Starting grant search for session {session_id} with query: {query}")
        
        # Validate required parameters
        if not session_id or not query:
            raise ValueError("Missing required parameters: sessionId, query")
        
        # Pre-screen user query with guardrail before sending to AgentCore
        if GUARDRAIL_ID and GUARDRAIL_VERSION:
            bedrock_runtime = boto3.client('bedrock-runtime', region_name=BEDROCK_AGENTCORE_REGION)
            guardrail_response = bedrock_runtime.apply_guardrail(
                guardrailIdentifier=GUARDRAIL_ID,
                guardrailVersion=GUARDRAIL_VERSION,
                source='INPUT',
                content=[{'text': {'text': query}}]
            )
            if guardrail_response.get('action') == 'GUARDRAIL_INTERVENED':
                logger.warning(f"[V2] Guardrail BLOCKED search query: {query[:100]}")
                return {
                    "eventType": "SEARCH_ERROR",
                    "sessionId": session_id,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "message": "Your search query was blocked for security reasons. Please rephrase your query.",
                    "status": "BLOCKED",
                    "version": "V2"
                }
        
        # Set default filters
        filters = set_default_filters(filters)
        
        # Create initial search status record
        status_record = create_search_status_record(
            session_id=session_id,
            query=query,
            filters=filters,
            sources=sources
        )
        
        # Add required id field for DynamoDB
        status_record["id"] = str(uuid.uuid4())
        
        # Save to DynamoDB
        table.put_item(Item=status_record)
        logger.info(f"[V2] Created search status record for session {session_id}")
        
        # Call AgentCore Runtime directly (no SQS)
        # Agent will handle async processing internally
        
        # Discover AppSync endpoint at runtime
        appsync_endpoint = discover_appsync_endpoint()
        
        # Agent uses IAM auth to call AppSync (no API key needed)
        agent_payload = {
            "sessionId": session_id,
            "query": query,
            "filters": filters,
            "sources": sources,
            "cognitoUserId": cognito_user_id,
            "version": "V2",
            "tableNames": {
                "grantRecords": os.environ.get('GRANT_RECORDS_TABLE'),
                "searchEvent": os.environ.get('SEARCH_STATUS_TABLE'),
                "userProfile": os.environ.get('USER_PROFILE_TABLE')
            },
            "appsyncEndpoint": appsync_endpoint,
            "graphqlApiId": GRAPHQL_API_ID,
        }
        
        logger.info(f"[V2] Calling AgentCore Runtime for session {session_id}")
        agent_arn = get_us_grants_v2_agent_arn()
        logger.info(f"[V2] Agent ARN: {agent_arn}")
        logger.info(f"[V2] Payload: {json.dumps(agent_payload, cls=DecimalEncoder)}")
        
        # Create Bedrock AgentCore client
        bedrock_agentcore = boto3.client('bedrock-agentcore', region_name=BEDROCK_AGENTCORE_REGION)
        
        # Ensure session ID meets AgentCore minimum length requirement (33 chars)
        agentcore_session_id = session_id
        if len(session_id) < 33:
            import time
            import random
            timestamp = str(int(time.time() * 1000))
            random_suffix = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=10))
            agentcore_session_id = f"{session_id}_{timestamp}_{random_suffix}"
            logger.info(f"[V2] Padded session ID: {session_id} -> {agentcore_session_id}")
        
        # Call AgentCore Runtime
        # Agent will return immediately with "STARTED" status
        # Background work continues in agent's async task
        response = bedrock_agentcore.invoke_agent_runtime(
            agentRuntimeArn=agent_arn,
            runtimeSessionId=agentcore_session_id,
            payload=json.dumps(agent_payload, cls=DecimalEncoder),
            qualifier="DEFAULT"
        )
        
        logger.info("[V2] AgentCore invocation successful")
        
        # Process AgentCore response
        response_body = response['response'].read()
        agent_response = json.loads(response_body)
        
        logger.info(f"[V2] Agent response: {agent_response}")
        
        # Agent should return immediately with "STARTED" status
        # The actual work happens in background thread
        
        # Return success response
        return {
            "eventType": "SEARCH_STARTED",
            "sessionId": session_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": f"Search started for: {query}",
            "query": query,
            "status": "STARTED",
            "version": "V2",
            "agentResponse": agent_response
        }
        
    except Exception as e:
        logger.error(f"[V2] Error starting grant search: {str(e)}")
        
        session_id = arguments.get('input', {}).get('sessionId', 'unknown')
        error_result = {
            'eventType': 'SEARCH_ERROR',
            'sessionId': session_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'error': str(e),
            'message': f'Search failed: {str(e)}',
            'version': 'V2'
        }
        
        # Write error to DynamoDB
        try:
            write_search_event(session_id, error_result)
        except:
            logger.error("[V2] Failed to write error event to DynamoDB")
        
        return error_result

def set_default_filters(filters: Dict[str, Any]) -> Dict[str, Any]:
    """Set default values for search filters"""
    defaults = {
        "minAmount": 0,
        "maxAmount": None,
        "agencies": [],
        "categories": [],
        "deadlineAfter": None,
        "deadlineBefore": None
    }
    
    # Merge with provided filters
    for key, default_value in defaults.items():
        if key not in filters:
            filters[key] = default_value
    
    # Convert amounts to Decimal for DynamoDB
    if filters.get("minAmount") is not None:
        filters["minAmount"] = Decimal(str(filters["minAmount"]))
    if filters.get("maxAmount") is not None:
        filters["maxAmount"] = Decimal(str(filters["maxAmount"]))
    
    return filters

def create_search_status_record(
    session_id: str,
    query: str,
    filters: Dict[str, Any],
    sources: list
) -> Dict[str, Any]:
    """Create initial search status record"""
    now = datetime.utcnow()
    ttl_timestamp = int((now + timedelta(hours=24)).timestamp())  # 24 hour TTL
    
    return {
        "sessionId": session_id,
        "eventType": "SEARCH_STARTED",
        "data": {
            "query": query,
            "filters": filters,
            "sources": sources,
            "status": "STARTED",
            "progress": {
                "currentStep": "started",
                "stepsCompleted": 0,
                "totalSteps": 5,
                "percentage": Decimal('0.0'),
                "message": "Search started - agent processing"
            },
            "grantsFound": 0,
            "version": "V2",
            "agentArn": get_us_grants_v2_agent_arn()
        },
        "timestamp": now.isoformat() + "Z",
        "ttl": ttl_timestamp,
        "createdAt": now.isoformat() + "Z",
        "updatedAt": now.isoformat() + "Z"
    }

def write_search_event(session_id: str, event_data: Dict[str, Any]):
    """Write search event to DynamoDB (same table as V1)"""
    try:
        search_event = {
            "id": str(uuid.uuid4()),
            "sessionId": session_id,
            "eventType": event_data.get('eventType', 'UPDATE'),
            "data": event_data,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        table.put_item(Item=search_event)
        logger.info(f"[V2] Published search event for session {session_id}: {event_data.get('eventType')}")
        
    except Exception as e:
        logger.error(f"[V2] Error publishing search event: {str(e)}")
