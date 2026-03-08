import json
import boto3
import os
from datetime import datetime
import logging
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables - Required, no fallbacks
DISCOVERY_RESULTS_BUCKET = os.environ['DISCOVERY_RESULTS_BUCKET']

def handler(event, context):
    """
    Handle S3 bucket operations for Agent Discovery Results
    
    Supported operations:
    - list: List objects in the bucket
    - download: Get presigned URL for download
    """
    
    try:
        logger.info(f"S3 operations handler invoked with event: {json.dumps(event)}")
        
        # Extract user identity from Cognito - REQUIRED
        identity = event.get('identity')
        if not identity:
            logger.error(f"No identity found in event - Cognito authentication required")
            logger.error(f"Full event: {json.dumps(event)}")
            raise Exception("Cognito authentication required - no identity in request")
        
        # Get user ID from Cognito identity
        user_id = identity.get('sub') or identity.get('username')
        
        # Try claims as fallback
        if not user_id:
            claims = identity.get('claims', {})
            user_id = claims.get('sub') or claims.get('username')
        
        if not user_id:
            logger.error(f"No user ID found in Cognito identity")
            logger.error(f"Identity: {json.dumps(identity)}")
            raise Exception("Cognito authentication required - no user ID in identity")
        
        logger.info(f"S3 operations for user: {user_id}")
        
        # Determine operation based on GraphQL field name
        # Check multiple possible locations for fieldName
        field_name = event.get('fieldName', '')
        if not field_name:
            info = event.get('info', {})
            field_name = info.get('fieldName', '')
        
        # Debug logging
        logger.info(f"Field name: '{field_name}'")
        
        # Force SigV4 for presigned URLs (required for some S3 buckets)
        from botocore.client import Config
        import os as _os
        s3_client = boto3.client(
            's3',
            region_name=_os.environ.get('AWS_REGION', 'us-east-1'),
            config=Config(signature_version='s3v4')
        )
        
        # Handle both direct calls and GraphQL calls
        if field_name == 'listDiscoveryResults' or field_name == '':
            # Default to list operation if no field name (for direct calls)
            return list_bucket_contents(s3_client, DISCOVERY_RESULTS_BUCKET, user_id)
        elif field_name == 'getDiscoveryResultDownloadUrl':
            arguments = event.get('arguments', {})
            key = arguments.get('key')
            if not key:
                raise ValueError('Key parameter required for download operation')
            return get_download_url(s3_client, DISCOVERY_RESULTS_BUCKET, key, user_id)
        elif field_name == 'getDiscoveryResultContent':
            arguments = event.get('arguments', {})
            key = arguments.get('key')
            if not key:
                raise ValueError('Key parameter required for content operation')
            return get_file_content(s3_client, DISCOVERY_RESULTS_BUCKET, key, user_id)
        else:
            raise ValueError(f'Unsupported GraphQL field: {field_name}')
            
    except Exception as e:
        logger.error(f"Error in S3 operations: {str(e)}")
        raise e  # Let GraphQL handle the error response

def list_bucket_contents(s3_client, bucket_name, user_id):
    """List objects in the bucket filtered by userId - only consolidated files"""
    try:
        # Only list consolidated files for this user (not individual search results)
        user_prefix = f'results/{user_id}/consolidated/'
        logger.info(f"Listing consolidated files with prefix: {user_prefix}")
        
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=user_prefix,
            MaxKeys=100
        )
        
        objects = []
        if 'Contents' in response:
            for obj in response['Contents']:
                objects.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'lastModified': obj['LastModified'].isoformat(),
                    'etag': obj['ETag'].strip('"')
                })
        
        # Sort by last modified date (newest first)
        objects.sort(key=lambda x: x['lastModified'], reverse=True)
        
        logger.info(f"Found {len(objects)} consolidated files for user {user_id}")
        
        return {
            'bucket': bucket_name,
            'objects': objects,
            'count': len(objects)
        }
        
    except ClientError as e:
        logger.error(f"Error listing bucket contents: {e}")
        raise Exception(f"Failed to list bucket contents: {e}")

def get_download_url(s3_client, bucket_name, key, user_id):
    """Generate a presigned URL for downloading an object"""
    try:
        # Verify key belongs to user (allow both consolidated/ subfolder and root)
        if not key.startswith(f'results/{user_id}/'):
            logger.error(f"Unauthorized access attempt: user {user_id} tried to access {key}")
            raise Exception(f'Unauthorized: Key does not belong to user')
        
        # Generate presigned URL valid for 1 hour
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': key},
            ExpiresIn=3600
        )
        
        # Get object metadata
        try:
            head_response = s3_client.head_object(Bucket=bucket_name, Key=key)
            content_type = head_response.get('ContentType', 'application/octet-stream')
            content_length = head_response.get('ContentLength', 0)
        except ClientError:
            content_type = 'application/octet-stream'
            content_length = 0
        
        return {
            'downloadUrl': url,
            'key': key,
            'contentType': content_type,
            'contentLength': content_length,
            'expiresIn': 3600
        }
        
    except ClientError as e:
        logger.error(f"Error generating download URL: {e}")
        raise Exception(f"Failed to generate download URL: {e}")

def get_file_content(s3_client, bucket_name, key, user_id):
    """Fetch and return the content of a file directly"""
    try:
        # Verify key belongs to user (allow both consolidated/ subfolder and root)
        if not key.startswith(f'results/{user_id}/'):
            logger.error(f"Unauthorized access attempt: user {user_id} tried to access {key}")
            raise Exception(f'Unauthorized: Key does not belong to user')
        
        # Get the object from S3
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        
        # Read the content
        content = response['Body'].read()
        
        # Get content type
        content_type = response.get('ContentType', 'application/octet-stream')
        
        # If it's JSON, parse it and return as object
        if content_type == 'application/json' or key.endswith('.json'):
            try:
                content_json = json.loads(content.decode('utf-8'))
                return {
                    'key': key,
                    'contentType': content_type,
                    'content': content_json,
                    'size': len(content)
                }
            except json.JSONDecodeError:
                # If JSON parsing fails, return as text
                return {
                    'key': key,
                    'contentType': 'text/plain',
                    'content': content.decode('utf-8'),
                    'size': len(content)
                }
        else:
            # For non-JSON files, return as text
            try:
                text_content = content.decode('utf-8')
                return {
                    'key': key,
                    'contentType': 'text/plain',
                    'content': text_content,
                    'size': len(content)
                }
            except UnicodeDecodeError:
                # If it can't be decoded as text, return base64
                import base64
                return {
                    'key': key,
                    'contentType': content_type,
                    'content': base64.b64encode(content).decode('utf-8'),
                    'encoding': 'base64',
                    'size': len(content)
                }
        
    except ClientError as e:
        logger.error(f"Error fetching file content: {e}")
        raise Exception(f"Failed to fetch file content: {e}")