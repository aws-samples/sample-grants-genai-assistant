/**
 * Pure CDK Lambda Functions Stack
 * 
 * Purpose: Replace Amplify Gen2 Lambda functions with pure CDK implementations
 * to eliminate IAM4 findings (AWS managed policies).
 * 
 * This stack creates Lambda functions with custom IAM roles (NO managed policies)
 * and wires them to AppSync as data sources.
 */

import { Construct } from 'constructs';
import { Stack, Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as appsync from 'aws-cdk-lib/aws-appsync';

export interface LambdaFunctionsCDKStackProps {
    graphqlApi: appsync.IGraphqlApi;  // Use interface, not concrete class
}

export class LambdaFunctionsCDKStack extends Construct {
    public readonly promptManagerFunction: lambda.Function;

    constructor(scope: Construct, id: string, props: LambdaFunctionsCDKStackProps) {
        super(scope, id);

        const stack = Stack.of(this);

        // ========================================================================
        // PROMPT MANAGER LAMBDA - Pure CDK (No Managed Policies)
        // ========================================================================

        // Create custom IAM role with NO managed policies
        const promptManagerRole = new iam.Role(this, 'PromptManagerRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Custom role for PromptManager Lambda (no managed policies)',
        });

        // Create the Lambda function
        this.promptManagerFunction = new lambda.Function(this, 'PromptManagerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'handler.handler',
            code: lambda.Code.fromAsset('./amplify/functions/prompt-manager'),
            role: promptManagerRole,
            timeout: Duration.minutes(15),
            memorySize: 3008,
            functionName: `${stack.stackName}-promptManagerCDK`,
            environment: {
                REGION: stack.region
            }
        });

        // Add CloudWatch Logs permissions (specific log group, no wildcards)
        promptManagerRole.addToPolicy(new iam.PolicyStatement({
            actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: [
                `arn:aws:logs:${stack.region}:${stack.account}:log-group:/aws/lambda/${this.promptManagerFunction.functionName}:*`
            ]
        }));

        promptManagerRole.addToPolicy(new iam.PolicyStatement({
            actions: ['logs:CreateLogGroup'],
            resources: [
                `arn:aws:logs:${stack.region}:${stack.account}:log-group:/aws/lambda/${this.promptManagerFunction.functionName}`
            ]
        }));

        // Add Bedrock permissions for prompt management
        promptManagerRole.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:ListPrompts', 'bedrock:GetPrompt'],
            resources: [`arn:aws:bedrock:${stack.region}:${stack.account}:prompt/*`]
        }));

        // Add Bedrock model invocation permissions
        promptManagerRole.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: [
                `arn:aws:bedrock:${stack.region}::foundation-model/anthropic.claude-3-sonnet-*`,
                `arn:aws:bedrock:${stack.region}::foundation-model/anthropic.claude-3-5-sonnet-*`,
                `arn:aws:bedrock:${stack.region}::foundation-model/anthropic.claude-3-haiku-*`
            ]
        }));

        // Wire to AppSync as a data source
        const promptManagerDataSource = props.graphqlApi.addLambdaDataSource(
            'PromptManagerCDKDataSource',
            this.promptManagerFunction,
            {
                name: 'PromptManagerCDKDataSource',
                description: 'Pure CDK Lambda data source for prompt management (no managed policies)'
            }
        );

        // TODO: Update GraphQL resolvers to use this data source
        // The resolvers in amplify/data/resource.ts need to be updated to use
        // 'PromptManagerCDKDataSource' instead of the Amplify function
    }
}
