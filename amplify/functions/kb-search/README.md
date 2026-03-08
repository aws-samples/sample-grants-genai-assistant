# Knowledge Base Semantic Search Lambda Function

## Overview

This Lambda function performs semantic search across vectorized documents stored in the Bedrock Knowledge Base. It provides natural language query capabilities with metadata filtering and user-scoped access control.

## Features

- **Semantic Search**: Natural language queries using Bedrock Knowledge Base Retrieve API
- **User Isolation**: Automatically filters results to only show authenticated user's documents
- **Metadata Filtering**: Support for category and date range filters
- **Pagination**: Configurable limit and offset for result sets
- **Relevance Scoring**: Returns relevance scores for each result
- **Excerpt Generation**: Provides text excerpts from matching documents
- **Hybrid Search**: Combines semantic vector search with keyword matching

## Requirements Addressed

- **4.2**: Metadata filtering (category, date, author)
- **4.3**: Ranked results with relevance scores
- **5.1**: Natural language query support
- **5.2**: Document excerpts and relevance scores
- **5.3**: Metadata-based filters
- **5.4**: Pagination support
- **5.5**: Empty result handling
- **7.2**: User-scoped access control

## Input Schema

```json
{
  "query": "natural language search query",
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

### Parameters

- **query** (required): Natural language search query (max 1000 characters)
- **filters** (optional): Metadata filters
  - **category** (optional): Filter by document category
  - **dateRange** (optional): Filter by upload date range
    - **start** (optional): Start date (ISO 8601 format)
    - **end** (optional): End date (ISO 8601 format)
- **limit** (optional): Maximum number of results (default: 10, max: 100)
- **offset** (optional): Number of results to skip (default: 0)

## Output Schema

```json
{
  "results": [
    {
      "documentId": "uuid",
      "filename": "document.pdf",
      "excerpt": "relevant text excerpt...",
      "relevanceScore": 0.85,
      "metadata": {
        "category": "research",
        "uploadDate": "2024-01-15T10:30:00Z",
        "contentType": "application/pdf",
        "filename": "document.pdf"
      },
      "contentType": "application/pdf",
      "fileSize": 1024000,
      "uploadDate": "2024-01-15T10:30:00Z",
      "category": "research"
    }
  ],
  "total": 42,
  "hasMore": true,
  "offset": 0,
  "limit": 10
}
```

### Response Fields

- **results**: Array of search results
  - **documentId**: Unique document identifier
  - **filename**: Original filename
  - **excerpt**: Relevant text excerpt (max 500 characters)
  - **relevanceScore**: Relevance score (0.0 to 1.0)
  - **metadata**: Document metadata
  - **contentType**: MIME type
  - **fileSize**: File size in bytes
  - **uploadDate**: Upload timestamp
  - **category**: Document category (if set)
- **total**: Total number of matching results
- **hasMore**: Whether more results are available
- **offset**: Current offset
- **limit**: Current limit

## Environment Variables

- **KNOWLEDGE_BASE_ID**: Bedrock Knowledge Base ID (required)
- **DOCUMENT_TABLE**: DynamoDB table name for document metadata (required)

## IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:Retrieve",
        "bedrock:RetrieveAndGenerate"
      ],
      "Resource": "arn:aws:bedrock:*:*:knowledge-base/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/DocumentMetadata"
    }
  ]
}
```

## Search Behavior

### User Isolation

All searches are automatically scoped to the authenticated user's documents. The user ID is extracted from the Cognito identity and used to filter results. This ensures users can only search their own documents.

### Metadata Filtering

The function builds a metadata filter that combines:
1. **User ID filter** (always applied for security)
2. **Category filter** (if provided)
3. **Date range filter** (if provided)

Filters are combined with AND logic.

### Hybrid Search

The function uses Bedrock's HYBRID search mode, which combines:
- **Semantic search**: Vector similarity using embeddings
- **Keyword search**: Traditional text matching

This provides better results than pure semantic search alone.

### Pagination

Results are paginated using limit and offset:
- Fetch `limit + offset` results from Bedrock
- Skip first `offset` results
- Return next `limit` results
- Set `hasMore` flag if more results available

### Excerpt Generation

Text excerpts are:
- Truncated to 500 characters maximum
- Truncated at word boundaries (no partial words)
- Appended with "..." if truncated

## Error Handling

### Client Errors (4xx)

- **400 Bad Request**: Missing or invalid query, query too long
- **401 Unauthorized**: User identity not found

### Server Errors (5xx)

- **500 Internal Server Error**: Bedrock API errors, DynamoDB errors, unexpected errors

All errors are logged to CloudWatch with full stack traces.

## Performance Considerations

### Timeout

- Function timeout: 30 seconds
- Bedrock API typically responds in 1-3 seconds
- DynamoDB enrichment adds ~100ms per result

### Memory

- Allocated: 512 MB
- Typical usage: 128-256 MB
- Scales with result set size

### Cold Start

- Cold start: ~2-3 seconds
- Warm invocation: ~1-2 seconds
- Consider provisioned concurrency for latency-sensitive applications

## Testing

### Unit Tests

Run unit tests:
```bash
python -m pytest test_handler.py -v
```

### Integration Tests

Test with real Bedrock Knowledge Base:
```bash
python test_handler.py
```

### Manual Testing

Invoke function with test event:
```bash
aws lambda invoke \
  --function-name kb-search \
  --payload file://test_event.json \
  response.json
```

## Monitoring

### CloudWatch Metrics

- **Invocations**: Number of search requests
- **Duration**: Search latency
- **Errors**: Failed searches
- **Throttles**: Rate limit hits

### CloudWatch Logs

All logs include:
- User ID and email
- Search query
- Metadata filters
- Result count
- Errors with stack traces

### Custom Metrics

Consider adding:
- Average relevance score
- Empty result rate
- Query length distribution
- Filter usage patterns

## Security

### Authentication

- Requires Cognito authentication
- User identity extracted from event context
- No anonymous searches allowed

### Authorization

- User can only search own documents
- User ID filter always applied
- Cannot bypass user isolation

### Data Protection

- No sensitive data in logs
- User IDs logged for audit trail
- Query text logged for debugging

## Troubleshooting

### No Results Returned

1. Check if documents are indexed (status = 'ready')
2. Verify user ID matches document owner
3. Check metadata filters aren't too restrictive
4. Try simpler query terms

### Low Relevance Scores

1. Check document quality and content
2. Verify embedding model consistency
3. Consider query reformulation
3. Try hybrid search mode

### Timeout Errors

1. Reduce result limit
2. Simplify metadata filters
3. Check Bedrock API latency
4. Increase function timeout

### Permission Errors

1. Verify KNOWLEDGE_BASE_ID is set
2. Check IAM role has Bedrock permissions
3. Verify Knowledge Base exists
4. Check data access policies

## Future Enhancements

- [ ] Query expansion and reformulation
- [ ] Result caching for common queries
- [ ] Advanced filtering (file type, size)
- [ ] Faceted search results
- [ ] Query suggestions and autocomplete
- [ ] Search analytics and insights
