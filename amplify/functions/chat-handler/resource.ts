import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const chatHandler = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'ChatHandlerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for ChatHandler Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-ChatHandlerFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-ChatHandlerFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'ChatHandlerFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('amplify/functions/chat-handler'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        CHAT_SESSIONS_TABLE: '', // Will be set by backend
        CHAT_CONTEXT_BUCKET: '', // Will be set by backend
        APPSYNC_API_ID: '',   // Will be set from AppSync
        APPSYNC_ENDPOINT: ''  // Will be set from AppSync
      }
    });

    // Add IAM permissions for Bedrock (Claude Sonnet)
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel'
      ],
      resources: ['*']  // Allow access to all Bedrock models
    }));

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);