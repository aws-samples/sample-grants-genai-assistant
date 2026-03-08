import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const proposalDownload = defineFunction(
    (scope) => {
        // Create custom role WITHOUT managed policies (fixes IAM4)
        const role = new iam.Role(scope, 'ProposalDownloadRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Custom execution role for ProposalDownload Lambda',
        });

        // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-ProposalDownloadFunction*:*',
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-ProposalDownloadFunction*'
            ]
        }));

        const fn = new lambda.Function(scope, 'ProposalDownloadFunction', {
            runtime: lambda.Runtime.PYTHON_3_14,
            handler: 'handler.handler',
            code: lambda.Code.fromAsset('amplify/functions/proposal-download'),
            timeout: Duration.seconds(30),
            memorySize: 512,
            role: role,  // Use custom role
            environment: {
                // PROPOSAL_TABLE_NAME and PROPOSALS_BUCKET_NAME will be set by backend.ts
            }
        });

        return fn;
    },
    {
        resourceGroupName: 'data'
    }
);
