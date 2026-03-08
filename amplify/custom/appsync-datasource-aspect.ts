/**
 * CDK Aspect to remove Lambda version wildcards from AppSync DataSource policies
 * 
 * Problem: Amplify Gen 2 auto-generates AppSync Lambda DataSource policies with:
 *   - arn:aws:lambda:region:account:function:FunctionName
 *   - arn:aws:lambda:region:account:function:FunctionName:*
 * 
 * The :* wildcard is unnecessary - AppSync invokes $LATEST by default.
 * This aspect removes the wildcard to eliminate IAM5 CDK-Nag findings.
 * 
 * Implementation: Modifies CfnPolicy resources to remove wildcard from Resource array
 */

import { IAspect } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class RemoveAppSyncLambdaVersionWildcard implements IAspect {
    private fixedPolicies = 0;

    visit(node: IConstruct): void {
        // Only process CfnPolicy resources (AWS::IAM::Policy)
        if (!(node instanceof iam.CfnPolicy)) {
            return;
        }

        const policy = node as iam.CfnPolicy;
        const policyId = node.node.id;

        // Only process AppSync Lambda DataSource policies
        if (!policyId.includes('LambdaDataSource') || !policyId.includes('DefaultPolicy')) {
            return;
        }

        // Get the policy document
        const policyDocument = policy.policyDocument as any;
        if (!policyDocument || !policyDocument.Statement) {
            return;
        }

        // Find lambda:InvokeFunction statements
        let modified = false;
        for (let i = 0; i < policyDocument.Statement.length; i++) {
            const statement = policyDocument.Statement[i];

            if (statement.Action !== 'lambda:InvokeFunction') {
                continue;
            }

            if (!Array.isArray(statement.Resource) || statement.Resource.length !== 2) {
                continue;
            }

            // Check if second resource is the wildcard version (Fn::Join with :*)
            const secondResource = statement.Resource[1];
            if (secondResource && secondResource['Fn::Join']) {
                const parts = secondResource['Fn::Join'][1];
                if (Array.isArray(parts) && parts.length === 2 && parts[1] === ':*') {
                    // Remove the wildcard resource - keep only the first one (base Lambda ARN)
                    statement.Resource = [statement.Resource[0]];
                    modified = true;
                }
            }
        }

        if (modified) {
            this.fixedPolicies++;
            console.log(`✅ Fixed AppSync DataSource policy: ${policyId}`);
        }
    }

    public getFixedCount(): number {
        return this.fixedPolicies;
    }
}
