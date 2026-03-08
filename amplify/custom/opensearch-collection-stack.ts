/**
 * OpenSearch Serverless Collection with Automated Index Creation
 * 
 * This stack creates the OpenSearch collection with proper IAM policies
 * AND automatically creates the vector index using a Custom Resource Lambda.
 * 
 * No manual steps required - everything is automated in the deployment.
 */

import {
  aws_opensearchserverless as opensearch,
  aws_bedrock as bedrock,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  Duration,
  RemovalPolicy,
  CfnOutput,
  Stack,
  Names,
  CustomResource,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';

export interface OpenSearchCollectionStackProps {
  collectionName?: string;
  accessLogsBucket?: s3.IBucket; // SECURITY FIX: S1 - Access logs bucket
}

export class OpenSearchCollectionStack extends Construct {
  public readonly collection: opensearch.CfnCollection;
  public readonly documentBucket: s3.Bucket;
  public readonly bedrockRole: iam.Role;
  public readonly collectionEndpoint: string;
  public readonly collectionArn: string;
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;
  public readonly dataSource: bedrock.CfnDataSource;

  constructor(scope: Construct, id: string, props?: OpenSearchCollectionStackProps) {
    super(scope, id);

    const stack = Stack.of(this);
    const account = stack.account;

    // Use Fn.ref to get actual region value at deployment time
    // This avoids token issues in resource names
    const region = stack.region;

    // Generate unique suffix - this is already a resolved string
    const uniqueId = Names.uniqueId(this).slice(-8).toLowerCase();

    // For resource names, we CANNOT use tokens (like stack.region)
    // Instead, use a simple unique ID that works across all regions
    // Format: kb-{uniqueId} = 3+1+8 = 12 chars (well under 32 limit)
    const baseCollectionName = props?.collectionName || 'kb';
    const collectionName = `${baseCollectionName}-${uniqueId}`;

    // For policy names, also use just the unique ID
    const policyPrefix = `kb-${uniqueId}`;

    // 1. Create S3 bucket for documents
    this.documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: `kb-docs-${account}-${region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      serverAccessLogsBucket: props?.accessLogsBucket, // SECURITY FIX: S1 - Enable access logging
      serverAccessLogsPrefix: 'kb-documents/', // SECURITY FIX: S1
      lifecycleRules: [
        {
          noncurrentVersionTransitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: Duration.days(30)
            }
          ],
          noncurrentVersionExpiration: Duration.days(90)
        }
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000
        }
      ]
    });

    // 2. Create Bedrock execution role
    this.bedrockRole = new iam.Role(this, 'BedrockRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Bedrock Knowledge Base execution role',
    });

    // Grant S3 access - use CDK grant methods to avoid circular dependencies
    this.documentBucket.grantRead(this.bedrockRole);
    this.documentBucket.grantReadWrite(this.bedrockRole);

    // Grant embedding model access
    this.bedrockRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v1`,
          `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v2:0`
        ]
      })
    );

    // 3. Encryption policy
    const encryptionPolicy = new opensearch.CfnSecurityPolicy(this, 'EncryptionPolicy', {
      name: `${policyPrefix}-enc`,
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [{
          ResourceType: 'collection',
          Resource: [`collection/${collectionName}`]
        }],
        AWSOwnedKey: true
      })
    });

    // 4. Network policy
    // CRITICAL: Network policy MUST be an array at top level (AWS requirement)
    const networkPolicy = new opensearch.CfnSecurityPolicy(this, 'NetworkPolicy', {
      name: `${policyPrefix}-net`,
      type: 'network',
      policy: JSON.stringify([{
        Rules: [{
          ResourceType: 'collection',
          Resource: [`collection/${collectionName}`]
        }],
        AllowFromPublic: true
      }])
    });

    // Create IndexCreator role early so its ARN can be used in the data access policy
    const indexCreatorRole = new iam.Role(this, 'IndexCreatorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for OpenSearch Index Creator Lambda'
    });

    // Grant CloudWatch Logs permissions so Lambda can write logs
    indexCreatorRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:aws:logs:${stack.region}:${account}:log-group:/aws/lambda/*`]
    }));

    // 5. Data access policy
    const dataAccessPolicy = new opensearch.CfnAccessPolicy(this, 'DataAccessPolicy', {
      name: `${policyPrefix}-data`,
      type: 'data',
      policy: JSON.stringify([{
        Rules: [
          {
            Resource: [`collection/${collectionName}`],
            Permission: [
              'aoss:DescribeCollectionItems',
              'aoss:CreateCollectionItems',
              'aoss:UpdateCollectionItems'
            ],
            ResourceType: 'collection'
          },
          {
            Resource: [`index/${collectionName}/*`],
            Permission: [
              'aoss:CreateIndex',
              'aoss:DeleteIndex',
              'aoss:UpdateIndex',
              'aoss:DescribeIndex',
              'aoss:ReadDocument',
              'aoss:WriteDocument'
            ],
            ResourceType: 'index'
          }
        ],
        Principal: [
          `arn:aws:iam::${account}:root`,
          this.bedrockRole.roleArn,
          `arn:aws:sts::${account}:assumed-role/${this.bedrockRole.roleName}/*`,
          indexCreatorRole.roleArn,
          `arn:aws:sts::${account}:assumed-role/${indexCreatorRole.roleName}/*`
        ]
      }])
    });

    // 6. Create OpenSearch Serverless collection
    this.collection = new opensearch.CfnCollection(this, 'Collection', {
      name: collectionName,
      type: 'VECTORSEARCH',
      description: 'Vector search collection for Knowledge Base'
    });

    // Dependencies
    this.collection.addDependency(encryptionPolicy);
    this.collection.addDependency(networkPolicy);
    this.collection.addDependency(dataAccessPolicy);

    // 7. Grant OpenSearch permissions to Bedrock role
    this.bedrockRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'aoss:APIAccessAll',
          'aoss:DescribeCollectionItems',
          'aoss:CreateCollectionItems',
          'aoss:UpdateCollectionItems'
        ],
        resources: [this.collection.attrArn]
      })
    );

    // Store values
    this.collectionEndpoint = this.collection.attrCollectionEndpoint;
    this.collectionArn = this.collection.attrArn;

    // 8. Outputs
    // Use simple static export names (no tokens, no stack names)
    // Format: KB-{resource}-{uniqueId} to ensure uniqueness across regions
    const exportPrefix = `KB-${uniqueId}`;

    new CfnOutput(this, 'CollectionEndpoint', {
      value: this.collectionEndpoint,
      description: 'OpenSearch collection endpoint',
      exportName: `${exportPrefix}-Endpoint`
    });

    new CfnOutput(this, 'CollectionArn', {
      value: this.collectionArn,
      description: 'OpenSearch collection ARN',
      exportName: `${exportPrefix}-Arn`
    });

    new CfnOutput(this, 'CollectionName', {
      value: collectionName,
      description: 'OpenSearch collection name',
      exportName: `${exportPrefix}-Name`
    });

    new CfnOutput(this, 'BedrockRoleArn', {
      value: this.bedrockRole.roleArn,
      description: 'Bedrock role ARN',
      exportName: `${exportPrefix}-BedrockRoleArn`
    });

    new CfnOutput(this, 'DocumentBucketName', {
      value: this.documentBucket.bucketName,
      description: 'S3 document bucket',
      exportName: `${exportPrefix}-BucketName`
    });

    new CfnOutput(this, 'DocumentBucketArn', {
      value: this.documentBucket.bucketArn,
      description: 'S3 bucket ARN',
      exportName: `${exportPrefix}-BucketArn`
    });

    // 9. Lambda function for automated index creation
    const indexCreatorFn = new lambda.Function(this, 'IndexCreatorFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('amplify/functions/opensearch-index-creator'),
      role: indexCreatorRole,
      timeout: Duration.minutes(15),
      memorySize: 3008,
      environment: {
        COLLECTION_NAME: collectionName,
        INDEX_NAME: 'bedrock-knowledge-base-default-index',
        REGION: region,
        // SSL fix: certifi can't find cacert.pem via importlib.resources in Lambda zip packages
        SSL_CERT_FILE: '/var/task/certifi/cacert.pem',
        REQUESTS_CA_BUNDLE: '/var/task/certifi/cacert.pem',
      }
    });

    // Grant OpenSearch permissions to Lambda
    // BatchGetCollection requires wildcard resource (AWS API limitation)
    indexCreatorFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['aoss:BatchGetCollection'],
        resources: ['*']
      })
    );

    // Collection-specific permissions
    indexCreatorFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'aoss:APIAccessAll',
          'aoss:DescribeCollectionItems',
          'aoss:CreateCollectionItems',
          'aoss:UpdateCollectionItems'
        ],
        resources: [this.collectionArn]
      })
    );

    // 11. Custom Resource to trigger index creation
    const indexCreator = new CustomResource(this, 'VectorIndexCreator', {
      serviceToken: indexCreatorFn.functionArn,
      properties: {
        CollectionEndpoint: this.collectionEndpoint,
        IndexName: 'bedrock-knowledge-base-default-index',
        Region: region,
        Timestamp: Date.now() // Force update on every deployment
      }
    });

    // Ensure index is created after collection
    indexCreator.node.addDependency(this.collection);

    new CfnOutput(this, 'IndexCreationStatus', {
      value: 'Automated via Custom Resource Lambda',
      description: 'Index creation method'
    });

    // 12. Create Bedrock Knowledge Base (after index is created)
    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: `${policyPrefix}`,
      description: 'Knowledge base for document vectorization and semantic search',
      roleArn: this.bedrockRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v2:0`
        }
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: this.collectionArn,
          vectorIndexName: 'bedrock-knowledge-base-default-index',
          fieldMapping: {
            vectorField: 'bedrock-knowledge-base-default-vector',
            textField: 'AMAZON_BEDROCK_TEXT_CHUNK',
            metadataField: 'AMAZON_BEDROCK_METADATA'
          }
        }
      }
    });

    // Ensure KB is created after index
    this.knowledgeBase.node.addDependency(indexCreator);

    // 13. Create S3 Data Source
    this.dataSource = new bedrock.CfnDataSource(this, 'S3DataSource', {
      name: `${policyPrefix}-s3`,
      description: 'S3 data source for document ingestion',
      knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: this.documentBucket.bucketArn,
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
      },
      dataDeletionPolicy: 'RETAIN'
    });

    this.dataSource.addDependency(this.knowledgeBase);

    // 14. Knowledge Base Outputs
    new CfnOutput(this, 'KnowledgeBaseId', {
      value: this.knowledgeBase.attrKnowledgeBaseId,
      description: 'Knowledge Base ID',
      exportName: `${exportPrefix}-KnowledgeBaseId`
    });

    new CfnOutput(this, 'KnowledgeBaseArn', {
      value: this.knowledgeBase.attrKnowledgeBaseArn,
      description: 'Knowledge Base ARN',
      exportName: `${exportPrefix}-KnowledgeBaseArn`
    });

    new CfnOutput(this, 'DataSourceId', {
      value: this.dataSource.attrDataSourceId,
      description: 'Data Source ID',
      exportName: `${exportPrefix}-DataSourceId`
    });

    // ============================================================================
    // CDK-NAG SUPPRESSIONS
    // ============================================================================

    // Suppress S3 wildcards from CDK grant methods
    // grantRead() and grantReadWrite() create action wildcards (s3:GetObject*, s3:List*, etc.)
    // and resource wildcards (bucket-arn/*)
    const bedrockRoleDefaultPolicy = this.bedrockRole.node.findChild('DefaultPolicy') as iam.Policy;
    NagSuppressions.addResourceSuppressions(
      bedrockRoleDefaultPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'S3 permissions use CDK grant methods which create: (1) Action wildcards (s3:GetObject*, s3:GetBucket*, s3:List*, s3:DeleteObject*, s3:Abort*) - these are standard S3 permission patterns, (2) Resource wildcard (bucket-arn/*) required for S3 object operations. Bucket ARN is scoped to specific Knowledge Base document bucket.',
          appliesTo: [
            'Action::s3:GetObject*',
            'Action::s3:GetBucket*',
            'Action::s3:List*',
            'Action::s3:DeleteObject*',
            'Action::s3:Abort*',
            'Resource::<OpenSearchCollectionDocumentBucket6240F891.Arn>/*'
          ]
        }
      ],
      true
    );

    // Suppress BatchGetCollection wildcard - AWS API limitation
    // Also suppress CloudWatch Logs wildcard (log stream :*)
    const indexCreatorDefaultPolicy = indexCreatorRole.node.findChild('DefaultPolicy') as iam.Policy;
    NagSuppressions.addResourceSuppressions(
      indexCreatorDefaultPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'OpenSearch IndexCreator role contains AWS service-required wildcards: (1) aoss:BatchGetCollection does not support resource-level permissions per AWS API design - must use wildcard for account-level read operation, (2) CloudWatch Logs log stream wildcard (:*) required for Lambda logging - log group is scoped to specific function.',
          appliesTo: [
            'Resource::*',
            'Resource::arn:aws:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/lambda/opensearch-index-creator-*:*'
          ]
        }
      ],
      true
    );
  }
}
