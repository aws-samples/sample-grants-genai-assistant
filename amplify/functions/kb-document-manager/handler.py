"""
Knowledge Base Document Management Lambda Function

Handles document management operations:
1. listDocuments - List user's documents with filtering
2. deleteDocument - Delete document from S3, DynamoDB, and vector index
3. getDocumentStatus - Get current processing status of a document

All operations enforce user authorization to ensure users can only
access and manage their own documents.

Requirements: 1.3, 1.4, 7.2, 7.3
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
bedrock_agent = boto3.client('bedrock-agent')

# Environment variables - All required, no fallbacks
DOCUMENT_BUCKET = os.environ['DOCUMENT_BUCKET']
DOCUMENT_TABLE = os.environ['DOCUMENT_TABLE']
KNOWLEDGE_BASE_ID = os.environ['KNOWLEDGE_BASE_ID']
DATA_SOURCE_ID = os.environ['DATA_SOURCE_ID']

# Pagination defaults
DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for document management operations
    
    Routes to appropriate operation based on field name:
    - listDocuments
    - deleteDocument
    - getDocumentStatus
    """
    try:
        print(f"Received event: {json.dumps(event)}")
        
        # Extract user identity from Cognito authorizer
        user_id, user_email = extract_user_identity(event)
        if not user_id:
            raise Exception("Unauthorized: User identity not found")
        
        print(f"Processing request for user: {user_id} ({user_email})")
        
        # Determine which operation to perform based on field name
        # AppSync passes fieldName at the top level, not inside 'info'
        field_name = event.get('fieldName')
        
        if field_name == 'listDocuments':
            return handle_list_documents(event, user_id)
        elif field_name == 'deleteDocument':
            return handle_delete_document(event, user_id)
        elif field_name == 'getDocumentStatus' or field_name == 'getDocument':
            return handle_get_document_status(event, user_id)
        elif field_name == 'updateDocumentStatus':
            return handle_update_document_status(event)
        else:
            raise Exception(f"Unknown operation: {field_name}")
        
    except Exception as e:
        print(f"Unexpected error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def handle_list_documents(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List user's documents with optional filtering
    
    Input:
    {
        "filters": {
            "category": "research",
            "status": "ready",
            "dateRange": {
                "start": "2024-01-01T00:00:00Z",
                "end": "2024-12-31T23:59:59Z"
            }
        },
        "limit": 20,
        "offset": 0
    }
    
    Returns:
    {
        "documents": [
            {
                "documentId": "uuid",
                "filename": "document.pdf",
                "contentType": "application/pdf",
                "fileSize": 1024000,
                "category": "research",
                "status": "ready",
                "uploadDate": "2024-01-15T10:30:00Z",
                "processedAt": "2024-01-15T10:35:00Z"
            }
        ],
        "total": 42,
        "hasMore": true
    }
    """
    try:
        # Parse arguments
        arguments = event.get('arguments', {})
        filters = arguments.get('filters') or {}  # Handle null from GraphQL
        limit = arguments.get('limit', DEFAULT_LIMIT)
        offset = arguments.get('offset', 0)
        
        # Validate and normalize limit
        limit = min(max(1, limit), MAX_LIMIT)
        offset = max(0, offset)
        
        print(f"Listing documents for user {user_id} with filters: {json.dumps(filters)}")
        
        # Query DynamoDB for user's documents
        table = dynamodb.Table(DOCUMENT_TABLE)
        
        # Query using userId (partition key)
        query_params = {
            'KeyConditionExpression': Key('userId').eq(user_id),
            'ScanIndexForward': False  # Sort by most recent first
        }
        
        # Build filter expression for additional filters
        filter_expressions = []
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        # Filter by category
        category = filters.get('category')
        if category:
            filter_expressions.append('category = :category')
            expression_attribute_values[':category'] = category
        
        # Note: We cannot filter by nested attributes (grantMetadata.agency) in DynamoDB FilterExpression
        # We'll filter by agency in Python after fetching the results
        
        # Filter by status
        status = filters.get('status')
        if status:
            filter_expressions.append('#status = :status')
            expression_attribute_names['#status'] = 'status'
            expression_attribute_values[':status'] = status
        
        # Filter by date range
        date_range = filters.get('dateRange', {})
        start_date = date_range.get('start')
        end_date = date_range.get('end')
        
        if start_date:
            filter_expressions.append('uploadDate >= :start_date')
            expression_attribute_values[':start_date'] = start_date
        
        if end_date:
            filter_expressions.append('uploadDate <= :end_date')
            expression_attribute_values[':end_date'] = end_date
        
        # Add filter expression if any filters are present
        if filter_expressions:
            query_params['FilterExpression'] = ' AND '.join(filter_expressions)
            query_params['ExpressionAttributeValues'] = expression_attribute_values
            if expression_attribute_names:
                query_params['ExpressionAttributeNames'] = expression_attribute_names
        
        # Execute query
        response = table.query(**query_params)
        items = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            query_params['ExclusiveStartKey'] = response['LastEvaluatedKey']
            response = table.query(**query_params)
            items.extend(response.get('Items', []))
        
        # Filter by agency in Python (can't use DynamoDB FilterExpression for nested attributes)
        # Support both top-level 'agency' field and nested 'grantMetadata.agency'
        agency = filters.get('agency')
        if agency:
            print(f"Filtering by agency: {agency}")
            items = [
                item for item in items 
                if (item.get('agency') == agency or 
                    item.get('grantMetadata', {}).get('agency') == agency)
            ]
            print(f"After agency filter: {len(items)} documents")
        
        # Apply offset and limit
        total_count = len(items)
        paginated_items = items[offset:offset + limit]
        
        # Format documents for response
        documents = []
        for item in paginated_items:
            doc = {
                'documentId': item.get('documentId'),
                'filename': item.get('filename'),
                'contentType': item.get('contentType'),
                'fileSize': item.get('fileSize'),
                'status': item.get('status'),
                'uploadDate': item.get('uploadDate'),
                's3Key': item.get('s3Key'),
                's3Bucket': item.get('s3Bucket'),
                'vectorIndexed': item.get('vectorIndexed', False)
            }
            
            # Add optional fields if present
            if item.get('category'):
                doc['category'] = item['category']
            if item.get('processedAt'):
                doc['processedAt'] = item['processedAt']
            if item.get('errorMessage'):
                doc['errorMessage'] = item['errorMessage']
            if item.get('grantMetadata'):
                doc['grantMetadata'] = item['grantMetadata']
            if item.get('agency'):
                doc['agency'] = item['agency']
            
            documents.append(doc)
        
        # Build response
        result = {
            'documents': documents,
            'total': total_count,
            'hasMore': (offset + limit) < total_count,
            'offset': offset,
            'limit': limit
        }
        
        print(f"Returning {len(documents)} documents (total: {total_count})")
        return result
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        print(f"DynamoDB error [{error_code}]: {error_message}")
        raise Exception(f"Database error: {error_message}")
    except Exception as e:
        print(f"Error in handle_list_documents: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def handle_delete_document(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Delete document from S3, DynamoDB, and trigger vector cleanup
    
    Input:
    {
        "documentId": "uuid"
    }
    
    Returns:
    {
        "success": true,
        "documentId": "uuid",
        "message": "Document deleted successfully"
    }
    """
    try:
        # Parse arguments
        arguments = event.get('arguments', {})
        document_id = arguments.get('documentId')
        
        if not document_id:
            raise Exception("documentId is required")
        
        print(f"Deleting document {document_id} for user {user_id}")
        
        # Get document metadata to verify ownership and get S3 key
        table = dynamodb.Table(DOCUMENT_TABLE)
        
        try:
            response = table.get_item(
                Key={
                    'userId': user_id,
                    'documentId': document_id
                }
            )
            
            item = response.get('Item')
            if not item:
                raise Exception(f"Document not found: {document_id}")
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            error_message = e.response.get('Error', {}).get('Message')
            print(f"DynamoDB error [{error_code}]: {error_message}")
            raise Exception(f"Database error: {error_message}")
        
        # Extract S3 information
        s3_key = item.get('s3Key')
        s3_bucket = item.get('s3Bucket', DOCUMENT_BUCKET)
        
        # Delete from S3 (skip if no s3Key — orphaned record with no uploaded file)
        if not s3_key:
            print(f"No S3 key found — orphaned record, skipping S3 delete")
        else:
            try:
                print(f"Deleting S3 object: s3://{s3_bucket}/{s3_key}")
                s3_client.delete_object(
                    Bucket=s3_bucket,
                    Key=s3_key
                )
                print(f"Successfully deleted S3 object")
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code')
                error_message = e.response.get('Error', {}).get('Message')
                
                # If object doesn't exist, that's okay - continue with deletion
                if error_code != 'NoSuchKey':
                    print(f"S3 error [{error_code}]: {error_message}")
                    raise Exception(f"Failed to delete S3 object: {error_message}")
                else:
                    print(f"S3 object not found (already deleted)")
        
        # Delete from DynamoDB
        try:
            print(f"Deleting DynamoDB record")
            table.delete_item(
                Key={
                    'userId': user_id,
                    'documentId': document_id
                }
            )
            print(f"Successfully deleted DynamoDB record")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            error_message = e.response.get('Error', {}).get('Message')
            print(f"DynamoDB error [{error_code}]: {error_message}")
            raise Exception(f"Failed to delete document record: {error_message}")
        
        # Trigger Knowledge Base sync to remove from vector index
        # Note: Bedrock Knowledge Base will automatically remove deleted documents
        # during the next sync operation. We can trigger a sync to expedite this.
        try:
            if KNOWLEDGE_BASE_ID and DATA_SOURCE_ID:
                print(f"Triggering Knowledge Base sync to remove vectors")
                # AWS Bedrock requires description to be max 200 characters
                description = f"Cleanup sync after deleting document: {document_id}"
                if len(description) > 200:
                    description = f"Cleanup sync after deleting: {document_id[:150]}"[:200]
                
                sync_response = bedrock_agent.start_ingestion_job(
                    knowledgeBaseId=KNOWLEDGE_BASE_ID,
                    dataSourceId=DATA_SOURCE_ID,
                    description=description
                )
                sync_job_id = sync_response.get('ingestionJob', {}).get('ingestionJobId')
                print(f"Started cleanup sync job: {sync_job_id}")
        except Exception as e:
            # Log error but don't fail the deletion
            # The vector will be cleaned up in the next scheduled sync
            print(f"Warning: Failed to trigger vector cleanup sync: {str(e)}")
        
        # Return success response (GraphQL expects boolean)
        print(f"Successfully deleted document {document_id}")
        return True
        
    except Exception as e:
        print(f"Error in handle_delete_document: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def handle_get_document_status(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Get current processing status of a document
    
    Input:
    {
        "documentId": "uuid"
    }
    
    Returns:
    {
        "documentId": "uuid",
        "filename": "document.pdf",
        "status": "ready",
        "uploadDate": "2024-01-15T10:30:00Z",
        "processedAt": "2024-01-15T10:35:00Z",
        "vectorIndexed": true
    }
    """
    try:
        # Parse arguments
        arguments = event.get('arguments', {})
        document_id = arguments.get('documentId')
        
        if not document_id:
            raise Exception("documentId is required")
        
        print(f"Getting status for document {document_id} for user {user_id}")
        
        # Get document metadata from DynamoDB
        table = dynamodb.Table(DOCUMENT_TABLE)
        
        try:
            response = table.get_item(
                Key={
                    'userId': user_id,
                    'documentId': document_id
                }
            )
            
            item = response.get('Item')
            if not item:
                raise Exception(f"Document not found: {document_id}")
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            error_message = e.response.get('Error', {}).get('Message')
            print(f"DynamoDB error [{error_code}]: {error_message}")
            raise Exception(f"Database error: {error_message}")
        
        # Format document status response
        document = {
            'documentId': item.get('documentId'),
            'filename': item.get('filename'),
            'contentType': item.get('contentType'),
            'fileSize': item.get('fileSize'),
            'status': item.get('status'),
            'uploadDate': item.get('uploadDate'),
            'vectorIndexed': item.get('vectorIndexed', False),
            's3Key': item.get('s3Key'),
            's3Bucket': item.get('s3Bucket')
        }
        
        # Add optional fields if present
        if item.get('category'):
            document['category'] = item['category']
        if item.get('processedAt'):
            document['processedAt'] = item['processedAt']
        if item.get('errorMessage'):
            document['errorMessage'] = item['errorMessage']
        if item.get('updatedAt'):
            document['updatedAt'] = item['updatedAt']
        if item.get('grantMetadata'):
            document['grantMetadata'] = item['grantMetadata']
        if item.get('agency'):
            document['agency'] = item['agency']
        
        print(f"Document status: {document['status']}")
        return document
        
    except Exception as e:
        print(f"Error in handle_get_document_status: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def handle_update_document_status(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update document status (called by processor Lambda via AppSync)
    
    This mutation is used by the processor Lambda to publish real-time status updates
    that trigger the onDocumentStatusChanged subscription for UI updates.
    
    Input:
    {
        "input": {
            "documentId": "uuid",
            "userId": "cognito-sub",
            "filename": "document.pdf",
            "status": "processing",
            "errorMessage": "optional error",
            "updatedAt": "2024-01-15T10:35:00Z",
            "vectorIndexed": false
        }
    }
    
    Returns:
    {
        "documentId": "uuid",
        "userId": "cognito-sub",
        "filename": "document.pdf",
        "status": "processing",
        "updatedAt": "2024-01-15T10:35:00Z"
    }
    """
    try:
        # Parse arguments
        arguments = event.get('arguments', {})
        input_data = arguments.get('input', {})
        
        document_id = input_data.get('documentId')
        user_id = input_data.get('userId')
        status = input_data.get('status')
        
        if not all([document_id, user_id, status]):
            raise Exception("documentId, userId, and status are required")
        
        print(f"Updating document {document_id} status to {status} for user {user_id}")
        
        # This function is primarily for triggering subscriptions
        # The actual DynamoDB update is done by the processor Lambda
        # We just return the input data to trigger the subscription
        
        return {
            'documentId': document_id,
            'userId': user_id,
            'filename': input_data.get('filename', ''),
            'status': status,
            'errorMessage': input_data.get('errorMessage'),
            'updatedAt': input_data.get('updatedAt'),
            'vectorIndexed': input_data.get('vectorIndexed', False)
        }
        
    except Exception as e:
        print(f"Error in handle_update_document_status: {str(e)}")
        import traceback
        traceback.print_exc()
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


def success_response(data: Any) -> Dict[str, Any]:
    """Format successful response"""
    return {
        'statusCode': 200,
        'body': json.dumps(data) if not isinstance(data, str) else data,
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
