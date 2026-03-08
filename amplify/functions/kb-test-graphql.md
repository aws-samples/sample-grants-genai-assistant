# Knowledge Base GraphQL API Testing Guide

## Overview
This guide provides sample GraphQL queries and mutations for testing the Knowledge Base infrastructure.

## Prerequisites
- Amplify backend deployed (`npx ampx sandbox`)
- Valid Cognito user authentication token
- GraphQL endpoint URL from Amplify outputs

## Authentication
All requests require a valid Cognito user pool token in the Authorization header:
```
Authorization: Bearer <cognito-token>
```

## 1. Upload Document

### Mutation
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

### Variables
```json
{
  "input": {
    "filename": "research-paper.pdf",
    "contentType": "application/pdf",
    "fileSize": 2048000,
    "category": "research"
  }
}
```

### Expected Response
```json
{
  "data": {
    "uploadDocument": {
      "documentId": "doc-uuid-here",
      "uploadUrl": "https://s3.amazonaws.com/...",
      "status": "uploading",
      "s3Key": "user-{userId}/doc-uuid-here.pdf",
      "s3Bucket": "kb-documents-{account}-{region}",
      "expiresIn": 3600
    }
  }
}
```

### Next Steps
1. Use the `uploadUrl` to upload the file via HTTP PUT
2. Monitor document status via `getDocument` query
3. Wait for status to change from "uploading" → "processing" → "ready"

## 2. Search Documents

### Query
```graphql
query SearchDocuments(
  $query: String!
  $filters: SearchFilters
  $limit: Int
  $offset: Int
) {
  searchDocuments(
    query: $query
    filters: $filters
    limit: $limit
    offset: $offset
  ) {
    results {
      documentId
      filename
      excerpt
      relevanceScore
      metadata
    }
    total
  }
}
```

### Variables
```json
{
  "query": "machine learning algorithms for natural language processing",
  "filters": {
    "category": "research",
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-12-31T23:59:59Z"
    }
  },
  "limit": 10,
  "offset": 0
}
```

### Expected Response
```json
{
  "data": {
    "searchDocuments": {
      "results": [
        {
          "documentId": "doc-uuid-1",
          "filename": "ml-nlp-paper.pdf",
          "excerpt": "...machine learning algorithms are widely used in natural language processing...",
          "relevanceScore": 0.92,
          "metadata": {
            "category": "research",
            "uploadDate": "2024-03-15T10:30:00Z"
          }
        }
      ],
      "total": 5
    }
  }
}
```

## 3. List Documents

### Query
```graphql
query ListDocuments(
  $filters: SearchFilters
  $limit: Int
  $offset: Int
) {
  listDocuments(
    filters: $filters
    limit: $limit
    offset: $offset
  )
}
```

### Variables
```json
{
  "filters": {
    "category": "research"
  },
  "limit": 20,
  "offset": 0
}
```

### Expected Response
```json
{
  "data": {
    "listDocuments": [
      {
        "documentId": "doc-uuid-1",
        "userId": "user-123",
        "filename": "research-paper.pdf",
        "contentType": "application/pdf",
        "fileSize": 2048000,
        "category": "research",
        "status": "ready",
        "uploadDate": "2024-03-15T10:30:00Z",
        "vectorIndexed": true
      }
    ]
  }
}
```

## 4. Get Document

### Query
```graphql
query GetDocument($documentId: String!) {
  getDocument(documentId: $documentId)
}
```

### Variables
```json
{
  "documentId": "doc-uuid-here"
}
```

### Expected Response
```json
{
  "data": {
    "getDocument": {
      "documentId": "doc-uuid-here",
      "userId": "user-123",
      "filename": "research-paper.pdf",
      "contentType": "application/pdf",
      "fileSize": 2048000,
      "category": "research",
      "status": "ready",
      "uploadDate": "2024-03-15T10:30:00Z",
      "processedAt": "2024-03-15T10:32:00Z",
      "vectorIndexed": true,
      "s3Key": "user-user-123/doc-uuid-here.pdf"
    }
  }
}
```

