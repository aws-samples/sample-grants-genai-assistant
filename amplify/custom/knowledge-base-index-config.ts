/**
 * OpenSearch Vector Index Configuration for Bedrock Knowledge Base
 * 
 * This configuration creates a Bedrock-compatible vector index with:
 * - 1536-dimension vectors (Amazon Titan Embeddings)
 * - HNSW algorithm for efficient similarity search
 * - Metadata fields for filtering (userId, category, uploadDate, filename)
 * 
 * Note: The index must be created after the OpenSearch collection is deployed.
 * This can be done via a Lambda function or manually using the OpenSearch API.
 */

export interface VectorIndexConfig {
  indexName: string;
  vectorDimension: number;
  vectorFieldName: string;
  metadataFields: string[];
}

/**
 * Get the Bedrock-compatible vector index configuration
 */
export function getBedrockVectorIndexConfig(): VectorIndexConfig {
  return {
    indexName: 'bedrock-knowledge-base-default-index',
    vectorDimension: 1536, // Amazon Titan Embeddings dimension
    vectorFieldName: 'bedrock-knowledge-base-default-vector',
    metadataFields: ['userId', 'category', 'uploadDate', 'filename']
  };
}

/**
 * Generate the OpenSearch index mapping for Bedrock Knowledge Base
 * 
 * This mapping is compatible with Bedrock's automatic document processing
 * and follows the required naming conventions.
 */
export function getBedrockIndexMapping() {
  const config = getBedrockVectorIndexConfig();
  
  return {
    settings: {
      index: {
        knn: true,
        'knn.algo_param.ef_search': 512,
        number_of_shards: 2,
        number_of_replicas: 0
      }
    },
    mappings: {
      properties: {
        // Bedrock-required vector field (exact name required)
        [config.vectorFieldName]: {
          type: 'knn_vector',
          dimension: config.vectorDimension,
          method: {
            name: 'hnsw',
            space_type: 'cosinesimil',
            engine: 'faiss',
            parameters: {
              ef_construction: 512,
              m: 16
            }
          }
        },
        // Bedrock-required metadata field
        'AMAZON_BEDROCK_METADATA': {
          type: 'text',
          index: false
        },
        // Bedrock-required text chunk field
        'AMAZON_BEDROCK_TEXT_CHUNK': {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256
            }
          }
        },
        // Custom metadata fields for filtering
        userId: {
          type: 'keyword'
        },
        category: {
          type: 'keyword'
        },
        filename: {
          type: 'keyword'
        },
        uploadDate: {
          type: 'date'
        },
        documentId: {
          type: 'keyword'
        },
        fileSize: {
          type: 'long'
        },
        contentType: {
          type: 'keyword'
        }
      }
    }
  };
}

/**
 * Generate the Python script to create the index
 * This can be used in a Lambda function or run manually
 */
export function generateIndexCreationScript(collectionEndpoint: string): string {
  const mapping = getBedrockIndexMapping();
  const config = getBedrockVectorIndexConfig();
  
  return `
import boto3
import json
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

# AWS credentials
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, 'us-east-1', 'aoss')

# OpenSearch client
client = OpenSearch(
    hosts=[{'host': '${collectionEndpoint.replace('https://', '')}', 'port': 443}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=300
)

# Create index with Bedrock-compatible mapping
index_name = '${config.indexName}'
index_body = ${JSON.stringify(mapping, null, 2)}

try:
    response = client.indices.create(index=index_name, body=index_body)
    print(f"Index created successfully: {response}")
except Exception as e:
    print(f"Error creating index: {e}")
`;
}

/**
 * Get the curl command to create the index manually
 */
export function getIndexCreationCurlCommand(collectionEndpoint: string, region: string = 'us-east-1'): string {
  const mapping = getBedrockIndexMapping();
  const config = getBedrockVectorIndexConfig();
  
  return `
# Create the index using AWS SigV4 authentication
# Requires: aws-cli and awscurl (pip install awscurl)

awscurl --service aoss --region ${region} \\
  -X PUT \\
  "${collectionEndpoint}/${config.indexName}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(mapping)}'
`;
}

/**
 * Documentation for manual index creation
 */
export const INDEX_CREATION_INSTRUCTIONS = `
# Creating the Bedrock-Compatible Vector Index

After deploying the OpenSearch Serverless collection, you need to create the vector index.

## Option 1: Using Python (Recommended)

1. Install dependencies:
   pip install boto3 opensearch-py requests-aws4auth

2. Run the index creation script (output from generateIndexCreationScript)

## Option 2: Using AWS CLI with awscurl

1. Install awscurl:
   pip install awscurl

2. Run the curl command (output from getIndexCreationCurlCommand)

## Option 3: Using Lambda Function

Create a Lambda function that runs on deployment to automatically create the index.
This is the most automated approach and will be implemented in a later task.

## Verification

After creating the index, verify it exists:

awscurl --service aoss --region us-east-1 \\
  "\${COLLECTION_ENDPOINT}/_cat/indices?v"

You should see the index: bedrock-knowledge-base-default-index
`;
