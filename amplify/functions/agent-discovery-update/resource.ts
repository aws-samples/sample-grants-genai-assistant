import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const agentDiscoveryUpdate = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'AgentDiscoveryUpdateRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for AgentDiscoveryUpdate Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-AgentDiscoveryUpdateFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-AgentDiscoveryUpdateFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'AgentDiscoveryUpdateFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('amplify/functions/agent-discovery-update'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        // SSL fix: certifi can't find cacert.pem via importlib.resources in Lambda zip packages
        SSL_CERT_FILE: '/var/task/certifi/cacert.pem',
        REQUESTS_CA_BUNDLE: '/var/task/certifi/cacert.pem',
        // Other environment variables will be set in backend.ts
        // - GRAPHQL_API_ID (AppSync API ID)
      }
    });

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);