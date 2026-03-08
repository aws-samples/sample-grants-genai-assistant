"""
Shared AppSync configuration utility for Lambda functions.
Provides runtime resolution of AppSync endpoint.

NOTE: This module now only returns the endpoint. All authentication uses IAM (SigV4).
API key authentication has been removed for security compliance.
"""
import os
import boto3
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Module-level cache (persists across Lambda invocations in same container)
_cached_appsync_config: Optional[Dict[str, str]] = None

def get_appsync_config() -> Dict[str, str]:
    """
    Get AppSync endpoint by querying AWS AppSync API.
    Uses the Management API ID to discover the actual GraphQL endpoint URL.
    Results are cached at module level for performance.
    
    Returns:
        Dict with 'endpoint' key (api_key removed - use IAM auth)
    
    Raises:
        Exception: If GRAPHQL_API_ID env var is missing or AWS API calls fail
    """
    global _cached_appsync_config
    
    # Return cached config if available
    if _cached_appsync_config:
        logger.debug("🔄 Using cached AppSync config")
        return _cached_appsync_config
    
    # Get Management API ID from environment
    api_id = os.environ.get('GRAPHQL_API_ID')
    if not api_id:
        raise Exception("GRAPHQL_API_ID environment variable is required")
    
    logger.info(f"🔍 Discovering AppSync config for API ID: {api_id}")
    
    try:
        # Initialize AppSync client
        appsync_client = boto3.client('appsync')
        
        # Get GraphQL API details using Management API ID
        logger.debug(f"📡 Calling get_graphql_api for {api_id}")
        api_response = appsync_client.get_graphql_api(apiId=api_id)
        
        # Extract the actual GraphQL endpoint URL
        graphql_api = api_response['graphqlApi']
        endpoint = graphql_api['uris']['GRAPHQL']
        logger.info(f"✅ Discovered GraphQL endpoint: {endpoint}")
        
        # Cache the configuration (endpoint only - IAM auth used for all requests)
        _cached_appsync_config = {
            'endpoint': endpoint
        }
        
        logger.info("🎯 AppSync configuration cached successfully (IAM auth)")
        return _cached_appsync_config
        
    except Exception as e:
        logger.error(f"❌ Failed to get AppSync configuration: {str(e)}")
        raise Exception(f"Failed to discover AppSync configuration: {str(e)}")

def clear_cache():
    """Clear the cached AppSync configuration (useful for testing)."""
    global _cached_appsync_config
    _cached_appsync_config = None
    logger.debug("🧹 AppSync config cache cleared")
