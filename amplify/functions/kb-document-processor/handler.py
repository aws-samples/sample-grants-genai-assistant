"""
Knowledge Base Document Processing Lambda Function

Triggered by S3 events when documents are uploaded. Handles:
1. Extracting text from PDFs (if applicable)
2. Storing extracted text in S3
3. Updating document status to "processing"
4. Triggering Bedrock Knowledge Base sync for vectorization
5. Monitoring sync job completion
6. Updating document status to "ready" or "failed"
7. Implementing retry logic with exponential backoff

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.2, 8.3, 8.4
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from urllib.parse import unquote_plus
import boto3
from botocore.exceptions import ClientError
from pypdf import PdfReader
from io import BytesIO

# Initialize AWS clients
bedrock_agent = boto3.client('bedrock-agent')
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

# Environment variables - Required
KNOWLEDGE_BASE_ID = os.environ['KNOWLEDGE_BASE_ID']
DATA_SOURCE_ID = os.environ['DATA_SOURCE_ID']
DOCUMENT_TABLE = os.environ['DOCUMENT_TABLE']

# Optional - for real-time notifications
APPSYNC_ENDPOINT = os.environ.get('APPSYNC_ENDPOINT', None)

# Retry configuration
MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # seconds
MAX_BACKOFF = 60  # seconds
BACKOFF_MULTIPLIER = 2

# Sync job polling configuration
SYNC_POLL_INTERVAL = 5  # seconds
SYNC_MAX_WAIT = 300  # 5 minutes max wait


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF bytes using pypdf
    
    Args:
        pdf_bytes: PDF file content as bytes
    
    Returns:
        Extracted text as string
    
    Raises:
        Exception: If PDF extraction fails
    """
    try:
        print("📄 Extracting text from PDF...")
        pdf_file = BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        
        text_parts = []
        page_count = len(reader.pages)
        print(f"   PDF has {page_count} pages")
        
        for i, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
                    if i == 0:
                        print(f"   Page 1 preview: {page_text[:100]}...")
            except Exception as e:
                print(f"   ⚠️  Failed to extract page {i+1}: {str(e)}")
                continue
        
        extracted_text = '\n\n'.join(text_parts)
        char_count = len(extracted_text)
        print(f"✅ Extracted {char_count:,} characters from {page_count} pages")
        
        return extracted_text
        
    except Exception as e:
        print(f"❌ PDF extraction failed: {str(e)}")
        raise


