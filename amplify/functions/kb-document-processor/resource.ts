/**
 * Knowledge Base Document Processor Lambda Function
 * 
 * Triggered by S3 events to process uploaded documents:
 * - Updates document status to "processing"
 * - Triggers Bedrock Knowledge Base sync
 * - Monitors sync completion
 * - Updates document status to "ready" or "failed"
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.2, 8.3, 8.4
 */

import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const kbDocumentProcessor = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'KBDocumentProcessorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for KBDocumentProcessor Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-KBDocumentProcessorFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-KBDocumentProcessorFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'KBDocumentProcessorFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('amplify/functions/kb-document-processor'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        // These will be set by the backend configuration
        // KNOWLEDGE_BASE_ID: provided by backend
        // DATA_SOURCE_ID: provided by backend
        // DOCUMENT_TABLE: provided by backend
      }
    });

    // Bedrock ingestion job permissions are defined in backend.ts with proper scoping
    // (separated ListIngestionJobs, StartIngestionJob, and GetIngestionJob)

    // Add S3 permissions for reading objects, adding metadata, and tagging
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:HeadObject',          // Required to read object properties
        's3:PutObject',           // Required for copy_object to add metadata
        's3:PutObjectTagging',
        's3:GetObjectTagging'
      ],
      resources: ['arn:aws:s3:::kb-docs-*/*']
    }));

    // DynamoDB permissions will be granted dynamically from backend.ts

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);
