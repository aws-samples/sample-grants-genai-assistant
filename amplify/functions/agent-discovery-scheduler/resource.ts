import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const agentDiscoveryScheduler = defineFunction(
    (scope) => {
        // Create custom role WITHOUT managed policies (fixes IAM4)
        const role = new iam.Role(scope, 'AgentDiscoverySchedulerRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Custom execution role for AgentDiscoveryScheduler Lambda',
        });

        // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-AgentDiscoverySchedulerFunction*:*',
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-AgentDiscoverySchedulerFunction*'
            ]
        }));

        const fn = new lambda.Function(scope, 'AgentDiscoverySchedulerFunction', {
            runtime: lambda.Runtime.PYTHON_3_14,
            handler: 'handler.handler',
            code: lambda.Code.fromAsset('amplify/functions/agent-discovery-scheduler'),
            timeout: Duration.minutes(15),
            memorySize: 3008,
            role: role,  // Use custom role
            environment: {
                // Environment variables will be set in backend.ts
                // - STATE_MACHINE_ARN (Step Function ARN)
                // - AGENT_CONFIG_TABLE (AgentConfig DynamoDB table)
            }
        });

        return fn;
    },
    {
        resourceGroupName: 'data'
    }
);
