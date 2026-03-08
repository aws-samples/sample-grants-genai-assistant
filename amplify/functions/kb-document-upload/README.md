# Knowledge Base Document Upload Lambda Function

## Overview

This Lambda function handles document upload requests for the Knowledge Base infrastructure. It generates presigned S3 URLs for direct client uploads and creates document metadata records in DynamoDB.

## Features

### File Validation (Requirement 1.2, 1.5)
- **Supported file types:**
  - PDF (`.pdf`)
  - Microsoft Word (`.doc`, `.docx`)
  - Plain text (`.txt`)
  - Markdown (`.md`)

- **Size limits:**
  - Minimum: 1 byte
  - Maximum: 50 MB

- **Security checks:**
  - Content type validation
  - File extension matching
  - Path traversal prevention
  - Filename sanitization

### User Authentication (Requirement 7.1, 7.2, 7.3)
- Extracts user identity from Cognito JWT tokens
- Enforces user-scoped S3 prefixes (`user-{userId}/`)
- Validates user ownership for all operations
- Returns 401 Unauthorized for missing authentication

### Presigned URL Generation (Requirement 1.1)
- Generates secure S3 presigned URLs for direct uploads
- Default expiration: 1 hour (configurable)
- Includes content type enforcement
- Uses PUT method for uploads

### Document Metadata (Requirement 1.1, 7.1)
- Creates DynamoDB records with:
  - Unique document ID (UUID)
  - User ID (Cognito sub)
  - File metadata (name, type, size)
  - S3 location (bucket, key)
  - Status tracking (uploading → processing → ready/failed)
  - Upload timestamp
  - Optional category
  - TTL for automatic cleanup (30 days)

## API

### GraphQL Mutation

```graphql
mutation UploadDocument($input: UploadDocumentInput!) {
  uploadDocument(input: $input) {
    documentId
    uploadUrl
    status
    s3Key
    s3Bucket
    expiresIn
  }
}
```

### Input

```typescript
{
  filename: string;      // Original filename (e.g., "research-paper.pdf")
  contentType: string;   // MIME type (e.g., "application/pdf")
  fileSize: number;      // File size in bytes
  category?: string;     // Optional category (e.g., "research", "grants")
}
```

### Output

```typescript
{
  documentId: string;    // Unique document identifier
  uploadUrl: string;     // Presigned S3 URL for upload
  status: string;        // Always "uploading" initially
  s3Key: string;         // S3 object key
  s3Bucket: string;      // S3 bucket name
  expiresIn: number;     // URL expiration in seconds
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DOCUMENT_BUCKET` | S3 bucket for document storage | (required) |
| `DOCUMENT_TABLE` | DynamoDB table for metadata | (required) |
| `PRESIGNED_URL_EXPIRATION` | URL expiration in seconds | 3600 (1 hour) |

## Error Handling

### Client Errors (4xx)

- **400 Bad Request:**
  - Missing required fields
  - Invalid file type
  - File too large/small
  - Invalid filename
  - Path traversal attempt

- **401 Unauthorized:**
  - Missing user identity
  - Invalid authentication token

### Server Errors (5xx)

- **500 Internal Server Error:**
  - S3 presigned URL generation failure
  - DynamoDB write failure
  - Unexpected exceptions

## Security

### Access Control
- User authentication required (Cognito)
- User-scoped S3 prefixes enforce isolation
- Presigned URLs are time-limited
- S3 bucket policies enforce user ownership

### Input Validation
- Content type whitelist
- File size limits
- Filename sanitization
- Path traversal prevention

### Data Protection
- S3 bucket encryption at rest
- TLS for data in transit
- DynamoDB encryption
- Presigned URLs use HTTPS

## Usage Example

### Client-Side Upload Flow

```typescript
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

async function uploadDocument(file: File) {
  // 1. Request upload URL
  const { data } = await client.graphql({
    query: mutations.uploadDocument,
    variables: {
      input: {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        category: 'research'
      }
    }
  });
  
  const { uploadUrl, documentId } = data.uploadDocument;
  
  // 2. Upload file directly to S3
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  // 3. Document processing will be triggered automatically
  console.log(`Document uploaded: ${documentId}`);
  
  return documentId;
}
```

## Testing

Run unit tests:

```bash
cd amplify/functions/kb-document-upload
python -m pytest test_handler.py -v
```

Test coverage includes:
- User identity extraction
- File validation (all scenarios)
- Presigned URL generation
- DynamoDB metadata creation
- Error handling
- Response formatting

## Integration

### DynamoDB Schema

The function writes to the `DocumentMetadata` table with this structure:

```typescript
{
  userId: string;           // Partition key
  documentId: string;       // Sort key
  filename: string;
  contentType: string;
  fileSize: number;
  s3Key: string;
  s3Bucket: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  uploadDate: string;       // ISO 8601 timestamp
  vectorIndexed: boolean;
  category?: string;
  ttl: number;             // Unix timestamp for cleanup
}
```

### S3 Key Structure

Documents are stored with user-scoped prefixes:

```
user-{userId}/{documentId}/{filename}
```

Example:
```
user-abc123/550e8400-e29b-41d4-a716-446655440000/research-paper.pdf
```

## Next Steps

After upload, the document processing pipeline:

1. **S3 Event Trigger** → Document Processor Lambda (Task 6)
2. **Bedrock Knowledge Base Sync** → Vectorization
3. **Status Update** → DynamoDB (processing → ready)
4. **GraphQL Subscription** → Real-time UI update

## Requirements Satisfied

- ✅ **1.1:** Store documents in S3 with proper metadata
- ✅ **1.2:** Support PDF, Word, and text file formats
- ✅ **1.5:** Validate file size limits and content types
- ✅ **7.1:** Store documents with user-specific prefixes
- ✅ **7.2:** Filter results to authenticated user's documents
- ✅ **7.3:** Only allow users to manage their own documents

## Monitoring

Key metrics to monitor:
- Upload request rate
- Presigned URL generation latency
- DynamoDB write latency
- Error rate by type
- File size distribution

CloudWatch Logs include:
- User ID and email for each request
- Document ID and S3 key
- Validation errors
- S3/DynamoDB operation results