def store_extracted_text(bucket: str, original_key: str, text: str) -> str:
    """
    Store extracted text in S3 alongside the original PDF
    
    Args:
        bucket: S3 bucket name
        original_key: Original PDF S3 key (e.g., user-{userId}/{documentId}/file.pdf)
        text: Extracted text content
    
    Returns:
        S3 key of the stored text file
    """
    try:
        # Generate text file key: user-{userId}/{documentId}/extracted.txt
        key_parts = original_key.rsplit('/', 1)
        if len(key_parts) == 2:
            prefix = key_parts[0]
            text_key = f"{prefix}/extracted.txt"
        else:
            text_key = f"{original_key}.extracted.txt"
        
        print(f"💾 Storing extracted text at: {text_key}")
        
        s3_client.put_object(
            Bucket=bucket,
            Key=text_key,
            Body=text.encode('utf-8'),
            ContentType='text/plain',
            ServerSideEncryption='AES256'
        )
        
        print(f"✅ Stored {len(text):,} characters at {text_key}")
        return text_key
        
    except Exception as e:
        print(f"❌ Failed to store extracted text: {str(e)}")
        raise


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for S3 event notifications
    
    Expected S3 event structure:
    {
        "Records": [
            {
                "s3": {
                    "bucket": {"name": "bucket-name"},
                    "object": {"key": "user-{userId}/{documentId}/filename.pdf"}
                }
            }
        ]
    }
    """
    try:
        print(f"Received S3 event: {json.dumps(event)}")
        
        # Validate environment variables
        if not all([KNOWLEDGE_BASE_ID, DATA_SOURCE_ID, DOCUMENT_TABLE]):
            raise ValueError(
                "Missing required environment variables: "
                "KNOWLEDGE_BASE_ID, DATA_SOURCE_ID, DOCUMENT_TABLE"
            )
        
        # Process each S3 record
        results = []
        for record in event.get('Records', []):
            try:
                # Skip Copy events to avoid infinite loop
                # When we copy the object to add metadata, it triggers another S3 event
                event_name = record.get('eventName', '')
                if 'Copy' in event_name:
                    print(f"Skipping Copy event: {event_name}")
                    continue
                
                result = process_s3_record(record)
                results.append(result)
            except Exception as e:
                print(f"Error processing record: {str(e)}")
                import traceback
                traceback.print_exc()
                results.append({
                    'success': False,
                    'error': str(e)
                })
        
        # Return summary
        success_count = sum(1 for r in results if r.get('success'))
        total_count = len(results)
        
        return {
            'statusCode': 200 if success_count == total_count else 207,
            'body': json.dumps({
                'processed': total_count,
                'successful': success_count,
                'failed': total_count - success_count,
                'results': results
            })
        }
        
    except Exception as e:
        print(f"Unexpected error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f"Internal server error: {str(e)}"
            })
        }


def process_s3_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a single S3 event record
    
    Returns:
        Dict with processing result
    """
    # Extract S3 information
    s3_info = record.get('s3', {})
    bucket_name = s3_info.get('bucket', {}).get('name')
    object_key = s3_info.get('object', {}).get('key')
    
    if not bucket_name or not object_key:
        raise ValueError("Invalid S3 event: missing bucket or object key")
    
    # URL-decode the S3 key (S3 events have URL-encoded keys)
    object_key = unquote_plus(object_key)
    
    print(f"Processing document: s3://{bucket_name}/{object_key}")
    
    # Parse user ID and document ID from S3 key
    # Expected format: user-{userId}/{documentId}/filename.ext
    user_id, document_id = extract_document_info(object_key)
    if not user_id or not document_id:
        raise ValueError(f"Could not extract user ID and document ID from S3 key: {object_key}")
    
    print(f"User ID: {user_id}, Document ID: {document_id}")
    
    # Get document metadata from DynamoDB to retrieve grant metadata
    document_metadata = get_document_metadata(user_id, document_id)
    
    # Read S3 object content
    content = ""
    text_key = None
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        file_bytes = response['Body'].read()
        content_type = response.get('ContentType', '')
        
        print(f"📥 Downloaded {len(file_bytes):,} bytes, Content-Type: {content_type}")
        
        # Check if this is a PDF that needs text extraction
        if content_type == 'application/pdf' or object_key.lower().endswith('.pdf'):
            print("🔍 Detected PDF file, extracting text...")
            try:
                # Extract text from PDF
                extracted_text = extract_text_from_pdf(file_bytes)
                
                # Store extracted text in S3
                text_key = store_extracted_text(bucket_name, object_key, extracted_text)
                
                # Use extracted text for metadata and vector indexing
                content = extracted_text
                
                # Update DynamoDB with extraction status
                update_document_extraction_status(
                    user_id=user_id,
                    document_id=document_id,
                    text_key=text_key,
                    char_count=len(extracted_text),
                    extraction_status='success'
                )
                
                print(f"✅ PDF text extraction complete: {len(content):,} characters")
                
            except Exception as e:
                print(f"❌ PDF extraction failed: {str(e)}")
                # Store extraction failure in DynamoDB
                update_document_extraction_status(
                    user_id=user_id,
                    document_id=document_id,
                    extraction_status='failed',
                    error_message=str(e)
                )
                # Continue with binary content (will be less useful but won't block)
                content = file_bytes.decode('utf-8', errors='ignore')
        else:
            # Plain text file - decode directly
            content = file_bytes.decode('utf-8', errors='ignore')
            print(f"📄 Plain text file: {len(content):,} characters")
        
    except Exception as e:
        print(f"⚠️  Could not read S3 content: {e}")
        content = ""
    
    # Tag S3 object with metadata for Bedrock KB to read
    # This enables filtered semantic search in the vector database
    if document_metadata:
        grant_metadata = extract_grant_metadata(document_metadata, content)
        if grant_metadata:
            try:
                # If we extracted text from PDF, tag the extracted text file
                # Otherwise tag the original file
                key_to_tag = text_key if text_key else object_key
                
                tag_s3_object_with_metadata(
                    bucket=bucket_name,
                    key=key_to_tag,
                    metadata=grant_metadata
                )
                print(f"✅ Tagged S3 object with metadata: {list(grant_metadata.keys())}")
            except Exception as e:
                # Don't fail processing if tagging fails, just log it
                print(f"⚠️  Failed to tag S3 object: {str(e)}")
    
    # Update document status to "processing"
    try:
        update_document_status(
            user_id=user_id,
            document_id=document_id,
            status='processing',
            error_message=None
        )
    except Exception as e:
        print(f"Error updating document status to processing: {str(e)}")
        # Continue processing even if status update fails
    
    # Trigger Bedrock Knowledge Base sync with retry logic
    sync_job_id = None
    for attempt in range(MAX_RETRIES):
        try:
            sync_job_id = start_ingestion_job(object_key)
            print(f"Started ingestion job: {sync_job_id}")
            break
        except ClientError as e:
            error_code = e.response['Error']['Code']
            print(f"Attempt {attempt + 1}/{MAX_RETRIES} failed: {str(e)}")

            # ConflictException means another ingestion job is already running.
            # The document is safely in S3 — mark as queued and let the next
            # KB sync pick it up automatically. This is NOT a failure.
            if error_code == 'ConflictException':
                print("⏳ Another ingestion job is running — marking document as queued")
                update_document_status(
                    user_id=user_id,
                    document_id=document_id,
                    status='queued',
                    error_message=None
                )
                return {
                    'success': True,
                    'documentId': document_id,
                    'status': 'queued',
                    'message': 'Document queued — ingestion will start when current job completes'
                }

            if attempt < MAX_RETRIES - 1:
                backoff = min(
                    INITIAL_BACKOFF * (BACKOFF_MULTIPLIER ** attempt),
                    MAX_BACKOFF
                )
                print(f"Retrying in {backoff} seconds...")
                time.sleep(backoff)
            else:
                # Final attempt failed
                error_msg = f"Failed to start ingestion job after {MAX_RETRIES} attempts: {str(e)}"
                print(error_msg)
                update_document_status(
                    user_id=user_id,
                    document_id=document_id,
                    status='failed',
                    error_message=error_msg
                )
                return {
                    'success': False,
                    'documentId': document_id,
                    'error': error_msg
                }
        except Exception as e:
            print(f"Attempt {attempt + 1}/{MAX_RETRIES} failed: {str(e)}")
            if attempt < MAX_RETRIES - 1:
                backoff = min(
                    INITIAL_BACKOFF * (BACKOFF_MULTIPLIER ** attempt),
                    MAX_BACKOFF
                )
                print(f"Retrying in {backoff} seconds...")
                time.sleep(backoff)
            else:
                error_msg = f"Failed to start ingestion job after {MAX_RETRIES} attempts: {str(e)}"
                print(error_msg)
                update_document_status(
                    user_id=user_id,
                    document_id=document_id,
                    status='failed',
                    error_message=error_msg
                )
                return {
                    'success': False,
                    'documentId': document_id,
                    'error': error_msg
                }
    
    # Monitor sync job completion (with timeout)
    try:
        job_status = wait_for_ingestion_job(sync_job_id)
        print(f"Ingestion job completed with status: {job_status}")
        
        if job_status == 'COMPLETE':
            # Update document status to "ready"
            update_document_status(
                user_id=user_id,
                document_id=document_id,
                status='ready',
                error_message=None,
                vector_indexed=True
            )
            
            return {
                'success': True,
                'documentId': document_id,
                'syncJobId': sync_job_id,
                'status': 'ready'
            }
        else:
            # Job failed or was stopped
            error_msg = f"Ingestion job ended with status: {job_status}"
            print(error_msg)
            update_document_status(
                user_id=user_id,
                document_id=document_id,
                status='failed',
                error_message=error_msg
            )
            
            return {
                'success': False,
                'documentId': document_id,
                'syncJobId': sync_job_id,
                'error': error_msg
            }
            
    except TimeoutError as e:
        # Sync job is still running but we've exceeded our wait time
        # Mark as processing and let a separate monitoring process handle it
        error_msg = f"Ingestion job timeout: {str(e)}"
        print(error_msg)
        update_document_status(
            user_id=user_id,
            document_id=document_id,
            status='processing',
            error_message=error_msg
        )
        
        return {
            'success': False,
            'documentId': document_id,
            'syncJobId': sync_job_id,
            'error': error_msg,
            'timeout': True
        }
    
    except Exception as e:
        error_msg = f"Error monitoring ingestion job: {str(e)}"
        print(error_msg)
        update_document_status(
            user_id=user_id,
            document_id=document_id,
            status='failed',
            error_message=error_msg
        )
        
        return {
            'success': False,
            'documentId': document_id,
            'syncJobId': sync_job_id,
            'error': error_msg
        }


