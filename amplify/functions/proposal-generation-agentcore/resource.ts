import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const proposalGenerationAgentcore = defineFunction(
    (scope) => {
        // Create custom role WITHOUT managed policies (fixes IAM4)
        const role = new iam.Role(scope, 'ProposalGenerationAgentcoreRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Custom execution role for ProposalGenerationAgentcore Lambda',
        });

        // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-ProposalGenerationAgentc*:*',
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-ProposalGenerationAgentc*'
            ]
        }));

        const fn = new lambda.Function(scope, 'ProposalGenerationAgentcoreFunction', {
            runtime: lambda.Runtime.PYTHON_3_14,
            handler: 'handler.lambda_handler',
            code: lambda.Code.fromAsset('amplify/functions/proposal-generation-agentcore'),
            timeout: Duration.minutes(15), // Short timeout - agent handles long-running work
            memorySize: 3008, // Less memory needed - just calls AgentCore
            role: role,  // Use custom role
            environment: {
                // Agent ARN is read from SSM Parameter Store at runtime
                // BEDROCK_AGENTCORE_REGION will be set from backend.ts using stack.region
                // PROPOSALS_TABLE will be set from backend.ts
                // KNOWLEDGE_BASE_ID will be set from backend.ts
                // PROPOSALS_BUCKET will be set from backend.ts
            }
        });

        // Add IAM permissions for SSM Parameter Store
        fn.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ssm:GetParameter',
                'ssm:GetParameters'
            ],
            resources: [
                'arn:aws:ssm:*:*:parameter/grants-platform/agents/*',
                'arn:aws:ssm:*:*:parameter/agentcore/*'  // For PDF converter and evaluator ARNs
            ]
        }));

        // NOTE: bedrock-agentcore:InvokeAgentRuntime is granted in backend.ts
        // with the specific agent runtime ARN from the AgentCore stack.

        // NOTE: appsync:GetGraphqlApi is granted in backend.ts
        // with the specific API ARN from backend.data.resources.graphqlApi.

        // NOTE: cloudformation:ListExports is no longer needed - agent ARN is
        // passed directly via environment variable (AGENT_ARN_EXPORT_NAME).

        // DynamoDB permissions will be granted dynamically from backend.ts

        return fn;
    },
    {
        resourceGroupName: 'data'
    }
);
