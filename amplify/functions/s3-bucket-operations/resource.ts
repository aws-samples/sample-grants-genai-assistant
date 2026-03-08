import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const s3BucketOperations = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'S3BucketOperationsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for S3BucketOperations Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-S3BucketOperationsFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-S3BucketOperationsFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'S3BucketOperationsFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('amplify/functions/s3-bucket-operations'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        // Environment variables will be set in backend.ts
      }
    });

    // Add IAM permissions for S3
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:ListBucket',
        's3:GetObject',
        's3:GetObjectVersion'
      ],
      resources: ['*'] // Will be restricted to specific bucket in backend.ts
    }));

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);