import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const promptManager = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'PromptManagerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for PromptManager Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-PromptManagerFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-PromptManagerFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'PromptManagerFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('amplify/functions/prompt-manager'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        // REGION will be set from backend.ts using stack.region
      }
    });

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);
