import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export const agentConfig = defineFunction(
  (scope: Construct) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'AgentConfigRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for AgentConfig Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        `arn:aws:logs:${Stack.of(scope).region}:${Stack.of(scope).account}:log-group:/aws/lambda/*agent-config*:*`,
        `arn:aws:logs:${Stack.of(scope).region}:${Stack.of(scope).account}:log-group:/aws/lambda/*agent-config*`
      ]
    }));

    const fn = new lambda.Function(scope, 'AgentConfigFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('amplify/functions/agent-config'),
      timeout: Duration.seconds(30),
      memorySize: 512,
      role: role,  // Use custom role
    });

    return fn;
  }
);