def extract_document_info(s3_key: str) -> tuple[Optional[str], Optional[str]]:
    """
    Extract user ID and document ID from S3 key
    
    Expected format: user-{userId}/{documentId}/filename.ext
    
    Returns:
        Tuple of (user_id, document_id) or (None, None) if not found
    """
    try:
        parts = s3_key.split('/')
        if len(parts) >= 3:
            # First part: user-{userId}
            user_prefix = parts[0]
            if user_prefix.startswith('user-'):
                user_id = user_prefix[5:]  # Remove 'user-' prefix
            else:
                return None, None
            
            # Second part: documentId
            document_id = parts[1]
            
            return user_id, document_id
        return None, None
    except Exception as e:
        print(f"Error extracting document info: {str(e)}")
        return None, None


def start_ingestion_job(s3_key: str) -> str:
    """
    Start a Bedrock Knowledge Base ingestion job
    
    Args:
        s3_key: S3 object key to ingest
    
    Returns:
        Ingestion job ID
    
    Raises:
        ClientError: If the API call fails
    """
    try:
        # AWS Bedrock requires description to be max 200 characters
        filename = s3_key.split('/')[-1]
        
        # Start with a base description
        base_desc = "Ingestion: "
        
        # Calculate how much space we have for the filename
        max_filename_length = 200 - len(base_desc)
        
        if len(filename) > max_filename_length:
            # Truncate filename to fit within 200 char limit
            truncated_filename = filename[:max_filename_length-3] + "..."
            description = f"{base_desc}{truncated_filename}"
        else:
            description = f"{base_desc}{filename}"
        
        # Final safety check - ensure we're under 200 chars
        description = description[:200]
        
        response = bedrock_agent.start_ingestion_job(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            dataSourceId=DATA_SOURCE_ID,
            description=description
        )
        
        ingestion_job = response.get('ingestionJob', {})
        job_id = ingestion_job.get('ingestionJobId')
        
        if not job_id:
            raise ValueError("No ingestion job ID returned from API")
        
        return job_id
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        print(f"Bedrock API error [{error_code}]: {error_message}")
        raise


