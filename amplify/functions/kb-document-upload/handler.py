"""
Knowledge Base Document Upload Lambda Function

Handles document upload requests by:
1. Validating file metadata (type, size)
2. Generating S3 presigned URLs for direct client uploads
3. Creating document metadata records in DynamoDB
4. Enforcing user authentication and authorization

Requirements: 1.1, 1.2, 1.5, 7.1, 7.2, 7.3
"""

import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

# Initialize AWS clients
# Force SigV4 + regional endpoint for presigned URLs
# Global endpoint (s3.amazonaws.com) causes CORS failures because S3 redirects
# the request to the regional endpoint, and the redirect drops CORS headers.
from botocore.client import Config
_region = os.environ.get('AWS_REGION', 'us-east-1')
s3_client = boto3.client(
    's3',
    region_name=_region,
    endpoint_url=f'https://s3.{_region}.amazonaws.com',
    config=Config(signature_version='s3v4', s3={'addressing_style': 'virtual'})
)
dynamodb = boto3.resource('dynamodb')

# Environment variables
DOCUMENT_BUCKET = os.environ['DOCUMENT_BUCKET']  # Required
DOCUMENT_TABLE = os.environ['DOCUMENT_TABLE']  # Required
PRESIGNED_URL_EXPIRATION = int(os.environ.get('PRESIGNED_URL_EXPIRATION', '3600'))  # Optional: 1 hour default

