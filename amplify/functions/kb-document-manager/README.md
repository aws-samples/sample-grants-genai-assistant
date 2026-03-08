# Knowledge Base Document Manager Lambda Function

This Lambda function handles document management operations for the Knowledge Base infrastructure.

## Operations

### 1. List Documents (`listDocuments`)

Lists all documents for the authenticated user with optional filtering.

**Input:**
```json
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
```

**Output:**
```json
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
      "processedAt": "2024-01-15T10:35:00Z",
      "vectorIndexed": true
    }
  ],
  "total": 42,
  "hasMore": true,
  "offset": 0,
  "limit": 20
}
```

**Filters:**
- `category`: Filter by document category
- `status`: Filter by processing status (uploading, processing, ready, failed)
- `dateRange`: Filter by upload date range

### 2. Delete Document (`deleteDocument`)

Deletes a document from S3, DynamoDB, and triggers vector cleanup.

**Input:**
```json
{
  "documentId": "uuid"
}
```

**Output:**
```json
{
  "success": true,
  "documentId": "uuid",
  "message": "Document deleted successfully"
}
```

**Deletion Process:**
1. Verifies user ownership of the document
2. Deletes the file from S3
3. Removes the metadata record from DynamoDB
4. Triggers Knowledge Base sync to remove vectors

### 3. Get Document Status (`getDocumentStatus` or `getDocument`)

Retrieves the current processing status of a document.

**Input:**
```json
{
  "documentId": "uuid"
}
```

**Output:**
```json
{
  "documentId": "uuid",
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "fileSize": 1024000,
  "status": "ready",
  "uploadDate": "2024-01-15T10:30:00Z",
  "processedAt": "2024-01-15T10:35:00Z",
  "vectorIndexed": true,
  "category": "research"
}
```

## Security

### User Authorization

All operations enforce user-level authorization:
- User identity is extracted from Cognito claims in the event
- Users can only access and manage their own documents
- Document ownership is verified before any operation

### Access Controls

- **List Documents**: Only returns documents owned by the authenticated user
- **Delete Document**: Verifies ownership before deletion
- **Get Status**: Verifies ownership before returning status

## Environment Variables

- `DOCUMENT_BUCKET`: S3 bucket name for document storage
- `DOCUMENT_TABLE`: DynamoDB table name for document metadata
- `KNOWLEDGE_BASE_ID`: Bedrock Knowledge Base ID for vector cleanup
- `DATA_SOURCE_ID`: Bedrock Data Source ID for sync operations

## Error Handling

### Common Errors

- **401 Unauthorized**: User identity not found in request
- **404 Not Found**: Document does not exist or user doesn't have access
- **500 Internal Server Error**: AWS service errors (S3, DynamoDB, Bedrock)

### Error Response Format

```json
{
  "statusCode": 400,
  "body": {
    "error": "Error message description"
  }
}
```

## Requirements Addressed

- **1.3**: List and view document operations
- **1.4**: Delete document operation
- **7.2**: User-scoped access filtering
- **7.3**: User ownership validation for deletions

## Testing

See `test_handler.py` for unit tests covering:
- List documents with various filters
- Delete document with ownership verification
- Get document status
- Error handling scenarios
- User authorization checks

## Integration

This function is called by GraphQL resolvers defined in `amplify/data/resource.ts`:
- `Query.listDocuments` → `listDocuments`
- `Mutation.deleteDocument` → `deleteDocument`
- `Query.getDocument` → `getDocumentStatus`

## Performance Considerations

- **Pagination**: Uses offset-based pagination for list operations
- **Query Optimization**: Uses DynamoDB query (not scan) with userId partition key
- **Batch Operations**: Handles multiple documents efficiently
- **Timeout**: 60 seconds to handle large deletions and sync operations
