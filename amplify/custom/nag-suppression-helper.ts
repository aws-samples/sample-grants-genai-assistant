/**
 * CDK-Nag Suppression Helper
 * 
 * Provides statement-based suppressions for IAM5 findings.
 * Based on: https://johanneskonings.dev/blog/2025-11-27-aws-cdk-nag-iam5-granular-statement-suppresions
 * 
 * Key insight: Suppress based on exact PolicyStatement structure, not string patterns.
 * This prevents accidentally suppressing future wildcards.
 */

import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { IConstruct } from 'constructs';

export interface StatementSuppression {
    statement: PolicyStatement;
    reason: string;
}

/**
 * Add IAM5 suppressions for specific policy statements on a construct.
 * 
 * This suppresses ONLY the exact statements provided, not all wildcards.
 * 
 * @param construct - The construct to suppress (usually a Role or Policy)
 * @param suppressions - Array of statements to suppress with reasons
 * @param applyToChildren - Whether to apply to child constructs (usually true for DefaultPolicy)
 */
export function addStatementBasedSuppressions(
    construct: IConstruct,
    suppressions: StatementSuppression[],
    applyToChildren: boolean = true
): void {
    // For each statement, create a suppression
    const nagSuppressions = suppressions.map(({ statement, reason }) => {
        // Extract the actions and resources from the statement
        const actions = statement.actions || [];
        const resources = statement.resources || [];

        // Build appliesTo patterns based on the statement
        const appliesTo: string[] = [];

        // Add resource patterns
        resources.forEach(resource => {
            if (resource === '*') {
                appliesTo.push('Resource::*');
            } else if (resource.includes('*')) {
                appliesTo.push(`Resource::${resource}`);
            }
        });

        // Add action patterns if they have wildcards
        actions.forEach(action => {
            if (action.includes('*')) {
                appliesTo.push(`Action::${action}`);
            }
        });

        return {
            id: 'AwsSolutions-IAM5',
            reason,
            appliesTo: appliesTo.length > 0 ? appliesTo : undefined
        };
    });

    NagSuppressions.addResourceSuppressions(
        construct,
        nagSuppressions,
        applyToChildren
    );
}

/**
 * Common AWS service statements that require wildcards
 */
export const CommonWildcardStatements = {
    /**
     * X-Ray tracing - requires wildcard resource
     */
    xrayTracing: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
            'xray:PutTraceSegments',
            'xray:PutTelemetryRecords'
        ],
        resources: ['*']
    }),

    /**
     * X-Ray sampling - requires wildcard resource
     */
    xraySampling: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
            'xray:PutTraceSegments',
            'xray:PutTelemetryRecords',
            'xray:GetSamplingRules',
            'xray:GetSamplingTargets'
        ],
        resources: ['*']
    }),

    /**
     * CloudWatch metrics - requires wildcard resource
     */
    cloudWatchMetrics: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*']
    }),

    /**
     * ECR authorization - requires wildcard resource
     */
    ecrAuthorization: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*']
    })
};
