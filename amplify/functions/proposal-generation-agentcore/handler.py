"""
Proposal Generation Initiator Lambda - AgentCore Native

This Lambda function initiates async proposal generation using AgentCore Runtime's
native async task management.

The agent itself handles:
- Retrieving grant requirements from Knowledge Base
- Fetching user profile and documents
- Generating proposal sections using Claude
- Uploading to S3
- Publishing status updates to AppSync

Flow:
1. Receive request from AppSync
2. Call AgentCore Runtime (returns immediately with "STARTED")
3. Agent spawns background thread
4. Agent writes progress to DynamoDB as it works
5. UI subscribes to DynamoDB changes

Key differences from old SQS-based approach:
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
PROPOSALS_TABLE = os.environ['PROPOSALS_TABLE']
BEDROCK_AGENTCORE_REGION = os.environ['BEDROCK_AGENTCORE_REGION']
GRAPHQL_API_ID = os.environ['GRAPHQL_API_ID']
AGENT_ARN_EXPORT_NAME = os.environ.get('AGENT_ARN_EXPORT_NAME')

# Guardrail configuration (optional - gracefully disabled if not set)
GUARDRAIL_ID = os.environ.get('GUARDRAIL_ID', '')
GUARDRAIL_VERSION = os.environ.get('GUARDRAIL_VERSION', '')

# Initialize DynamoDB table
table = dynamodb.Table(PROPOSALS_TABLE)

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
        logger.info(f"[Proposal Agent] Getting agent ARN from CloudFormation export: {AGENT_ARN_EXPORT_NAME}")
        response = cfn_client.list_exports()
        
        for export in response.get('Exports', []):
            if export['Name'] == AGENT_ARN_EXPORT_NAME:
                _cached_agent_arn = export['Value']
                logger.info(f"[Proposal Agent] Found agent ARN: {_cached_agent_arn}")
                return _cached_agent_arn
        
        logger.error(f"[Proposal Agent] CloudFormation export not found: {AGENT_ARN_EXPORT_NAME}")
        raise ValueError(f"CloudFormation export not found: {AGENT_ARN_EXPORT_NAME}")
        
    except Exception as e:
        logger.error(f"[Proposal Agent] Failed to get agent ARN from CloudFormation export: {e}")
        raise

def discover_appsync_endpoint():
    """Discover AppSync GraphQL endpoint at runtime"""
    global _cached_appsync_endpoint
    
    if _cached_appsync_endpoint:
        return _cached_appsync_endpoint
    
    try:
        logger.info(f"[Proposal Agent] Discovering AppSync endpoint for API ID: {GRAPHQL_API_ID}")
        response = appsync_client.get_graphql_api(apiId=GRAPHQL_API_ID)
        endpoint = response['graphqlApi']['uris']['GRAPHQL']
        _cached_appsync_endpoint = endpoint
        logger.info(f"[Proposal Agent] Discovered AppSync endpoint: {endpoint}")
        return endpoint
    except Exception as e:
        logger.error(f"[Proposal Agent] Failed to discover AppSync endpoint: {e}")
        raise


# Agent configuration - read from CloudFormation export (set by CDK)
PROPOSAL_GENERATION_AGENT_ARN = None  # Will be loaded on first invocation

def get_proposal_generation_agent_arn():
    """Get agent ARN (cached after first call)"""
    global PROPOSAL_GENERATION_AGENT_ARN
    if not PROPOSAL_GENERATION_AGENT_ARN:
        PROPOSAL_GENERATION_AGENT_ARN = get_agent_arn_from_export()
    return PROPOSAL_GENERATION_AGENT_ARN


def lambda_handler(event, context):
    """
    Main Lambda handler for initiating async proposal generation
    
    Expected event structure from GraphQL:
    {
        "info": {"fieldName": "generateProposal"},
        "arguments": {
            "input": {
                "proposalId": "uuid",
                "grantId": "grant-123",
                "grantInfo": {...},
                "selectedDocuments": [...]
            }
        },
        "identity": {
            "sub": "cognito-user-id",
            "username": "user@example.com"
        }
    }
    """
    try:
        logger.info(f"[Proposal Agent] Initiator invoked with event: {json.dumps(event)}")
        
        # Extract user identity from Amplify GraphQL context
        user_identity = event.get('identity') or {}
        cognito_user_id = user_identity.get('sub') or user_identity.get('username') if user_identity else None
        
        if cognito_user_id:
            logger.info(f"[Proposal Agent] Request from Cognito user: {cognito_user_id}")
        else:
            logger.warning("[Proposal Agent] Request without user authentication")
            cognito_user_id = None
        
        # Extract GraphQL arguments
        arguments = event.get('arguments', {})
        
        logger.info(f"[Proposal Agent] Processing generateProposal mutation")
        
        return handle_generate_proposal(arguments, cognito_user_id)
            
    except Exception as e:
        logger.error(f"[Proposal Agent] Error in proposal initiator: {str(e)}")
        
        proposal_id = event.get('arguments', {}).get('input', {}).get('proposalId', 'unknown')
        
        error_result = {
            'proposalId': proposal_id,
            'status': 'failed',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'error': str(e),
            'message': f'Proposal generation failed: {str(e)}'
        }
        
        # Write error to DynamoDB
        try:
            write_proposal_status(proposal_id, 'failed', {'error': str(e)})
        except:
            logger.error("[Proposal Agent] Failed to write error status to DynamoDB")
        
        return error_result

def handle_generate_proposal(arguments: Dict[str, Any], cognito_user_id: str = None) -> Dict[str, Any]:
    """
    Start proposal generation using AgentCore Runtime native async pattern
    """
    try:
        # Parse input from GraphQL
        input_data = arguments.get('input')
        if isinstance(input_data, str):
            proposal_input = json.loads(input_data)
        else:
            proposal_input = input_data
        
        proposal_id = proposal_input.get('proposalId')
        grant_id = proposal_input.get('grantId')
        grant_info = proposal_input.get('grantInfo', {})
        selected_documents = proposal_input.get('selectedDocuments', [])
        
        logger.info(f"[Proposal Agent] Starting proposal generation for {proposal_id}")
        logger.info(f"[Proposal Agent] Grant ID: {grant_id}")
        logger.info(f"[Proposal Agent] User ID: {cognito_user_id}")
        logger.info(f"[Proposal Agent] Selected documents: {len(selected_documents)}")
        
        # Validate required parameters
        if not proposal_id or not grant_id:
            raise ValueError("Missing required parameters: proposalId, grantId")
        
        # Pre-screen user-provided grant info with guardrail
        # Only screen the grant info text, not uploaded documents (to avoid false positives)
        if GUARDRAIL_ID and GUARDRAIL_VERSION:
            screen_text = grant_info.get('title', '') + ' ' + grant_info.get('description', '')
            if screen_text.strip():
                bedrock_runtime = boto3.client('bedrock-runtime', region_name=BEDROCK_AGENTCORE_REGION)
                guardrail_response = bedrock_runtime.apply_guardrail(
                    guardrailIdentifier=GUARDRAIL_ID,
                    guardrailVersion=GUARDRAIL_VERSION,
                    source='INPUT',
                    content=[{'text': {'text': screen_text}}]
                )
                if guardrail_response.get('action') == 'GUARDRAIL_INTERVENED':
                    logger.warning(f"[Proposal Agent] Guardrail BLOCKED proposal input for {proposal_id}")
                    return {
                        "eventType": "PROPOSAL_ERROR",
                        "proposalId": proposal_id,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "message": "Your request was blocked for security reasons. Please review your input.",
                        "status": "BLOCKED"
                    }
        
        # Create initial proposal status record
        status_record = create_proposal_status_record(
            proposal_id=proposal_id,
            grant_id=grant_id,
            user_id=cognito_user_id,
            grant_info=grant_info
        )
        
        # Save to DynamoDB
        table.put_item(Item=status_record)
        logger.info(f"[Proposal Agent] Created proposal status record for {proposal_id}")
        
        # Call AgentCore Runtime directly
        # Agent will handle async processing internally
        
        # Discover AppSync endpoint at runtime
        appsync_endpoint = discover_appsync_endpoint()
        
        # Agent uses IAM auth (no API key needed)
        # CRITICAL: Pass environment variables in payload to agent
        # The agent needs these to access AWS resources
        agent_payload = {
            "proposalId": proposal_id,
            "grantId": grant_id,
            "userId": cognito_user_id,
            "grantInfo": grant_info,
            "selectedDocuments": selected_documents,
            "userProfile": {
                "userId": cognito_user_id
            },
            # Environment variables for agent
            "env": {
                "PROPOSALS_TABLE": os.environ.get('PROPOSALS_TABLE'),
                "KNOWLEDGE_BASE_ID": os.environ.get('KNOWLEDGE_BASE_ID'),
                "PROPOSALS_BUCKET": os.environ.get('PROPOSALS_BUCKET'),
                "DOCUMENT_TABLE": os.environ.get('DOCUMENT_TABLE'),
                "DOCUMENT_BUCKET": os.environ.get('DOCUMENT_BUCKET'),
                "USER_PROFILE_TABLE": os.environ.get('USER_PROFILE_TABLE'),
                "APPSYNC_ENDPOINT": appsync_endpoint,
                "GRAPHQL_API_ID": GRAPHQL_API_ID,
                "AWS_REGION": os.environ.get('AWS_REGION', 'us-east-2'),
                "PROPOSAL_MODEL_TIER": os.environ.get('PROPOSAL_MODEL_TIER', 'opus')
            }
        }
        
        logger.info(f"[Proposal Agent] Calling AgentCore Runtime for proposal {proposal_id}")
        agent_arn = get_proposal_generation_agent_arn()
        logger.info(f"[Proposal Agent] Agent ARN: {agent_arn}")
        logger.info(f"[Proposal Agent] Payload: {json.dumps(agent_payload, cls=DecimalEncoder)}")
        
        # Create Bedrock AgentCore client
        bedrock_agentcore = boto3.client('bedrock-agentcore', region_name=BEDROCK_AGENTCORE_REGION)
        
        # Ensure session ID meets AgentCore minimum length requirement (33 chars)
        agentcore_session_id = proposal_id
        if len(proposal_id) < 33:
            import time
            import random
            timestamp = str(int(time.time() * 1000))
            random_suffix = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=10))
            agentcore_session_id = f"{proposal_id}_{timestamp}_{random_suffix}"
            logger.info(f"[Proposal Agent] Padded session ID: {proposal_id} -> {agentcore_session_id}")
        
        # Call AgentCore Runtime
        # Agent will return immediately with "STARTED" status
        # Background work continues in agent's async task
        response = bedrock_agentcore.invoke_agent_runtime(
            agentRuntimeArn=agent_arn,
            runtimeSessionId=agentcore_session_id,
            payload=json.dumps(agent_payload, cls=DecimalEncoder),
            qualifier="DEFAULT"
        )
        
        logger.info("[Proposal Agent] AgentCore invocation successful")
        
        # Process AgentCore response
        response_body = response['response'].read()
        agent_response = json.loads(response_body)
        
        logger.info(f"[Proposal Agent] Agent response: {agent_response}")
        
        # Return success response
        return {
            "proposalId": proposal_id,
            "status": "processing",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": f"Proposal generation started for grant: {grant_id}",
            "grantId": grant_id,
            "agentResponse": agent_response
        }
        
    except Exception as e:
        logger.error(f"[Proposal Agent] Error starting proposal generation: {str(e)}")
        
        proposal_id = arguments.get('input', {}).get('proposalId', 'unknown')
        error_result = {
            'proposalId': proposal_id,
            'status': 'failed',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'error': str(e),
            'message': f'Proposal generation failed: {str(e)}'
        }
        
        # Write error to DynamoDB
        try:
            write_proposal_status(proposal_id, 'failed', {'error': str(e)})
        except:
            logger.error("[Proposal Agent] Failed to write error status to DynamoDB")
        
        return error_result

def create_proposal_status_record(
    proposal_id: str,
    grant_id: str,
    user_id: str,
    grant_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Create initial proposal status record"""
    now = datetime.utcnow()
    ttl_timestamp = int((now + timedelta(days=30)).timestamp())  # 30 day TTL
    
    return {
        "id": proposal_id,
        "userId": user_id,
        "grantId": grant_id,
        "status": "processing",
        "progress": 0,
        "currentStep": "Initializing",
        "metadata": json.dumps({
            "grantInfo": grant_info,
            "agentArn": get_proposal_generation_agent_arn()
        }),
        "createdAt": now.isoformat() + "Z",
        "updatedAt": now.isoformat() + "Z",
        "ttl": ttl_timestamp
    }

def write_proposal_status(proposal_id: str, status: str, progress_data: Dict[str, Any]):
    """Write proposal status to DynamoDB"""
    try:
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        update_expr = 'SET #status = :status, updatedAt = :updated'
        expr_attr_names = {'#status': 'status'}
        expr_attr_values = {
            ':status': status,
            ':updated': timestamp
        }
        
        if 'error' in progress_data:
            update_expr += ', #error = :error'
            expr_attr_names['#error'] = 'error'
            expr_attr_values[':error'] = progress_data['error']
        
        table.update_item(
            Key={'id': proposal_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values
        )
        
        logger.info(f"[Proposal Agent] Updated proposal status for {proposal_id}: {status}")
        
    except Exception as e:
        logger.error(f"[Proposal Agent] Error updating proposal status: {str(e)}")
