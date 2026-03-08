import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const euGrantsSearchV2 = defineFunction(
    (scope) => {
        // Create custom role WITHOUT managed policies (fixes IAM4)
        const role = new iam.Role(scope, 'EuGrantsSearchV2Role', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Custom execution role for EuGrantsSearchV2 Lambda',
        });

        // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-EuGrantsSearchV2Function*:*',
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-EuGrantsSearchV2Function*'
            ]
        }));

        const fn = new lambda.Function(scope, 'EuGrantsSearchV2Function', {
            runtime: lambda.Runtime.PYTHON_3_14,
            handler: 'handler.lambda_handler',
            code: lambda.Code.fromAsset('amplify/functions/eu-grants-search-v2'),
            timeout: Duration.minutes(15),
            memorySize: 3008,
            role: role,  // Use custom role
            environment: {
                // Environment variables set from backend.ts
            }
        });

        // Add IAM permissions for CloudFormation (to read exports)
        fn.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cloudformation:ListExports'
            ],
            resources: ['*']
        }));

        // Add IAM permissions for Bedrock AgentCore
        fn.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock-agentcore:InvokeAgentRuntime'
            ],
            resources: ['*']  // Will be scoped in backend.ts
        }));

        // DynamoDB, AppSync, and S3 permissions will be granted from backend.ts

        return fn;

        return fn;
    },
    {
        resourceGroupName: 'data'
    }
);
