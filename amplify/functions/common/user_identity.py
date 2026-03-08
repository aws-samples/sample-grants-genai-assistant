"""
Common utility for extracting user identity from AppSync/Lambda events
"""

import logging

logger = logging.getLogger()

def extract_user_id(event):
    """
    Extract userId from AppSync/Lambda event with multiple fallback strategies
    
    Args:
        event: Lambda event dict from AppSync
        
    Returns:
        str: User ID (Cognito sub) or None if not found
    """
    user_id = None
    
    # Strategy 1: Try to get from identity (Cognito auth via AppSync)
    identity = event.get('identity') or {}
    if identity:
        user_id = identity.get('sub') or identity.get('username')
    
    # Strategy 2: Try to get from claims (alternative Cognito format)
    if not user_id and identity:
        claims = identity.get('claims', {})
        user_id = claims.get('sub') or claims.get('username') or claims.get('cognito:username')
    
    # Strategy 3: Try to get from arguments (for testing/direct invocation)
    if not user_id:
        arguments = event.get('arguments', {})
        user_id = arguments.get('userId')
    
    # Strategy 4: Try to get from requestContext (API Gateway format)
    if not user_id:
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        if authorizer:
            user_id = authorizer.get('claims', {}).get('sub')
    
    if user_id:
        logger.info(f"✅ Extracted user ID: {user_id}")
    else:
        logger.warning(f"⚠️  No user ID found in event")
        logger.debug(f"Event keys: {list(event.keys())}")
        if 'identity' in event:
            logger.debug(f"Identity keys: {list(event['identity'].keys()) if event['identity'] else 'None'}")
    
    return user_id

def require_user_id(event):
    """
    Extract userId and raise exception if not found
    
    Args:
        event: Lambda event dict
        
    Returns:
        str: User ID
        
    Raises:
        Exception: If no user identity found
    """
    user_id = extract_user_id(event)
    
    if not user_id:
        logger.error("❌ No user identity found in event")
        raise Exception("Unauthorized: User identity not found. Please ensure you are authenticated with Cognito.")
    
    return user_id
