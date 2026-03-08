import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const kbDocumentUpload = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'KBDocumentUploadRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for KBDocumentUpload Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-KBDocumentUploadFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-KBDocumentUploadFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'KBDocumentUploadFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('amplify/functions/kb-document-upload'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        // These will be set by the backend configuration
        DOCUMENT_BUCKET: '', // Set in backend.ts
        DOCUMENT_TABLE: '', // Set in backend.ts
        PRESIGNED_URL_EXPIRATION: '3600', // 1 hour
      }
    });

    // S3 and DynamoDB permissions will be granted dynamically from backend.ts

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);
