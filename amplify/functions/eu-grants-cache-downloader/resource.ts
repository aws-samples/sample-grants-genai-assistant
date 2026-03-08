import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export const euGrantsCacheDownloader = defineFunction(
    (scope) => {
        // Create custom role WITHOUT managed policies (fixes IAM4)
        const role = new iam.Role(scope, 'EuGrantsCacheDownloaderRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Custom execution role for EuGrantsCacheDownloader Lambda',
        });

        // Add CloudWatch Logs permissions (replaces AWSLambdaBasicExecutionRole)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-EuGrantsCacheDownloaderFunction*:*',
                'arn:aws:logs:*:*:log-group:/aws/lambda/amplify-*-EuGrantsCacheDownloaderFunction*'
            ]
        }));

        const fn = new lambda.Function(scope, 'EuGrantsCacheDownloaderFunction', {
            runtime: lambda.Runtime.PYTHON_3_14,
            handler: 'handler.handler',
            code: lambda.Code.fromAsset('amplify/functions/eu-grants-cache-downloader'),
            timeout: Duration.minutes(15), // 5 minutes for 100MB download + JSON parsing
            memorySize: 3008, // More memory = faster CPU for JSON parsing
            role: role,  // Use custom role
            environment: {
                // SSL fix: certifi can't find cacert.pem via importlib.resources in Lambda zip packages
                SSL_CERT_FILE: '/var/task/certifi/cacert.pem',
                REQUESTS_CA_BUNDLE: '/var/task/certifi/cacert.pem',
                // EU_GRANTS_BUCKET will be set in backend.ts
            }
        });

        return fn;
    },
    {
        resourceGroupName: 'data'
    }
);