def wait_for_ingestion_job(job_id: str) -> str:
    """
    Wait for ingestion job to complete
    
    Args:
        job_id: Ingestion job ID
    
    Returns:
        Final job status (COMPLETE, FAILED, STOPPED)
    
    Raises:
        TimeoutError: If job doesn't complete within SYNC_MAX_WAIT
        ClientError: If the API call fails
    """
    start_time = time.time()
    
    while True:
        # Check if we've exceeded max wait time
        elapsed = time.time() - start_time
        if elapsed > SYNC_MAX_WAIT:
            raise TimeoutError(
                f"Ingestion job {job_id} did not complete within {SYNC_MAX_WAIT} seconds"
            )
        
        try:
            response = bedrock_agent.get_ingestion_job(
                knowledgeBaseId=KNOWLEDGE_BASE_ID,
                dataSourceId=DATA_SOURCE_ID,
                ingestionJobId=job_id
            )
            
            ingestion_job = response.get('ingestionJob', {})
            status = ingestion_job.get('status')
            
            print(f"Ingestion job {job_id} status: {status}")
            
            # Check if job is in a terminal state
            if status in ['COMPLETE', 'FAILED', 'STOPPED']:
                # Log statistics if available
                stats = ingestion_job.get('statistics', {})
                if stats:
                    print(f"Ingestion statistics: {json.dumps(stats)}")
                
                # Log failure reasons if available
                if status == 'FAILED':
                    failure_reasons = ingestion_job.get('failureReasons', [])
                    if failure_reasons:
                        print(f"Failure reasons: {json.dumps(failure_reasons)}")
                
                return status
            
            # Job is still in progress, wait before polling again
            # nosemgrep: arbitrary-sleep - Intentional: Polling interval for Bedrock Knowledge Base ingestion job status
            time.sleep(SYNC_POLL_INTERVAL)
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            error_message = e.response.get('Error', {}).get('Message')
            print(f"Error checking ingestion job status [{error_code}]: {error_message}")
            raise


