/**
 * Knowledge Base Semantic Search Lambda Function Resource
 * 
 * Performs semantic search across vectorized documents using Bedrock Knowledge Base.
 * Enforces user-scoped search and supports metadata filtering.
 */

import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration, Stack } from 'aws-cdk-lib';

export const kbSearch = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'KBSearchRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for KBSearch Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-KBSearchFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-KBSearchFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'KBSearchFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('amplify/functions/kb-search'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        // These will be set by the backend configuration
        // KNOWLEDGE_BASE_ID: provided by knowledge-base-stack
        // DOCUMENT_TABLE: provided by data resource
      }
    });

    // Add IAM permissions for Bedrock Knowledge Base - scoped to account/region
    // KB IDs are dynamic and passed at runtime, but we scope to this account/region
    const stack = Stack.of(scope);
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:Retrieve',
        'bedrock:RetrieveAndGenerate'
      ],
      resources: [
        `arn:aws:bedrock:${stack.region}:${stack.account}:knowledge-base/*`
      ]
    }));

    // DynamoDB permissions will be granted dynamically from backend.ts

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);
