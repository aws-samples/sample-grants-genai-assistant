/**
 * Account-Portable OpenSearch Stack for Amplify Gen 2
 * 
 * This creates a complete OpenSearch + Knowledge Base stack that can be deployed
 * to any AWS account. Reuses proven SimpleProductionOpenSearchStack patterns.
 */

import { 
  aws_opensearchserverless as opensearch,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  CfnOutput,
  RemovalPolicy,
  CustomResource,
  Duration,
} from 'aws-cdk-lib';
import { Backend } from '@aws-amplify/backend';

export function addOpenSearchStack(backend: Backend<any>) {
  const stack = backend.createStack('GrantProposalOpenSearchStack');
  
  // Auto-detect account and region for portability
  const account = stack.account;
  const region = stack.region;
  const collectionName = 'grant-proposal-kb';
  
  console.log(`Deploying to Account: ${account}, Region: ${region}`);
  
  // 1. Create Bedrock execution role (account-portable)
  const bedrockRole = new iam.Role(stack, 'BedrockKnowledgeBaseRole', {
    roleName: `BedrockKB-GrantProposal-${account}`, // Account-specific name
    assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess')
    ]
  });
  
  // 2. Encryption policy (reusing exact SimpleProductionOpenSearchStack config)
  const encryptionPolicy = new opensearch.CfnSecurityPolicy(stack, 'EncryptionPolicy', {
    name: `${collectionName}-encrypt-${account}`,
    type: 'encryption',
    policy: JSON.stringify({
      "Rules": [{"ResourceType": "collection", "Resource": [`collection/${collectionName}`]}],
      "AWSOwnedKey": true
    })
  });
  
  // 3. Network policy (account-portable)
  const networkPolicy = new opensearch.CfnSecurityPolicy(stack, 'NetworkPolicy', {
    name: `${collectionName}-network-${account}`,
    type: 'network',
    policy: JSON.stringify([{
      "Rules": [{"ResourceType": "collection", "Resource": [`collection/${collectionName}`]}],
      "AllowFromPublic": true
    }])
  });
  
  // 4. Data access policy (auto-detects account)
  const dataAccessPolicy = new opensearch.CfnAccessPolicy(stack, 'DataAccessPolicy', {
    name: `${collectionName}-data-${account}`,
    type: 'data',
    policy: JSON.stringify([{
      "Rules": [
        {
          "Resource": [`collection/${collectionName}`],
          "Permission": ["aoss:*"],
          "ResourceType": "collection"
        },
        {
          "Resource": [`index/${collectionName}/*`],
          "Permission": ["aoss:*"],
          "ResourceType": "index"
        }
      ],
      "Principal": [
        `arn:aws:iam::${account}:root`,
        bedrockRole.roleArn
      ]
    }])
  });
  
  // 5. OpenSearch collection (proven config)
  const collection = new opensearch.CfnCollection(stack, 'Collection', {
    name: collectionName,
    type: 'VECTORSEARCH',
    description: `Grant Proposal Knowledge Base - Account ${account}`
  });
  
  // Ensure proper dependency order
  collection.addDependency(encryptionPolicy);
  collection.addDependency(networkPolicy);
  collection.addDependency(dataAccessPolicy);
  
  // 6. S3 bucket for documents (account-portable)
  const documentBucket = new s3.Bucket(stack, 'DocumentBucket', {
    bucketName: `grant-proposal-docs-${account}-${region}`, // Globally unique
    versioned: true,
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy: RemovalPolicy.DESTROY // For easy cleanup during development
  });
  
  // 7. Grant S3 permissions to Bedrock role
  bedrockRole.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:ListBucket'
      ],
      resources: [
        documentBucket.bucketArn,
        `${documentBucket.bucketArn}/*`
      ]
    })
  );
  
  // 8. Grant OpenSearch permissions to Bedrock role
  bedrockRole.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'aoss:APIAccessAll'
      ],
      resources: [collection.attrArn]
    })
  );
  
  // 9. Outputs for cross-stack references and testing
  new CfnOutput(stack, 'OpenSearchCollectionEndpoint', {
    value: collection.attrCollectionEndpoint,
    description: 'OpenSearch Collection Endpoint',
    exportName: `GrantProposal-CollectionEndpoint-${account}`
  });
  
  new CfnOutput(stack, 'OpenSearchCollectionArn', {
    value: collection.attrArn,
    description: 'OpenSearch Collection ARN',
    exportName: `GrantProposal-CollectionArn-${account}`
  });
  
  new CfnOutput(stack, 'BedrockRoleArn', {
    value: bedrockRole.roleArn,
    description: 'Bedrock execution role ARN',
    exportName: `GrantProposal-BedrockRoleArn-${account}`
  });
  
  new CfnOutput(stack, 'DocumentBucketName', {
    value: documentBucket.bucketName,
    description: 'S3 bucket for Knowledge Base documents',
    exportName: `GrantProposal-DocumentBucket-${account}`
  });
  
  new CfnOutput(stack, 'DeploymentInfo', {
    value: `Account: ${account}, Region: ${region}, Collection: ${collectionName}`,
    description: 'Deployment information for verification'
  });
  
  // 10. Lambda Layer for dependencies (requests, requests-aws4auth)
  // CDK will automatically package and deploy this layer
  const depsLayer = new lambda.LayerVersion(stack, 'OpenSearchDepsLayer', {
    code: lambda.Code.fromAsset('lambda-layer'),
    compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
    description: 'requests and requests-aws4auth for OpenSearch index creation'
  });
  
  // 11. Custom Resource Lambda to create index
  const indexCreatorFn = new lambda.Function(stack, 'IndexCreatorFunction', {
    runtime: lambda.Runtime.PYTHON_3_12,
    handler: 'handler.handler',
    code: lambda.Code.fromAsset('amplify/functions/opensearch-index-creator'),
    timeout: Duration.minutes(5),
    memorySize: 512,
    layers: [depsLayer],
    environment: {
      COLLECTION_NAME: collectionName,
      INDEX_NAME: 'bedrock-knowledge-base-default-index',
      REGION: region
    }
  });
  
  // Grant permissions to Lambda
  indexCreatorFn.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'aoss:APIAccessAll',
        'aoss:BatchGetCollection'
      ],
      resources: [collection.attrArn, `arn:aws:aoss:${region}:${account}:collection/*`]
    })
  );
  
  // 12. Custom Resource to trigger index creation
  const indexCreator = new CustomResource(stack, 'OpenSearchIndexCreator', {
    serviceToken: indexCreatorFn.functionArn,
    properties: {
      CollectionName: collectionName,
      IndexName: 'bedrock-knowledge-base-default-index',
      Region: region
    }
  });
  
  // Ensure index is created after collection
  indexCreator.node.addDependency(collection);
  
  new CfnOutput(stack, 'IndexCreationStatus', {
    value: 'Index created automatically via Custom Resource',
    description: 'OpenSearch index creation status'
  });
  
  // Return resources for further use
  return {
    collection,
    bedrockRole,
    documentBucket,
    collectionEndpoint: collection.attrCollectionEndpoint,
    collectionArn: collection.attrArn,
    account,
    region,
    indexCreator
  };
}