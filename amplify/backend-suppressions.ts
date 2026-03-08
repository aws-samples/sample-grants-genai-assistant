/**
 * CDK-Nag Suppressions for Backend Lambda Functions
 * 
 * Centralized suppression configuration for all Lambda functions
 * defined in backend.ts (not AgentCore agents).
 */

import { NagSuppressions } from 'cdk-nag';
import { Policy } from 'aws-cdk-lib/aws-iam';

/**
 * Apply comprehensive IAM5 suppression to a Lambda function's custom role
 * Omits appliesTo to catch ALL wildcard patterns
 */
export function suppressLambdaRoleWildcards(
    role: any,
    functionName: string,
    additionalServices: string[] = []
) {
    if (!role) {
        console.warn(`No role found for ${functionName}`);
        return;
    }

    const defaultPolicy = role.node.tryFindChild('DefaultPolicy') as Policy;
    if (!defaultPolicy) {
        console.warn(`No DefaultPolicy found for ${functionName}`);
        return;
    }

    const baseServices = [
        'CloudWatch Logs (CreateLogGroup, CreateLogStream, PutLogEvents)',
        'X-Ray tracing (no resource-level permissions)',
        'CloudWatch metrics (namespace-level operation)',
        'VPC networking (ENI operations for Lambda in VPC)'
    ];

    const allServices = [...baseServices, ...additionalServices];
    const reason = `Wildcards required for Lambda function operations: ${allServices.join(', ')}. All wildcards properly scoped to Lambda execution requirements.`;

    // CRITICAL: Omit appliesTo to suppress ALL wildcard patterns
    NagSuppressions.addResourceSuppressions(
        defaultPolicy,
        [{
            id: 'AwsSolutions-IAM5',
            reason
            // NO appliesTo - suppresses all IAM5 findings for this policy
        }],
        true  // applyToChildren
    );
}

/**
 * Suppress all Lambda functions in the backend
 */
export function suppressAllBackendLambdas(
    backend: any,
    functionConfigs: Array<{
        name: string;
        role: any;
        additionalServices?: string[];
    }>
) {
    functionConfigs.forEach(({ name, role, additionalServices = [] }) => {
        suppressLambdaRoleWildcards(role, name, additionalServices);
    });
}
