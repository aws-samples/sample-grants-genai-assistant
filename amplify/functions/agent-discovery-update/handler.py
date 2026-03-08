import json
import boto3
import os
import sys
import logging
from datetime import datetime
from urllib.parse import urlparse
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Add Lambda layer to path for shared utilities
sys.path.append('/opt/python')
from appsync_config import get_appsync_config

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

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

def handler(event, context):
    """
    Update AgentConfig with discovery results and execution metadata
    
    This function:
    1. Takes the results from the agent discovery search
    2. Updates the AgentConfig with lastRun timestamp
    3. Creates an AgentDiscoveryResult record
    4. Returns summary information
    """
    
    logger.info(f"Agent Discovery Update started with event: {json.dumps(event, default=str)}")
    
    try:
        # Extract data from the previous step
        search_results = event.get('searchResults', [])
        session_id = event.get('sessionId', '')
        config_id = event.get('configId', '')
        profile_id = event.get('profileId', '')
        grants_surfaced = event.get('grantsSurfaced', 2)
        
        logger.info(f"Processing {len(search_results)} search results for config {config_id}")
        
        # Get AppSync configuration
        appsync_config = get_appsync_config()
        graphql_endpoint = appsync_config['endpoint']
        
        # IAM AUTH MIGRATION: Use IAM auth instead of API key
        # Fetch AgentConfig to get timeInterval
        get_config_query = """
        query GetAgentConfig($id: ID!) {
          getAgentConfig(id: $id) {
            id
            timeInterval
          }
        }
        """
        
        config_data = call_appsync_iam(
            graphql_endpoint,
            get_config_query,
            {'id': config_id}
        )
        
        time_interval = 24  # Default
        if config_data and config_data.get('getAgentConfig'):
            time_interval = int(config_data['getAgentConfig'].get('timeInterval', 24))
        
        # Update AgentConfig with lastRun and nextRun timestamps
        from datetime import timedelta
        current_time_dt = datetime.now()
        current_time = current_time_dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        next_run_dt = current_time_dt + timedelta(hours=time_interval)
        next_run = next_run_dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        
        update_config_mutation = """
        mutation UpdateAgentConfig($input: UpdateAgentConfigInput!, $condition: ModelAgentConfigConditionInput) {
          updateAgentConfig(input: $input, condition: $condition) {
            id
            lastRun
            nextRun
            updatedAt
          }
        }
        """
        
        # Update both lastRun and nextRun
        update_input = {
            'id': config_id,
            'lastRun': current_time,
            'nextRun': next_run
        }
        
        logger.info(f"Setting lastRun={current_time}, nextRun={next_run} (interval: {time_interval}h)")
        
        # Don't use condition - let it update regardless
        condition_input = None
        
        logger.info(f"Updating AgentConfig {config_id} with lastRun: {current_time}")
        
        variables = {'input': update_input}
        if condition_input:
            variables['condition'] = condition_input
        
        # IAM AUTH MIGRATION: Use IAM auth for mutation
        result_data = call_appsync_iam(
            graphql_endpoint,
            update_config_mutation,
            variables
        )
        
        logger.info("AgentConfig updated successfully")
        
        # Create AgentDiscoveryResult record
        discovery_result_mutation = """
        mutation CreateAgentDiscoveryResult($input: CreateAgentDiscoveryResultInput!) {
          createAgentDiscoveryResult(input: $input) {
            id
            configId
            sessionId
            executionTime
            grantsFound
            topGrants
          }
        }
        """
        
        # Prepare top grants data (limit to grants_surfaced)
        top_grants = search_results[:grants_surfaced] if search_results else []
        
        discovery_input = {
            'configId': config_id,
            'sessionId': session_id,
            'profileId': profile_id,
            'executionTime': current_time,
            'grantsFound': len(search_results),
            'grantsSurfaced': len(top_grants),
            'topGrants': json.dumps(top_grants),
            'searchQuery': event.get('searchQuery', ''),
            'status': 'COMPLETED'
        }
        
        logger.info(f"Creating AgentDiscoveryResult record for session {session_id}")
        
        # IAM AUTH MIGRATION: Use IAM auth for mutation
        try:
            result_data = call_appsync_iam(
                graphql_endpoint,
                discovery_result_mutation,
                {'input': discovery_input}
            )
            logger.info("AgentDiscoveryResult created successfully")
        except Exception as e:
            logger.warning(f"Failed to create AgentDiscoveryResult: {str(e)}")
        
        # Return summary
        return {
            'statusCode': 200,
            'configId': config_id,
            'sessionId': session_id,
            'executionTime': current_time,
            'grantsFound': len(search_results),
            'grantsSurfaced': len(top_grants),
            'topGrants': top_grants,
            'message': 'Agent discovery completed successfully'
        }
        
    except Exception as e:
        logger.error(f"Error in agent discovery update: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Agent discovery update failed'
        }