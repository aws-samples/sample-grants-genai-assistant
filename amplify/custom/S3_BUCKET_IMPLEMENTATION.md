# S3 Document Storage Bucket Implementation

## Overview

The S3 document storage bucket has been successfully implemented in the Knowledge Base Infrastructure stack. This bucket serves as the primary storage location for user-uploaded documents that will be vectorized and indexed by Bedrock Knowledge Base.

## Features Implemented

### 1. Encryption and Security
- **Server-side encryption**: S3-managed encryption (SSE-S3) enabled
- **Block public access**: All public access blocked
- **Enforce SSL**: HTTPS required for all connections
- **Versioning**: Enabled to protect against accidental deletions

### 2. User-Scoped Access Patterns
- **Bucket naming**: `kb-documents-{account}-{region}` for uniqueness
- **User prefixes**: Documents stored under `user-{userId}/` paths
- **Bucket policy**: Enforces user-scoped access with IAM conditions
- **CORS configuration**: Allows direct browser uploads via presigned URLs

### 3. S3 Event Notifications
- **Automatic triggers**: S3 events trigger document processing Lambda
- **Supported formats**: PDF, DOCX, DOC, TXT, MD files
- **Prefix filtering**: Only processes files under `user-` prefixes
- **Method**: `addDocumentProcessingTrigger()` for easy Lambda integration

### 4. Lifecycle Policies for Cost Optimization
- **Current objects**: Transition to Intelligent-Tiering after 90 days
- **Old versions**: Transition to Intelligent-Tiering after 30 days
- **Version cleanup**: Delete old versions after 90 days
- **Cost savings**: Automatic optimization based on access patterns

### 5. IAM Policies for Lambda Access
Three helper methods for granting Lambda permissions:

#### `grantDocumentUpload(grantee)`
Grants read and write permissions for document upload Lambda functions.

#### `grantDocumentManagement(grantee)`
Grants full read/write/delete permissions for document management Lambda functions.

#### `addDocumentProcessingTrigger(processorFunction)`
Sets up S3 event notifications to trigger the document processor Lambda.

## Usage Example

```typescript
import { KnowledgeBaseStack } from './custom/knowledge-base-stack';

// Create the stack
const kbStack = new KnowledgeBaseStack(backend, 'KnowledgeBase');

// Grant upload Lambda access to bucket
kbStack.grantDocumentUpload(uploadLambda);

// Grant management Lambda access to bucket
kbStack.grantDocumentManagement(managementLambda);

// Set up S3 event trigger for processing
kbStack.addDocumentProcessingTrigger(processorLambda);
```

## Bedrock Integration

The S3 bucket is automatically integrated with Bedrock Knowledge Base:

- **Bedrock role**: Has read access to the bucket for document ingestion
- **Embedding permissions**: Bedrock role can invoke Titan embedding models
- **Automatic sync**: Documents uploaded to S3 trigger vectorization pipeline

## CloudFormation Outputs

The following outputs are exported for cross-stack references:

- `DocumentBucketName`: The bucket name
- `DocumentBucketArn`: The bucket ARN

## Security Considerations

1. **Data protection**: Bucket has `RemovalPolicy.RETAIN` to prevent accidental data loss
2. **User isolation**: Bucket policy enforces user-scoped access patterns
3. **Encryption**: All data encrypted at rest with S3-managed keys
4. **SSL enforcement**: All connections must use HTTPS
5. **No public access**: All public access is blocked

## Cost Optimization

The lifecycle policies implement a tiered storage strategy:

1. **Hot data** (0-90 days): Standard S3 storage
2. **Warm data** (90+ days): Intelligent-Tiering (automatic optimization)
3. **Old versions** (30-90 days): Intelligent-Tiering
4. **Expired versions** (90+ days): Automatically deleted

This approach balances accessibility with cost efficiency.

## Next Steps

To complete the document storage pipeline:

1. **Task 3**: Set up Bedrock Knowledge Base resource
2. **Task 5**: Implement document upload Lambda function
3. **Task 6**: Implement document processing Lambda function
4. **Task 8**: Implement document management Lambda function

## Requirements Satisfied

This implementation satisfies the following requirements:

- **1.1**: Document storage in S3 with proper metadata
- **1.2**: Support for PDF, Word, and text file formats
- **7.1**: User-specific prefixes in S3
- **7.2**: User-scoped access filtering
- **7.3**: User ownership validation for deletions
