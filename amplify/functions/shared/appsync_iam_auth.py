"""
AppSync IAM authentication utility using AWS Signature Version 4.
Replaces API key authentication with IAM role-based auth.
"""
import os
import json
import boto3
from urllib.parse import urlparse
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import requests
import logging

logger = logging.getLogger(__name__)

def sign_appsync_request(endpoint: str, query: str, variables: dict = None) -> dict:
    """
    Sign an AppSync GraphQL request using IAM credentials (SigV4).
    
    Args:
        endpoint: AppSync GraphQL endpoint URL
        query: GraphQL query or mutation string
        variables: GraphQL variables dict (optional)
    
    Returns:
        Dict with signed headers ready for requests.post()
    """
    # Get AWS credentials from Lambda execution environment
    session = boto3.Session()
    credentials = session.get_credentials()
    
    # Parse endpoint
    parsed_url = urlparse(endpoint)
    region = os.environ.get('AWS_REGION', 'us-east-2')
    
    # Prepare request body
    body = {'query': query}
    if variables:
        body['variables'] = variables
    body_json = json.dumps(body)
    
    # Create AWS request
    request = AWSRequest(
        method='POST',
        url=endpoint,
        data=body_json,
        headers={
            'Content-Type': 'application/json',
            'host': parsed_url.netloc,
        }
    )
    
    # Sign request with SigV4
    SigV4Auth(credentials, 'appsync', region).add_auth(request)
    
    # Return signed headers
    return dict(request.headers)

def call_appsync_iam(endpoint: str, query: str, variables: dict = None) -> dict:
    """
    Call AppSync GraphQL API using IAM authentication.
    
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
    
    # Sign request
    headers = sign_appsync_request(endpoint, query, variables)
    
    # Prepare body
    body = {'query': query}
    if variables:
        body['variables'] = variables
    
    # Make request
    response = requests.post(
        endpoint,
        json=body,
        headers=headers,
        timeout=30
    )
    
    # Check HTTP status
    if response.status_code != 200:
        raise Exception(f"AppSync request failed: {response.status_code} - {response.text}")
    
    # Parse response
    result = response.json()
    
    # Check for GraphQL errors
    if 'errors' in result:
        raise Exception(f"GraphQL errors: {result['errors']}")
    
    logger.info("✅ AppSync call successful")
    return result.get('data', {})
