import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const grantsSearchV2 = defineFunction(
    (scope) => {
        // Create custom role WITHOUT managed policies (fixes IAM4)
        const role = new iam.Role(scope, 'GrantsSearchV2Role', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Custom execution role for GrantsSearchV2 Lambda',
        });

        // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-GrantsSearchV2Function*:*',
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-GrantsSearchV2Function*'
            ]
        }));

        const fn = new lambda.Function(scope, 'GrantsSearchV2Function', {
            runtime: lambda.Runtime.PYTHON_3_14,
            handler: 'handler.lambda_handler',
            code: lambda.Code.fromAsset('amplify/functions/grants-search-v2'),
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

        // DynamoDB and AppSync permissions will be granted from backend.ts

        return fn;

        return fn;
    },
    {
        resourceGroupName: 'data'
    }
);
