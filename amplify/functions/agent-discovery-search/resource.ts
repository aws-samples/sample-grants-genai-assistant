import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const agentDiscoverySearch = defineFunction(
  (scope) => {
    // Create custom role WITHOUT managed policies (fixes IAM4)
    const role = new iam.Role(scope, 'AgentDiscoverySearchRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Custom execution role for AgentDiscoverySearch Lambda',
    });

    // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-AgentDiscoverySearchFunction*:*',
        'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-AgentDiscoverySearchFunction*'
      ]
    }));

    const fn = new lambda.Function(scope, 'AgentDiscoverySearchFunction', {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('amplify/functions/agent-discovery-search'),
      timeout: Duration.minutes(15),
      memorySize: 3008,
      role: role,  // Use custom role
      environment: {
        // SSL fix: certifi can't find cacert.pem via importlib.resources in Lambda zip packages
        // Point directly to the bundled file so boto3/requests SSL validation works
        SSL_CERT_FILE: '/var/task/certifi/cacert.pem',
        REQUESTS_CA_BUNDLE: '/var/task/certifi/cacert.pem',
        // Other environment variables will be set in backend.ts
      }
    });

    // Add IAM permissions for Lambda invocation (US and EU search)
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'lambda:InvokeFunction'
      ],
      resources: ['*']  // Will be restricted to grants-search and eu-grants-search Lambdas in backend.ts
    }));

    // Add IAM permissions for DynamoDB table scans (US and EU grant records)
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:Scan',
        'dynamodb:Query',
        'dynamodb:GetItem'
      ],
      resources: ['*']  // Will be restricted to GrantRecord and EuGrantRecord tables in backend.ts
    }));

    // Add IAM permissions for S3 (storing discovery results)
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:GetObject'
      ],
      resources: ['*']  // Will be restricted to discovery results bucket in backend.ts
    }));

    return fn;
  },
  {
    resourceGroupName: 'data'
  }
);