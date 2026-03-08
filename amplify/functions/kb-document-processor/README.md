# Knowledge Base Document Processor Lambda Function

## Overview

This Lambda function is triggered by S3 events when documents are uploaded to the knowledge base document bucket. It orchestrates the document vectorization pipeline by triggering Bedrock Knowledge Base sync jobs and monitoring their completion.

## Functionality

### Core Features

1. **S3 Event Processing**: Receives S3 ObjectCreated events for new document uploads
2. **Status Management**: Updates document status in DynamoDB (processing → ready/failed)
3. **Bedrock Integration**: Triggers Knowledge Base ingestion jobs for document vectorization
4. **Job Monitoring**: Polls ingestion job status until completion
5. **Retry Logic**: Implements exponential backoff for transient failures
6. **Error Handling**: Comprehensive error handling with detailed logging

### Processing Flow

```
S3 Upload Event
    ↓
Extract Document ID from S3 key
    ↓
Update Status: "processing"
    ↓
Start Bedrock Ingestion Job (with retries)
    ↓
Poll Job Status (with timeout)
    ↓
Update Status: "ready" or "failed"
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `KNOWLEDGE_BASE_ID` | Bedrock Knowledge Base ID | `ABC123XYZ` |
| `DATA_SOURCE_ID` | Bedrock Data Source ID | `DEF456UVW` |
| `DOCUMENT_TABLE` | DynamoDB table name for document metadata | `DocumentMetadata-dev` |

## Configuration

### Retry Settings

- **MAX_RETRIES**: 3 attempts
- **INITIAL_BACKOFF**: 2 seconds
- **MAX_BACKOFF**: 60 seconds
- **BACKOFF_MULTIPLIER**: 2x per retry

### Sync Job Polling

- **SYNC_POLL_INTERVAL**: 5 seconds between status checks
- **SYNC_MAX_WAIT**: 300 seconds (5 minutes) maximum wait time

### Lambda Settings

- **Runtime**: Python 3.11
- **Timeout**: 900 seconds (15 minutes)
- **Memory**: 512 MB

## S3 Event Structure

The function expects S3 ObjectCreated events with the following structure:

```json
{
  "Records": [
    {
      "eventName": "ObjectCreated:Put",
      "s3": {
        "bucket": {
          "name": "kb-documents-123456789012-us-east-1"
        },
        "object": {
          "key": "user-abc123/doc-uuid/document.pdf",
          "size": 1024000
        }
      }
    }
  ]
}
```

## S3 Key Format

Documents must follow this naming convention:
```
user-{userId}/{documentId}/{filename}.{ext}
```

Example:
```
user-abc123def456/550e8400-e29b-41d4-a716-446655440000/research-paper.pdf
```

## DynamoDB Schema

The function updates the following fields in the document metadata table:

```python
{
  'documentId': 'string',        # Partition key
  'userId': 'string',            # GSI key
  'status': 'string',            # uploading | processing | ready | failed
  'vectorIndexed': bool,         # True when vectorization completes
  'errorMessage': 'string',      # Present only when status is 'failed'
  'updatedAt': 'string'          # ISO 8601 timestamp
}
```

## IAM Permissions Required

### Bedrock Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock-agent:StartIngestionJob",
    "bedrock-agent:GetIngestionJob",
    "bedrock-agent:ListIngestionJobs"
  ],
  "Resource": [
    "arn:aws:bedrock:*:*:knowledge-base/*"
  ]
}
```

### DynamoDB Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:UpdateItem"
  ],
  "Resource": [
    "arn:aws:dynamodb:*:*:table/DocumentMetadata-*"
  ]
}
```

### S3 Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject"
  ],
  "Resource": [
    "arn:aws:s3:::kb-documents-*/*"
  ]
}
```

## Error Handling

### Retry Scenarios

The function retries the following operations:
- Starting Bedrock ingestion jobs (transient API errors)

### Non-Retry Scenarios

The function does NOT retry:
- Invalid S3 event structure
- Missing document ID in S3 key
- DynamoDB update failures (logged but processing continues)

### Timeout Handling

If an ingestion job doesn't complete within `SYNC_MAX_WAIT`:
- Document status remains "processing"
- Error message is logged
- A separate monitoring process should handle long-running jobs

## Monitoring and Logging

### CloudWatch Logs

All operations are logged with structured information:
- S3 event details
- Document ID extraction
- Ingestion job status updates
- Error messages with stack traces

### Key Metrics to Monitor

1. **Invocation Count**: Number of documents processed
2. **Error Rate**: Failed processing attempts
3. **Duration**: Time to complete vectorization
4. **Throttles**: Bedrock API rate limiting

### Sample Log Output

```
Processing document: s3://kb-documents-123/user-abc/doc-uuid/file.pdf
Document ID: doc-uuid
Started ingestion job: job-xyz789
Ingestion job job-xyz789 status: IN_PROGRESS
Ingestion job job-xyz789 status: COMPLETE
Ingestion statistics: {"numberOfDocumentsScanned": 1, "numberOfDocumentsIndexed": 1}
Updated document doc-uuid status to: ready
```

## Testing

### Unit Testing

Run unit tests with:
```bash
python -m pytest test_handler.py -v
```

### Integration Testing

Test with a sample S3 event:
```bash
python test_handler.py
```

### Manual Testing

1. Upload a document to S3 using the upload Lambda
2. Check CloudWatch Logs for this function
3. Verify document status in DynamoDB
4. Query the Knowledge Base to confirm vectorization

## Troubleshooting

### Common Issues

**Issue**: Ingestion job fails immediately
- **Cause**: Invalid document format or S3 permissions
- **Solution**: Check Bedrock Knowledge Base logs and S3 bucket policies

**Issue**: Timeout errors
- **Cause**: Large documents taking too long to process
- **Solution**: Increase `SYNC_MAX_WAIT` or implement async monitoring

**Issue**: DynamoDB update fails
- **Cause**: Incorrect table name or missing permissions
- **Solution**: Verify `DOCUMENT_TABLE` environment variable and IAM role

**Issue**: Document ID extraction fails
- **Cause**: Incorrect S3 key format
- **Solution**: Ensure upload Lambda creates keys in correct format

## Requirements Mapping

This function implements the following requirements:

- **2.1**: Automatic vectorization trigger on S3 upload
- **2.2**: Uses Bedrock embeddings for vectorization
- **2.3**: Handles document chunking (via Bedrock Knowledge Base)
- **2.4**: Updates document status to "indexed" on completion
- **2.5**: Implements retry logic with exponential backoff
- **8.2**: Updates status to "processing"
- **8.3**: Updates status to "ready" on success
- **8.4**: Sets status to "failed" with error details on failure

## Future Enhancements

1. **Async Job Monitoring**: Use Step Functions for long-running jobs
2. **Batch Processing**: Process multiple documents in parallel
3. **Custom Chunking**: Implement document-type-specific chunking strategies
4. **Metadata Extraction**: Extract and index document metadata
5. **Notification System**: Send SNS notifications on completion/failure
