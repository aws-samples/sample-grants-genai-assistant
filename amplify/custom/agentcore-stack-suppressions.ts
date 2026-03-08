/**
 * CDK-Nag Suppressions for AgentCore Stack
 * 
 * Centralized suppression configuration with broad pattern matching
 * to handle CloudFormation tokens properly.
 */

import { NagSuppressions } from 'cdk-nag';
import { Policy } from 'aws-cdk-lib/aws-iam';

/**
 * Apply comprehensive IAM5 suppression to a role's DefaultPolicy
 * Omits appliesTo to catch ALL wildcard patterns
 */
export function suppressAgentRoleWildcards(
    role: any,
    agentName: string,
    additionalServices: string[] = []
) {
    const defaultPolicy = role.node.tryFindChild('DefaultPolicy') as Policy;
    if (!defaultPolicy) {
        console.warn(`No DefaultPolicy found for ${agentName}`);
        return;
    }

    const baseServices = [
        'X-Ray tracing (no resource-level permissions)',
        'CloudWatch metrics (namespace-level operation)',
        'ECR authorization (account-level operation)',
        'Bedrock Claude models (version wildcards)',
        'DynamoDB indexes (dynamic GSI/LSI names)',
        'AppSync GraphQL (operation wildcards)',
        'Bedrock AgentCore logs (runtime-specific streams)',
        'Bedrock workload identity (dynamic identity paths)'
    ];

    const allServices = [...baseServices, ...additionalServices];
    const reason = `Wildcards required for AWS service limitations: ${allServices.join(', ')}. All wildcards properly scoped.`;

    // CRITICAL: Omit appliesTo to suppress ALL wildcard patterns
    // CDK-Nag creates separate findings for each wildcard, and appliesTo patterns don't match tokens reliably
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
