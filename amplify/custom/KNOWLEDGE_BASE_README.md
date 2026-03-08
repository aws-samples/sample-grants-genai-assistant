# Knowledge Base Infrastructure

This directory contains the OpenSearch Serverless infrastructure for the general-purpose Knowledge Base system.

## Overview

The Knowledge Base infrastructure provides:
- **OpenSearch Serverless Collection**: Vector search collection for document embeddings
- **Bedrock Integration**: IAM roles and permissions for Bedrock Knowledge Base
- **Vector Index Schema**: Bedrock-compatible 1536-dimension HNSW index
- **Security Policies**: Encryption, network, and data access policies

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Knowledge Base Stack                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     OpenSearch Serverless Collection                  │   │
│  │  - Type: VECTORSEARCH                                 │   │
│  │  - Name: knowledge-base-collection                    │   │
│  │  - Encryption: AWS-owned key                          │   │
│  │  - Network: Public (IAM-protected)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     Vector Index (Bedrock-compatible)                 │   │
│  │  - Dimensions: 1536 (Titan Embeddings)                │   │
│  │  - Algorithm: HNSW (cosine similarity)                │   │
│  │  - Metadata: userId, category, uploadDate, filename   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     Bedrock Execution Role                            │   │
│  │  - Service: bedrock.amazonaws.com                     │   │
│  │  - Permissions: OpenSearch access                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Files

### `knowledge-base-stack.ts`
Main CDK construct that creates:
- OpenSearch Serverless collection
- Security policies (encryption, network, data access)
- Bedrock execution role
- CloudFormation outputs

### `knowledge-base-index-config.ts`
Vector index configuration and utilities:
- Bedrock-compatible index mapping
- Index creation scripts (Python, curl)
- Helper functions for index management

## Deployment

### 1. Deploy the Stack

The Knowledge Base stack is automatically deployed as part of the Amplify backend:

```bash
npx ampx sandbox
```

This creates:
- OpenSearch Serverless collection
- IAM roles and policies
- CloudFormation outputs

### 2. Create the Vector Index

After the collection is deployed, create the vector index:

#### Option A: Using Python Script

```bash
# Install dependencies
pip install boto3 opensearch-py requests-aws4auth

# Get the collection endpoint from CloudFormation outputs
COLLECTION_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name <stack-name> \
  --query 'Stacks[0].Outputs[?OutputKey==`CollectionEndpoint`].OutputValue' \
  --output text)

# Run the index creation script
python scripts/create-kb-index.py --endpoint $COLLECTION_ENDPOINT
```

#### Option B: Using awscurl

```bash
# Install awscurl
pip install awscurl

# Create index
awscurl --service aoss --region us-east-1 \
  -X PUT \
  "${COLLECTION_ENDPOINT}/bedrock-knowledge-base-default-index" \
  -H "Content-Type: application/json" \
  -d @index-mapping.json
```

#### Option C: Using Lambda (Automated)

A Lambda function can be created to automatically initialize the index on deployment. This will be implemented in a later task.

### 3. Verify the Index

```bash
# List all indices
awscurl --service aoss --region us-east-1 \
  "${COLLECTION_ENDPOINT}/_cat/indices?v"

# Check index mapping
awscurl --service aoss --region us-east-1 \
  "${COLLECTION_ENDPOINT}/bedrock-knowledge-base-default-index/_mapping"
```

## Usage

### Accessing from Lambda Functions

```typescript
// In backend.ts
import { knowledgeBase } from './backend';

// Grant permissions to Lambda
knowledgeBaseStack.grantReadWrite(myLambdaFunction.resources.lambda);

// Add environment variables
myLambdaFunction.addEnvironment('OPENSEARCH_ENDPOINT', knowledgeBase.collectionEndpoint);
myLambdaFunction.addEnvironment('OPENSEARCH_COLLECTION_ARN', knowledgeBase.collectionArn);
```

### Python Lambda Example

```python
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
import os

# Get collection endpoint from environment
endpoint = os.environ['OPENSEARCH_ENDPOINT']

# Create OpenSearch client with IAM authentication
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, 'us-east-1', 'aoss')

client = OpenSearch(
    hosts=[{'host': endpoint.replace('https://', ''), 'port': 443}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

# Perform vector search
response = client.search(
    index='bedrock-knowledge-base-default-index',
    body={
        'size': 10,
        'query': {
            'knn': {
                'bedrock-knowledge-base-default-vector': {
                    'vector': embedding_vector,
                    'k': 10
                }
            }
        },
        'filter': {
            'term': {'userId': 'user-123'}
        }
    }
)
```

## Vector Index Schema

The index uses a Bedrock-compatible schema:

```json
{
  "mappings": {
    "properties": {
      "bedrock-knowledge-base-default-vector": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "faiss"
        }
      },
      "AMAZON_BEDROCK_METADATA": {
        "type": "text",
        "index": false
      },
      "AMAZON_BEDROCK_TEXT_CHUNK": {
        "type": "text"
      },
      "userId": { "type": "keyword" },
      "category": { "type": "keyword" },
      "filename": { "type": "keyword" },
      "uploadDate": { "type": "date" },
      "documentId": { "type": "keyword" }
    }
  }
}
```

## CloudFormation Outputs

The stack exports the following outputs:

- `CollectionEndpoint`: OpenSearch collection HTTPS endpoint
- `CollectionArn`: ARN of the OpenSearch collection
- `BedrockRoleArn`: ARN of the Bedrock execution role
- `CollectionName`: Name of the collection

## Security

### Encryption
- Data at rest: AWS-owned encryption key
- Data in transit: TLS 1.2+

### Network Access
- Public endpoint (protected by IAM)
- No VPC required (serverless)

### IAM Permissions
- Bedrock role: Full OpenSearch access
- Lambda functions: Granted via `grantReadWrite()` or `grantRead()`
- Root account: Full access for administration

## Cost Considerations

OpenSearch Serverless pricing:
- **OCU (OpenSearch Compute Units)**: $0.24/hour per OCU
- **Storage**: $0.024/GB-month
- **Data transfer**: Standard AWS rates

Minimum cost: ~$350/month (2 OCUs minimum for vector search)

## Troubleshooting

### Collection not accessible
- Check IAM permissions
- Verify data access policy includes your principal
- Ensure network policy allows public access

### Index creation fails
- Verify collection is fully deployed (can take 5-10 minutes)
- Check AWS credentials have OpenSearch permissions
- Ensure index name matches Bedrock requirements

### Vector search not working
- Verify index mapping includes knn_vector field
- Check vector dimensions match (1536 for Titan)
- Ensure HNSW algorithm is configured correctly

## Next Steps

1. ✅ Deploy OpenSearch Serverless collection
2. ⏳ Create vector index (manual or automated)
3. ⏳ Implement S3 document storage (Task 2)
4. ⏳ Set up Bedrock Knowledge Base (Task 3)
5. ⏳ Create Lambda functions for document processing (Tasks 5-8)

## References

- [OpenSearch Serverless Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless.html)
- [Bedrock Knowledge Base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [Vector Search with HNSW](https://opensearch.org/docs/latest/search-plugins/knn/knn-index/)
