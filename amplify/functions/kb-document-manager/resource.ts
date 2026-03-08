import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const kbDocumentManager = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'KBDocumentManagerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for KBDocumentManager Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-KBDocumentManagerFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-KBDocumentManagerFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'KBDocumentManagerFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('amplify/functions/kb-document-manager'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        // These will be set by the backend configuration
        DOCUMENT_BUCKET: '', // Set in backend.ts
        DOCUMENT_TABLE: '', // Set in backend.ts
        KNOWLEDGE_BASE_ID: '', // Set in backend.ts
        DATA_SOURCE_ID: '', // Set in backend.ts
      }
    });

    // Bedrock ingestion job permissions are defined in backend.ts with proper scoping
    // (separated ListIngestionJobs, StartIngestionJob, and GetIngestionJob)

    // S3 and DynamoDB permissions will be granted dynamically from backend.ts

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);
