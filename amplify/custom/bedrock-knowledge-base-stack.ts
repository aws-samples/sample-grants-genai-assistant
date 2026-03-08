/**
 * Phase 2: Bedrock Knowledge Base
 * 
 * This stack creates the Knowledge Base that connects to the existing
 * OpenSearch collection (from Phase 1).
 * 
 * Prerequisites:
 * 1. Phase 1 deployed (opensearch-collection-stack.ts)
 * 2. Vector index created (python/create_opensearch_index.py)
 * 
 * This stack assumes the index already exists.
 */

import { 
  aws_bedrock as bedrock,
  aws_iam as iam,
  aws_s3 as s3,
  CfnOutput,
  Stack,
  Fn,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface BedrockKnowledgeBaseStackProps {
  collectionName?: string;
}

export class BedrockKnowledgeBaseStack extends Construct {
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;
  public readonly dataSource: bedrock.CfnDataSource;
  
  constructor(scope: Construct, id: string, props?: BedrockKnowledgeBaseStackProps) {
    super(scope, id);
    
    const stack = Stack.of(this);
    const region = stack.region;
    const collectionName = props?.collectionName || 'kb-collection';
    
    // Import values from Phase 1 stack
    const collectionArn = Fn.importValue(`${collectionName}-Arn`);
    const bedrockRoleArn = Fn.importValue(`${collectionName}-BedrockRoleArn`);
    const documentBucketArn = Fn.importValue(`${collectionName}-BucketArn`);
    
    // 1. Create Knowledge Base
    // The vector index MUST already exist at this point
    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: `${collectionName}-kb`,
      description: 'Knowledge base for document vectorization and semantic search',
      roleArn: bedrockRoleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v2:0`
        }
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: collectionArn,
          vectorIndexName: 'bedrock-knowledge-base-default-index',
          fieldMapping: {
            vectorField: 'bedrock-knowledge-base-default-vector',
            textField: 'AMAZON_BEDROCK_TEXT_CHUNK',
            metadataField: 'AMAZON_BEDROCK_METADATA'
          }
        }
      }
    });
    
    // 2. Create S3 Data Source
    this.dataSource = new bedrock.CfnDataSource(this, 'S3DataSource', {
      name: `${collectionName}-s3-source`,
      description: 'S3 data source for document ingestion',
      knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: documentBucketArn,
          inclusionPrefixes: ['user-']
        }
      },
      vectorIngestionConfiguration: {
        chunkingConfiguration: {
          chunkingStrategy: 'FIXED_SIZE',
          fixedSizeChunkingConfiguration: {
            maxTokens: 512,
            overlapPercentage: 20
          }
        }
      }
    });
    
    this.dataSource.addDependency(this.knowledgeBase);
    
    // 3. Outputs
    new CfnOutput(this, 'KnowledgeBaseId', {
      value: this.knowledgeBase.attrKnowledgeBaseId,
      description: 'Knowledge Base ID',
      exportName: `${collectionName}-KnowledgeBaseId`
    });
    
    new CfnOutput(this, 'KnowledgeBaseArn', {
      value: this.knowledgeBase.attrKnowledgeBaseArn,
      description: 'Knowledge Base ARN',
      exportName: `${collectionName}-KnowledgeBaseArn`
    });
    
    new CfnOutput(this, 'DataSourceId', {
      value: this.dataSource.attrDataSourceId,
      description: 'Data Source ID',
      exportName: `${collectionName}-DataSourceId`
    });
  }
}