def update_document_status(
    user_id: str,
    document_id: str,
    status: str,
    error_message: Optional[str] = None,
    vector_indexed: bool = False
) -> None:
    """
    Update document status in DynamoDB and publish real-time notification via AppSync
    
    Args:
        user_id: User ID (Cognito sub)
        document_id: Document ID
        status: New status (uploading, processing, ready, failed)
        error_message: Optional error message for failed status
        vector_indexed: Whether document has been vectorized
    """
    table = dynamodb.Table(DOCUMENT_TABLE)
    
    now = datetime.utcnow().isoformat() + 'Z'
    
    # Build update expression
    update_expression = "SET #status = :status, updatedAt = :updated_at"
    expression_attribute_names = {
        '#status': 'status'
    }
    expression_attribute_values = {
        ':status': status,
        ':updated_at': now
    }
    
    # Add processedAt timestamp when status changes to ready
    if status == 'ready':
        update_expression += ", processedAt = :processed_at"
        expression_attribute_values[':processed_at'] = now
    
    # Add vector indexed flag if provided
    if vector_indexed:
        update_expression += ", vectorIndexed = :vector_indexed"
        expression_attribute_values[':vector_indexed'] = vector_indexed
    
    # Add error message if provided
    if error_message:
        update_expression += ", errorMessage = :error_message"
        expression_attribute_values[':error_message'] = error_message
    else:
        # Remove error message if status is not failed
        update_expression += " REMOVE errorMessage"
    
    try:
        # Use composite key (userId, documentId)
        response = table.update_item(
            Key={
                'userId': user_id,
                'documentId': document_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
        )
        
        updated_item = response.get('Attributes', {})
        print(f"Updated document {document_id} status to: {status}")
        
        # Publish real-time notification via AppSync
        publish_status_update(updated_item)
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_msg = e.response.get('Error', {}).get('Message')
        print(f"DynamoDB error [{error_code}]: {error_msg}")
        raise


def update_document_extraction_status(
    user_id: str,
    document_id: str,
    extraction_status: str,
    text_key: Optional[str] = None,
    char_count: Optional[int] = None,
    error_message: Optional[str] = None
) -> None:
    """
    Update document PDF extraction status in DynamoDB
    
    Args:
        user_id: User ID (Cognito sub)
        document_id: Document ID
        extraction_status: Extraction status (success, failed, not_needed)
        text_key: S3 key of extracted text file
        char_count: Number of characters extracted
        error_message: Optional error message for failed extraction
    """
    table = dynamodb.Table(DOCUMENT_TABLE)
    
    now = datetime.utcnow().isoformat() + 'Z'
    
    # Build update expression
    update_expression = "SET extractionStatus = :extraction_status, updatedAt = :updated_at"
    expression_attribute_values = {
        ':extraction_status': extraction_status,
        ':updated_at': now
    }
    
    # Add text key if provided
    if text_key:
        update_expression += ", extractedTextKey = :text_key"
        expression_attribute_values[':text_key'] = text_key
    
    # Add character count if provided
    if char_count is not None:
        update_expression += ", extractedCharCount = :char_count"
        expression_attribute_values[':char_count'] = char_count
    
    # Add error message if provided
    if error_message:
        update_expression += ", extractionError = :error_message"
        expression_attribute_values[':error_message'] = error_message
    
    try:
        table.update_item(
            Key={
                'userId': user_id,
                'documentId': document_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values
        )
        
        print(f"✅ Updated extraction status for {document_id}: {extraction_status}")
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_msg = e.response.get('Error', {}).get('Message')
        print(f"⚠️  DynamoDB error updating extraction status [{error_code}]: {error_msg}")
        # Don't raise - this is not critical


def publish_status_update(document: Dict[str, Any]) -> None:
    """
    Publish document status update by invoking the kbDocumentManager Lambda
    which will trigger the GraphQL mutation and subscription
    
    Args:
        document: Document metadata from DynamoDB
    """
    try:
        # Get the kbDocumentManager Lambda function name from environment
        kb_manager_function = os.environ.get('KB_MANAGER_FUNCTION_NAME')
        
        if not kb_manager_function:
            print("⚠️  KB_MANAGER_FUNCTION_NAME not set, skipping real-time notification")
            return
        
        lambda_client = boto3.client('lambda')
        
        # Build the GraphQL event that kbDocumentManager expects
        event = {
            "typeName": "Mutation",
            "fieldName": "updateDocumentStatus",
            "arguments": {
                "input": {
                    "documentId": document.get('documentId'),
                    "userId": document.get('userId'),
                    "filename": document.get('filename'),
                    "status": document.get('status'),
                    "updatedAt": document.get('updatedAt'),
                    "vectorIndexed": document.get('vectorIndexed', False)
                }
            },
            "identity": {
                "sourceIp": ["127.0.0.1"],
                "claims": {
                    "sub": document.get('userId'),
                    "cognito:username": "system"
                }
            }
        }
        
        # Add error message if present
        if document.get('errorMessage'):
            event["arguments"]["input"]["errorMessage"] = document['errorMessage']
        
        # Invoke the kbDocumentManager Lambda asynchronously
        response = lambda_client.invoke(
            FunctionName=kb_manager_function,
            InvocationType='Event',  # Async invocation
            Payload=json.dumps(event)
        )
        
        print(f"✅ Triggered notification via kbDocumentManager Lambda for document {document.get('documentId')}: {document.get('status')}")
            
    except Exception as e:
        # Log error but don't fail the processing
        print(f"❌ Error triggering notification: {str(e)}")
        import traceback
        traceback.print_exc()


def get_document_metadata(user_id: str, document_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve document metadata from DynamoDB
    
    Args:
        user_id: User ID (Cognito sub)
        document_id: Document ID
    
    Returns:
        Document metadata or None if not found
    """
    table = dynamodb.Table(DOCUMENT_TABLE)
    
    try:
        response = table.get_item(
            Key={
                'userId': user_id,
                'documentId': document_id
            }
        )
        
        return response.get('Item')
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        print(f"DynamoDB error [{error_code}]: {error_message}")
        return None


def extract_grant_metadata(document: Dict[str, Any], content: str = "") -> Dict[str, Any]:
    """
    Extract grant metadata fields from document metadata and add token counts
    
    Args:
        document: Document metadata from DynamoDB
        content: Document content for token counting
    
    Returns:
        Dictionary of grant metadata fields including token counts
    """
    metadata = {}
    
    # Add token count for content size estimation
    try:
        # Simple token estimation (1 token ≈ 4 characters)
        estimated_tokens = len(content) // 4
        metadata['tokenCount'] = str(estimated_tokens)
        metadata['characterCount'] = str(len(content))
        print(f"Token count: {estimated_tokens:,}, Character count: {len(content):,}")
    except Exception as e:
        print(f"Warning: Failed to calculate token count: {e}")
        metadata['tokenCount'] = '0'
        metadata['characterCount'] = '0'
    
    # Extract all grant-related metadata fields
    metadata_fields = ['agency', 'grantType', 'section', 'documentType', 'year', 'version']
    
    for field in metadata_fields:
        if field in document and document[field]:
            metadata[field] = document[field]
    
    return metadata


def tag_s3_object_with_metadata(
    bucket: str,
    key: str,
    metadata: Dict[str, Any]
) -> None:
    """
    Add metadata to S3 object for Bedrock Knowledge Base to read.
    
    IMPORTANT: Bedrock reads S3 OBJECT METADATA (x-amz-meta-* headers), NOT S3 tags!
    This function adds metadata to the S3 object itself, which Bedrock will index.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key
        metadata: Dictionary of metadata key-value pairs
    
    Note:
        - S3 object metadata is added as x-amz-meta-* headers
        - Bedrock KB will automatically read these and include them in OpenSearch
        - We also add S3 tags for backup/reference purposes
    """
    if not metadata:
        print("No metadata provided, skipping S3 metadata")
        return
    
    try:
        # First, get the current object to preserve its properties
        head_response = s3_client.head_object(Bucket=bucket, Key=key)
        
        # Prepare S3 object metadata (x-amz-meta-* headers)
        # These ARE read by Bedrock during ingestion
        s3_metadata = {}
        tag_set = []
        
        for key_name, value in metadata.items():
            # Skip None/empty values
            if value is None or value == '':
                continue
            
            # Convert to string
            str_value = str(value)
            
            # Add to S3 object metadata (for Bedrock)
            # S3 metadata keys should be lowercase
            metadata_key = key_name.lower().replace('_', '-')
            s3_metadata[metadata_key] = str_value
            
            # Also prepare as S3 tag (for backup/reference)
            if len(key_name) > 128:
                key_name = key_name[:128]
            if len(str_value) > 256:
                str_value = str_value[:256]
            
            tag_set.append({
                'Key': key_name,
                'Value': str_value
            })
        
        if not s3_metadata:
            print("No valid metadata to apply")
            return
        
        # Copy the object to itself with new metadata
        # This is the only way to update metadata on an existing object
        print(f"Copying object to add metadata: {', '.join(s3_metadata.keys())}")
        s3_client.copy_object(
            Bucket=bucket,
            Key=key,
            CopySource={'Bucket': bucket, 'Key': key},
            Metadata=s3_metadata,
            MetadataDirective='REPLACE',
            ContentType=head_response.get('ContentType', 'application/pdf'),
            ServerSideEncryption=head_response.get('ServerSideEncryption', 'AES256')
        )
        
        print(f"✅ Applied S3 object metadata (for Bedrock): {', '.join(s3_metadata.keys())}")
        
        # Also apply as S3 tags for backup/reference (limit to 10)
        if tag_set:
            if len(tag_set) > 10:
                tag_set = tag_set[:10]
            
            s3_client.put_object_tagging(
                Bucket=bucket,
                Key=key,
                Tagging={'TagSet': tag_set}
            )
            print(f"✅ Applied {len(tag_set)} S3 tags (for reference): {', '.join([t['Key'] for t in tag_set])}")
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        print(f"S3 metadata error [{error_code}]: {error_message}")
        raise