# File validation constants
ALLOWED_CONTENT_TYPES = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/plain': '.txt',
    'text/markdown': '.md',
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
MIN_FILE_SIZE = 1  # 1 byte


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for document upload requests
    
    Expected input (GraphQL mutation):
    {
        "filename": "document.pdf",
        "contentType": "application/pdf",
        "fileSize": 1024000,
        "category": "research" (optional)
    }
    
    Returns:
    {
        "documentId": "uuid",
        "uploadUrl": "presigned-s3-url",
        "status": "uploading",
        "s3Key": "user-{userId}/document.pdf"
    }
    """
    try:
        print(f"Received event: {json.dumps(event)}")
        
        # Extract user identity from Cognito authorizer
        user_id, user_email = extract_user_identity(event)
        if not user_id:
            raise Exception("Unauthorized: User identity not found")
        
        print(f"Processing upload request for user: {user_id} ({user_email})")
        
        # Parse input arguments
        arguments = event.get('arguments', {})
        input_data = arguments.get('input', {})
        
        filename = input_data.get('filename')
        content_type = input_data.get('contentType')
        file_size = input_data.get('fileSize')
        category = input_data.get('category')
        agency = input_data.get('agency')  # Agency for content documents
        grant_metadata = input_data.get('grantMetadata')  # Enhanced metadata for guidelines
        
        # Validate required fields
        if not all([filename, content_type, file_size]):
            raise Exception("Missing required fields: filename, contentType, fileSize")
        
        # Validate file and get cleaned filename
        validation_error, filename = validate_file(filename, content_type, file_size)
        if validation_error:
            raise Exception(validation_error)
        
        # Generate unique document ID
        document_id = str(uuid.uuid4())
        
        # Create S3 key with user-scoped prefix
        s3_key = f"user-{user_id}/{document_id}/{filename}"
        
        # Generate presigned URL for upload
        try:
            upload_url = generate_presigned_upload_url(
                bucket=DOCUMENT_BUCKET,
                key=s3_key,
                content_type=content_type,
                expiration=PRESIGNED_URL_EXPIRATION
            )
        except Exception as e:
            print(f"Error generating presigned URL: {str(e)}")
            raise Exception(f"Failed to generate upload URL: {str(e)}")
        
        # Create document metadata record in DynamoDB
        try:
            create_document_metadata(
                document_id=document_id,
                user_id=user_id,
                filename=filename,
                content_type=content_type,
                file_size=file_size,
                s3_key=s3_key,
                s3_bucket=DOCUMENT_BUCKET,
                category=category,
                agency=agency,  # Pass agency for content documents
                grant_metadata=grant_metadata  # Pass enhanced metadata for guidelines
            )
        except Exception as e:
            print(f"Error creating document metadata: {str(e)}")
            raise Exception(f"Failed to create document record: {str(e)}")
        
        # NOTE: S3 tagging is now handled by kb-document-processor Lambda
        # after the file is actually uploaded via the presigned URL.
        # Tagging here would fail because the object doesn't exist yet.
        
        # Return success response (AppSync expects direct data, not HTTP response)
        response = {
            'documentId': document_id,
            'uploadUrl': upload_url,
            'status': 'uploading',
            's3Key': s3_key,
            's3Bucket': DOCUMENT_BUCKET,
            'expiresIn': PRESIGNED_URL_EXPIRATION
        }
        
        print(f"Successfully created upload request for document: {document_id}")
        return response
        
    except Exception as e:
        print(f"Unexpected error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        # Re-raise for AppSync to handle
        raise


def extract_user_identity(event: Dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    """
    Extract user ID and email from Cognito identity in the event
    
    Returns:
        Tuple of (user_id, user_email)
    """
    # Check for Cognito identity in request context
    identity = event.get('identity', {})
    
    # Try to get from Cognito claims
    claims = identity.get('claims', {})
    if claims:
        user_id = claims.get('sub') or claims.get('cognito:username')
        user_email = claims.get('email')
        return user_id, user_email
    
    # Try to get from request context (AppSync)
    request_context = event.get('requestContext', {})
    if request_context:
        identity_context = request_context.get('identity', {})
        user_id = identity_context.get('sub') or identity_context.get('cognitoIdentityId')
        user_email = identity_context.get('email')
        return user_id, user_email
    
    return None, None


def validate_file(filename: str, content_type: str, file_size: int) -> tuple[Optional[str], str]:
    """
    Validate file metadata
    
    Returns:
        Tuple of (error_message, cleaned_filename)
        error_message is None if valid, otherwise contains the error
        cleaned_filename is the trimmed filename
    """
    # Trim whitespace from filename
    cleaned_filename = filename.strip()
    
    # Log for debugging
    print(f"Validating filename: original='{filename}', cleaned='{cleaned_filename}'")
    print(f"Filename repr: {repr(cleaned_filename)}")
    
    # Validate content type
    if content_type not in ALLOWED_CONTENT_TYPES:
        allowed_types = ', '.join(ALLOWED_CONTENT_TYPES.keys())
        return f"Invalid content type: {content_type}. Allowed types: {allowed_types}", cleaned_filename
    
    # Validate file extension matches content type
    expected_extension = ALLOWED_CONTENT_TYPES[content_type]
    if not cleaned_filename.lower().endswith(expected_extension):
        return f"File extension does not match content type. Expected: {expected_extension}", cleaned_filename
    
    # Validate file size
    if file_size < MIN_FILE_SIZE:
        return f"File size too small. Minimum: {MIN_FILE_SIZE} bytes", cleaned_filename
    
    if file_size > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE / (1024 * 1024)
        return f"File size too large. Maximum: {max_mb} MB", cleaned_filename
    
    # Validate filename
    if not cleaned_filename or len(cleaned_filename) > 255:
        return "Invalid filename length", cleaned_filename
    
    # Check for path traversal attempts (directory separators only, not dots in filenames)
    if '/' in cleaned_filename or '\\' in cleaned_filename:
        return "Invalid filename: path separators not allowed", cleaned_filename
    
    return None, cleaned_filename


def generate_presigned_upload_url(
    bucket: str,
    key: str,
    content_type: str,
    expiration: int
) -> str:
    """
    Generate a presigned URL for uploading a file to S3
    
    Args:
        bucket: S3 bucket name
        key: S3 object key
        content_type: MIME type of the file
        expiration: URL expiration time in seconds
    
    Returns:
        Presigned URL string
    """
    try:
        url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket,
                'Key': key,
                'ContentType': content_type,
            },
            ExpiresIn=expiration,
            HttpMethod='PUT'
        )
        return url
    except ClientError as e:
        print(f"Error generating presigned URL: {str(e)}")
        raise


def create_document_metadata(
    document_id: str,
    user_id: str,
    filename: str,
    content_type: str,
    file_size: int,
    s3_key: str,
    s3_bucket: str,
    category: Optional[str] = None,
    agency: Optional[str] = None,
    grant_metadata: Optional[Dict[str, Any]] = None
) -> None:
    """
    Create document metadata record in DynamoDB
    
    Args:
        document_id: Unique document identifier
        user_id: User ID (Cognito sub)
        filename: Original filename
        content_type: MIME type
        file_size: File size in bytes
        s3_key: S3 object key
        s3_bucket: S3 bucket name
        category: Optional document category
        agency: Optional agency for content documents (NSF, NIH, etc.)
        grant_metadata: Optional enhanced metadata for grant guidelines
    """
    table = dynamodb.Table(DOCUMENT_TABLE)
    
    now = datetime.utcnow().isoformat() + 'Z'
    
    # Calculate TTL (30 days from now) - optional cleanup
    ttl = int((datetime.utcnow() + timedelta(days=30)).timestamp())
    
    item = {
        'userId': user_id,
        'documentId': document_id,
        'filename': filename,
        'contentType': content_type,
        'fileSize': file_size,
        's3Key': s3_key,
        's3Bucket': s3_bucket,
        'status': 'uploading',
        'uploadDate': now,
        'vectorIndexed': False,
        'ttl': ttl,
        'createdAt': now,
        'updatedAt': now,
    }
    
    # Add optional fields
    if category:
        item['category'] = category
    
    # Add agency for content documents (used for filtering at proposal time)
    if agency:
        item['agency'] = agency
    
    # Add enhanced grant metadata if provided (for grant guidelines)
    if grant_metadata:
        # Store each metadata field separately for easy querying
        if grant_metadata.get('agency'):
            item['agency'] = grant_metadata['agency']
        if grant_metadata.get('grantType'):
            item['grantType'] = grant_metadata['grantType']
        if grant_metadata.get('section'):
            item['section'] = grant_metadata['section']
        if grant_metadata.get('documentType'):
            item['documentType'] = grant_metadata['documentType']
        if grant_metadata.get('year'):
            item['year'] = grant_metadata['year']
        if grant_metadata.get('version'):
            item['version'] = grant_metadata['version']
    
    try:
        table.put_item(Item=item)
        print(f"Created document metadata: {document_id}")
    except ClientError as e:
        print(f"Error creating document metadata: {str(e)}")
        raise


def success_response(data: Any) -> Dict[str, Any]:
    """Format successful response"""
    return {
        'statusCode': 200,
        'body': json.dumps(data),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        }
    }


def error_response(status_code: int, message: str) -> Dict[str, Any]:
    """Format error response"""
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'error': message
        }),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        }
    }


def tag_s3_object_with_metadata(
    bucket: str,
    key: str,
    metadata: Dict[str, Any]
) -> None:
    """
    Tag S3 object with metadata for Bedrock Knowledge Base to read.
    
    This function is completely flexible - it automatically converts
    any metadata dictionary to S3 tags without hardcoding field names.
    
    Add/modify/delete metadata fields in the UI and GraphQL schema,
    and this function will automatically handle them.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key
        metadata: Dictionary of metadata key-value pairs
    
    Note:
        - S3 tag keys and values must be strings
        - Tag keys are limited to 128 characters
        - Tag values are limited to 256 characters
        - Maximum 10 tags per object
        - Bedrock KB will automatically read these tags and include
          them in the OpenSearch vector documents
    """
    if not metadata:
        print("No metadata provided, skipping S3 tagging")
        return
    
    # Convert metadata dict to S3 tag format
    # Automatically handles any fields without hardcoding
    tag_set = []
    
    for key_name, value in metadata.items():
        # Skip None/empty values
        if value is None or value == '':
            continue
        
        # Convert to string (S3 tags must be strings)
        str_value = str(value)
        
        # Validate tag constraints
        if len(key_name) > 128:
            print(f"Warning: Tag key '{key_name}' exceeds 128 chars, truncating")
            key_name = key_name[:128]
        
        if len(str_value) > 256:
            print(f"Warning: Tag value for '{key_name}' exceeds 256 chars, truncating")
            str_value = str_value[:256]
        
        tag_set.append({
            'Key': key_name,
            'Value': str_value
        })
    
    # Check 10 tag limit
    if len(tag_set) > 10:
        print(f"Warning: {len(tag_set)} tags provided, S3 limit is 10. Using first 10.")
        tag_set = tag_set[:10]
    
    if not tag_set:
        print("No valid tags to apply")
        return
    
    # Apply tags to S3 object
    try:
        s3_client.put_object_tagging(
            Bucket=bucket,
            Key=key,
            Tagging={'TagSet': tag_set}
        )
        print(f"Applied {len(tag_set)} tags to S3 object: {', '.join([t['Key'] for t in tag_set])}")
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        print(f"S3 tagging error [{error_code}]: {error_message}")
        raise