## 5. Delete Document

### Mutation
```graphql
mutation DeleteDocument($documentId: String!) {
  deleteDocument(documentId: $documentId)
}
```

### Variables
```json
{
  "documentId": "doc-uuid-here"
}
```

### Expected Response
```json
{
  "data": {
    "deleteDocument": true
  }
}
```

## Error Handling

### Unauthorized Access
```json
{
  "errors": [
    {
      "message": "Unauthorized",
      "errorType": "Unauthorized"
    }
  ]
}
```

### Document Not Found
```json
{
  "errors": [
    {
      "message": "Document not found or access denied",
      "errorType": "NotFound"
    }
  ]
}
```

### Invalid Input
```json
{
  "errors": [
    {
      "message": "Invalid file type. Supported types: pdf, docx, doc, txt, md",
      "errorType": "ValidationError"
    }
  ]
}
```

## Testing with curl

### Get Cognito Token
```bash
# Use AWS Amplify Auth to get token
# Or use AWS CLI:
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <client-id> \
  --auth-parameters USERNAME=<email>,PASSWORD=<password>
```

### Upload Document Request
```bash
curl -X POST https://<api-endpoint>/graphql \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UploadDocument($input: UploadDocumentInput!) { uploadDocument(input: $input) { documentId uploadUrl status } }",
    "variables": {
      "input": {
        "filename": "test.pdf",
        "contentType": "application/pdf",
        "fileSize": 1024000
      }
    }
  }'
```

### Search Documents Request
```bash
curl -X POST https://<api-endpoint>/graphql \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query SearchDocuments($query: String!) { searchDocuments(query: $query) { results { documentId filename excerpt relevanceScore } total } }",
    "variables": {
      "query": "machine learning"
    }
  }'
```

## Integration Testing Checklist

- [ ] Upload document and verify presigned URL is generated
- [ ] Upload file to S3 using presigned URL
- [ ] Verify document status changes: uploading → processing → ready
- [ ] Search for document using semantic query
- [ ] Verify search results include uploaded document
- [ ] List all documents and verify uploaded document appears
- [ ] Get specific document by ID
- [ ] Delete document and verify it's removed from S3 and DynamoDB
- [ ] Verify deleted document no longer appears in search results
- [ ] Test user isolation (user A cannot access user B's documents)
- [ ] Test error handling for invalid inputs
- [ ] Test authorization (unauthenticated requests are rejected)

## Performance Testing

### Load Test Parameters
- Concurrent uploads: 10-50 users
- Document sizes: 100KB - 10MB
- Search queries: 100-1000 per minute
- Expected latency:
  - Upload URL generation: < 500ms
  - Search query: < 2s
  - List documents: < 1s
  - Delete document: < 1s

## Monitoring

### CloudWatch Metrics to Monitor
- Lambda invocation count
- Lambda error rate
- Lambda duration
- DynamoDB read/write capacity
- S3 request count
- Bedrock API calls
- OpenSearch query latency

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/kb-*`
- API Gateway logs: `/aws/apigateway/*`
- OpenSearch slow query logs

## Troubleshooting

### Document Stuck in "processing" Status
1. Check Lambda function logs for kb-document-processor
2. Verify Bedrock Knowledge Base sync job status
3. Check S3 event notifications are configured
4. Verify IAM permissions for Bedrock role

### Search Returns No Results
1. Verify document status is "ready"
2. Check vectorIndexed flag is true
3. Verify OpenSearch index exists
4. Test with simpler query terms
5. Check user ID filtering is correct

### Upload Fails
1. Verify presigned URL hasn't expired
2. Check S3 bucket permissions
3. Verify file size is within limits
4. Check content type is supported
5. Verify user authentication token is valid

## Next Steps

After successful testing:
1. Implement React UI components (Tasks 11-13)
2. Add real-time status updates (Task 14)
3. Implement comprehensive error handling (Task 15)
4. Set up monitoring and alerts (Task 17)
5. Perform load testing (Task 19)
