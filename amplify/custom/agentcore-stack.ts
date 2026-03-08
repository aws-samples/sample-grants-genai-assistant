/**
 * AgentCore CDK Stack - ALL Agents
 * 
 * Migrates all AgentCore agents from shell scripts to CDK.
 * 
 * Benefits:
 * - Single deployment command (npx ampx sandbox)
 * - Direct ARN references (no SSM needed)
 * - Type-safe configuration
 * - CloudFormation rollback support
 * - Version control for infrastructure
 */

import { Stack, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore-alpha';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { suppressAgentRoleWildcards } from './agentcore-stack-suppressions';

export interface AgentCoreStackProps {
    region?: string;  // Optional: explicit region for validation (defaults to stack region)
    grantRecordTableName: string;  // For IAM policy ARN construction
    euGrantRecordTableName: string;  // For IAM policy ARN construction
    searchEventTableName: string;  // For IAM policy ARN construction
    userProfileTableName: string;  // For IAM policy ARN construction
    proposalTableName: string;  // For IAM policy ARN construction
    documentMetadataTableName: string;  // For IAM policy ARN construction
    proposalsBucketName: string;
    documentBucketName: string;
    euCacheBucketName: string;  // EU grants S3 cache bucket
    knowledgeBaseId: string;
    appsyncApiId: string;
    promptArns: string[];  // Bedrock prompt ARNs from BedrockPromptsStack
}

export class AgentCoreStack extends Stack {
    public readonly usGrantsSearchV2Arn: string;
    public readonly euGrantsSearchV2Arn: string;
    public readonly proposalGenerationArn: string;
    public readonly pdfConverterArn: string;
    public readonly proposalEvaluatorArn: string;

    constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
        super(scope, id);

        // Use explicit region if provided, otherwise fall back to stack region
        // This helps avoid token resolution issues during synthesis
        const deployRegion = props.region || this.region;

        // DO NOT import tables/buckets - this creates CloudFormation dependencies!
        // Instead, use the names directly in IAM policies as ARN strings

        // ========================================================================
        // 1. US GRANTS SEARCH V2
        // ========================================================================
        const usGrantsV2Role = this.createGrantsSearchRole(
            'UsGrantsV2ExecutionRole',
            props.grantRecordTableName,
            props.searchEventTableName,
            props.userProfileTableName,
            props.appsyncApiId,
            deployRegion
        );

        const usGrantsV2Artifact = agentcore.AgentRuntimeArtifact.fromAsset(
            './bc/grants-search-agent-v2'
        );

        const usGrantsV2Runtime = new agentcore.Runtime(this, 'UsGrantsSearchV2Runtime', {
            runtimeName: 'grants_search_agent_v2',
            agentRuntimeArtifact: usGrantsV2Artifact,
            executionRole: usGrantsV2Role,
            description: 'US Grants Search Agent V2 - CDK Deployed',
            environmentVariables: {
                AWS_REGION: deployRegion,  // EXPLICIT: Set AWS_REGION for boto3
                GRANT_RECORD_TABLE: props.grantRecordTableName,
                SEARCH_EVENT_TABLE: props.searchEventTableName,
                USER_PROFILE_TABLE: props.userProfileTableName,
                APPSYNC_ENDPOINT: `https://${props.appsyncApiId}.appsync-api.${deployRegion}.amazonaws.com/graphql`,
                REGION: deployRegion,
            },
        });

        this.usGrantsSearchV2Arn = usGrantsV2Runtime.agentRuntimeArn;

        // SECURITY: Suppress IAM5 for AWS API limitations
        suppressAgentRoleWildcards(usGrantsV2Role, 'UsGrantsV2');

        // ========================================================================
        // 2. EU GRANTS SEARCH V2
        // ========================================================================
        const euGrantsV2Role = this.createEuGrantsSearchRole(
            'EuGrantsV2ExecutionRole',
            props.euGrantRecordTableName,
            props.searchEventTableName,
            props.userProfileTableName,
            props.euCacheBucketName,
            props.appsyncApiId,
            deployRegion
        );

        const euGrantsV2Artifact = agentcore.AgentRuntimeArtifact.fromAsset(
            './bc/eu-grants-search-agent-v2'
        );

        const euGrantsV2Runtime = new agentcore.Runtime(this, 'EuGrantsSearchV2Runtime', {
            runtimeName: 'eu_grants_search_agent_v2',
            agentRuntimeArtifact: euGrantsV2Artifact,
            executionRole: euGrantsV2Role,
            description: 'EU Grants Search Agent V2 - CDK Deployed - v1.2',
            environmentVariables: {
                AWS_REGION: deployRegion,  // EXPLICIT: Set AWS_REGION for boto3
                EU_GRANT_RECORDS_TABLE: props.euGrantRecordTableName,
                SEARCH_EVENT_TABLE: props.searchEventTableName,
                USER_PROFILE_TABLE: props.userProfileTableName,
                APPSYNC_ENDPOINT: `https://${props.appsyncApiId}.appsync-api.${deployRegion}.amazonaws.com/graphql`,
                REGION: deployRegion,
            },
        });

        this.euGrantsSearchV2Arn = euGrantsV2Runtime.agentRuntimeArn;

        // SECURITY: Suppress IAM5 for AWS API limitations
        suppressAgentRoleWildcards(euGrantsV2Role, 'EuGrantsV2', ['S3 object operations (EU cache bucket)']);

        // ========================================================================
        // 3. PDF CONVERTER (Create first so we have the ARN)
        // ========================================================================
        const pdfConverterRole = this.createPdfConverterRole(props.proposalsBucketName, deployRegion);

        const pdfConverterArtifact = agentcore.AgentRuntimeArtifact.fromAsset(
            './bc/pdf-converter-agent'
        );

        const pdfConverterRuntime = new agentcore.Runtime(this, 'PdfConverterRuntime', {
            runtimeName: 'pdf_converter_agent',
            agentRuntimeArtifact: pdfConverterArtifact,
            executionRole: pdfConverterRole,
            description: 'PDF Converter Agent - CDK Deployed',
            environmentVariables: {
                AWS_REGION: deployRegion,  // EXPLICIT: Set AWS_REGION for boto3
                PROPOSALS_BUCKET: props.proposalsBucketName,
                REGION: deployRegion,
            },
        });

        this.pdfConverterArn = pdfConverterRuntime.agentRuntimeArn;

        // SECURITY: Suppress IAM5 for AWS API limitations
        suppressAgentRoleWildcards(pdfConverterRole, 'PdfConverter', ['S3 object operations (proposals bucket)']);

        // ========================================================================
        // 4. PROPOSAL EVALUATOR (Create second so we have the ARN)
        // ========================================================================
        const evaluatorRole = this.createProposalEvaluatorRole(
            props.proposalTableName,
            props.appsyncApiId,
            deployRegion
        );

        const evaluatorArtifact = agentcore.AgentRuntimeArtifact.fromAsset(
            './bc/proposal-evaluator-agent'
        );

        const evaluatorRuntime = new agentcore.Runtime(this, 'ProposalEvaluatorRuntime', {
            runtimeName: 'proposal_evaluator_agent',
            agentRuntimeArtifact: evaluatorArtifact,
            executionRole: evaluatorRole,
            description: 'Proposal Evaluator Agent - CDK Deployed - v1.1',
            environmentVariables: {
                AWS_REGION: deployRegion,  // EXPLICIT: Set AWS_REGION for boto3
                PROPOSALS_TABLE: props.proposalTableName,
                APPSYNC_ENDPOINT: `https://${props.appsyncApiId}.appsync-api.${deployRegion}.amazonaws.com/graphql`,
                REGION: deployRegion,
            },
        });

        this.proposalEvaluatorArn = evaluatorRuntime.agentRuntimeArn;

        // SECURITY: Suppress IAM5 for AWS API limitations
        suppressAgentRoleWildcards(evaluatorRole, 'ProposalEvaluator');

        // ========================================================================
        // 5. PROPOSAL GENERATION (Create last with sub-agent ARNs)
        // ========================================================================
        // NOW create the role with specific agent ARNs
        const proposalGenRole = this.createProposalGenerationRole(
            props.proposalTableName,
            props.documentMetadataTableName,
            props.userProfileTableName,
            props.proposalsBucketName,
            props.documentBucketName,
            props.knowledgeBaseId,
            props.appsyncApiId,
            deployRegion,
            pdfConverterRuntime.agentRuntimeArn,  // Pass specific ARN
            evaluatorRuntime.agentRuntimeArn,      // Pass specific ARN
            props.promptArns                        // Pass prompt ARNs from BedrockPromptsStack
        );

        const proposalGenArtifact = agentcore.AgentRuntimeArtifact.fromAsset(
            './bc/proposal-generation-agent'
        );

        // ========================================================================
        // PROPOSAL GENERATION RUNTIME (Create last with sub-agent ARNs)
        // ========================================================================
        // Now that PDF converter and evaluator are created, we can include their ARNs
        const proposalGenRuntime = new agentcore.Runtime(this, 'ProposalGenerationRuntime', {
            runtimeName: 'proposal_generation_agent',
            agentRuntimeArtifact: proposalGenArtifact,
            executionRole: proposalGenRole,
            description: 'Proposal Generation Agent - CDK Deployed - v1.2',
            environmentVariables: {
                AWS_REGION: deployRegion,  // EXPLICIT: Set AWS_REGION for boto3
                PROPOSALS_TABLE: props.proposalTableName,
                KNOWLEDGE_BASE_ID: props.knowledgeBaseId,
                PROPOSALS_BUCKET: props.proposalsBucketName,
                DOCUMENT_TABLE: props.documentMetadataTableName,
                DOCUMENT_BUCKET: props.documentBucketName,
                USER_PROFILE_TABLE: props.userProfileTableName,
                APPSYNC_ENDPOINT: `https://${props.appsyncApiId}.appsync-api.${deployRegion}.amazonaws.com/graphql`,
                REGION: deployRegion,
                PDF_CONVERTER_ARN: pdfConverterRuntime.agentRuntimeArn,
                PROPOSAL_EVALUATOR_ARN: evaluatorRuntime.agentRuntimeArn,
            },
        });

        this.proposalGenerationArn = proposalGenRuntime.agentRuntimeArn;

        // SECURITY: Suppress IAM5 for AWS API limitations
        suppressAgentRoleWildcards(proposalGenRole, 'ProposalGeneration', ['S3 object operations (proposals and documents)', 'Bedrock Knowledge Base operations', 'Agent-to-Agent invocation']);
    }

    // ========================================================================
    // HELPER METHODS FOR CREATING IAM ROLES
    // ========================================================================

    private createGrantsSearchRole(
        roleName: string,
        grantTableName: string,
        searchEventTableName: string,
        userProfileTableName: string,
        appsyncApiId: string,
        deployRegion: string
    ): iam.Role {
        // SECURITY FIX: Removed AWS managed policies (IAM4)
        const role = new iam.Role(this, roleName, {
            assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
            description: `Execution role for ${roleName}`,
        });

        // Add custom CloudWatch Logs policy (replaces CloudWatchLogsFullAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                `arn:aws:logs:${deployRegion}:${this.account}:log-group:/aws/bedrock/*`
            ]
        }));

        // Add custom X-Ray policy (replaces AWSXRayDaemonWriteAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords'
            ],
            resources: ['*'] // X-Ray requires wildcard resource
        }));

        // DynamoDB permissions - use ARN strings directly
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
            ],
            resources: [
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${grantTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${grantTableName}/index/*`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${searchEventTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${searchEventTableName}/index/*`,
            ],
        }));

        role.addToPolicy(new iam.PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
            resources: [
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${userProfileTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${userProfileTableName}/index/*`,
            ],
        }));

        // AppSync permissions
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['appsync:GraphQL'],
            resources: [`arn:aws:appsync:${deployRegion}:${this.account}:apis/${appsyncApiId}/*`],
        }));

        // Bedrock model permissions
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            resources: [
                `arn:aws:bedrock:${deployRegion}::foundation-model/anthropic.claude-*`,
                `arn:aws:bedrock:${deployRegion}::foundation-model/us.anthropic.claude-*`,
            ],
        }));

        return role;
    }

    private createEuGrantsSearchRole(
        roleName: string,
        grantTableName: string,
        searchEventTableName: string,
        userProfileTableName: string,
        euCacheBucketName: string,
        appsyncApiId: string,
        deployRegion: string
    ): iam.Role {
        // SECURITY FIX: Removed AWS managed policies (IAM4)
        const role = new iam.Role(this, roleName, {
            assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
            description: `Execution role for ${roleName}`,
        });

        // Add custom CloudWatch Logs policy (replaces CloudWatchLogsFullAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                `arn:aws:logs:${deployRegion}:${this.account}:log-group:/aws/bedrock/*`
            ]
        }));

        // Add custom X-Ray policy (replaces AWSXRayDaemonWriteAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords'
            ],
            resources: ['*'] // X-Ray requires wildcard resource
        }));

        // DynamoDB permissions - use ARN strings directly
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
            ],
            resources: [
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${grantTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${grantTableName}/index/*`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${searchEventTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${searchEventTableName}/index/*`,
            ],
        }));

        role.addToPolicy(new iam.PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
            resources: [
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${userProfileTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${userProfileTableName}/index/*`,
            ],
        }));

        // S3 permissions for EU cache bucket
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [
                `arn:aws:s3:::${euCacheBucketName}`,
                `arn:aws:s3:::${euCacheBucketName}/*`,
            ],
        }));

        // AppSync permissions
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['appsync:GraphQL'],
            resources: [`arn:aws:appsync:${deployRegion}:${this.account}:apis/${appsyncApiId}/*`],
        }));

        // Bedrock model permissions
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            resources: [
                `arn:aws:bedrock:${deployRegion}::foundation-model/anthropic.claude-*`,
                `arn:aws:bedrock:${deployRegion}::foundation-model/us.anthropic.claude-*`,
            ],
        }));

        return role;
    }

    private createProposalGenerationRole(
        proposalTableName: string,
        documentTableName: string,
        userProfileTableName: string,
        proposalsBucketName: string,
        documentBucketName: string,
        knowledgeBaseId: string,
        appsyncApiId: string,
        deployRegion: string,
        pdfConverterArn: string,
        evaluatorArn: string,
        promptArns: string[]  // Add promptArns parameter
    ): iam.Role {
        // SECURITY FIX: Removed AWS managed policies (IAM4)
        const role = new iam.Role(this, 'ProposalGenerationExecutionRole', {
            assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
            description: 'Execution role for Proposal Generation Agent',
        });

        // Add custom CloudWatch Logs policy (replaces CloudWatchLogsFullAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                `arn:aws:logs:${deployRegion}:${this.account}:log-group:/aws/bedrock/*`
            ]
        }));

        // Add custom X-Ray policy (replaces AWSXRayDaemonWriteAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords'
            ],
            resources: ['*'] // X-Ray requires wildcard resource
        }));

        // DynamoDB permissions - use ARN strings directly with specific index names
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
            ],
            resources: [
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${proposalTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${proposalTableName}/index/proposalsByUser`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${proposalTableName}/index/proposalsByGrant`,
            ],
        }));

        role.addToPolicy(new iam.PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
            resources: [
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${documentTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${documentTableName}/index/listDocumentsByStatus`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${documentTableName}/index/listDocumentsByDate`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${userProfileTableName}`,
                // UserProfile has no indexes - removed /index/* line
            ],
        }));

        // S3 permissions
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
            resources: [
                `arn:aws:s3:::${proposalsBucketName}`,
                `arn:aws:s3:::${proposalsBucketName}/*`,
            ],
        }));

        role.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [
                `arn:aws:s3:::${documentBucketName}`,
                `arn:aws:s3:::${documentBucketName}/*`,
            ],
        }));

        // AppSync permissions (specific mutation/query fields)
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['appsync:GraphQL'],
            resources: [
                `arn:aws:appsync:${deployRegion}:${this.account}:apis/${appsyncApiId}/types/Mutation/fields/updateProposal`,
                `arn:aws:appsync:${deployRegion}:${this.account}:apis/${appsyncApiId}/types/Mutation/fields/createProposal`,
                `arn:aws:appsync:${deployRegion}:${this.account}:apis/${appsyncApiId}/types/Query/fields/getProposal`,
                `arn:aws:appsync:${deployRegion}:${this.account}:apis/${appsyncApiId}/types/Query/fields/listProposals`,
            ],
        }));

        // Bedrock Inference Profile (for cross-region routing)
        // us.* profile for US regions, eu.* profile for EU regions
        // Includes both Sonnet 4.5 (other agents) and Opus 4.6 (proposal agent)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
            ],
            resources: [
                `arn:aws:bedrock:${deployRegion}:${this.account}:inference-profile/us.anthropic.claude-sonnet-4-5-*`,
                `arn:aws:bedrock:${deployRegion}:${this.account}:inference-profile/eu.anthropic.claude-sonnet-4-5-*`,
                `arn:aws:bedrock:${deployRegion}:${this.account}:inference-profile/global.anthropic.claude-sonnet-4-5-*`,
                `arn:aws:bedrock:${deployRegion}:${this.account}:inference-profile/us.anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:${deployRegion}:${this.account}:inference-profile/eu.anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:${deployRegion}:${this.account}:inference-profile/global.anthropic.claude-opus-4-6-v1`,
            ],
        }));

        // Bedrock Foundation Models (for cross-region inference routing)
        // us.* profiles can route to any US region; eu.* profiles route within EU
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
            ],
            resources: [
                // Sonnet 4.5 - US regions
                `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                // Sonnet 4.5 - EU regions
                `arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:eu-west-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:eu-west-3::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:eu-central-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:eu-north-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:eu-south-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:eu-south-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
                `arn:aws:bedrock:${deployRegion}::foundation-model/us.anthropic.claude-sonnet-4-5-v2:0`,
                `arn:aws:bedrock:${deployRegion}::foundation-model/eu.anthropic.claude-sonnet-4-5-v2:0`,
                // Opus 4.6 - US cross-region destinations (us.* profile routes to these)
                // NOTE: Opus 4.6 ARNs have NO :0 suffix — add both just in case
                `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                `arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                `arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                // Opus 4.6 - EU cross-region destinations (eu.* profile routes to these)
                `arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                `arn:aws:bedrock:eu-west-3::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:eu-west-3::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                `arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                `arn:aws:bedrock:eu-central-2::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:eu-central-2::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                `arn:aws:bedrock:eu-north-1::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:eu-north-1::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                `arn:aws:bedrock:eu-south-1::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:eu-south-1::foundation-model/anthropic.claude-opus-4-6-v1:0`,
                `arn:aws:bedrock:eu-south-2::foundation-model/anthropic.claude-opus-4-6-v1`,
                `arn:aws:bedrock:eu-south-2::foundation-model/anthropic.claude-opus-4-6-v1:0`,
            ],
        }));

        // Bedrock Knowledge Base Retrieve
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:Retrieve'],
            resources: [`arn:aws:bedrock:${deployRegion}:${this.account}:knowledge-base/${knowledgeBaseId}`],
        }));

        // Bedrock ListPrompts (account-level operation - requires wildcard)
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:ListPrompts'],
            resources: ['*'],
        }));

        // Bedrock GetPrompt - Use specific prompt ARNs from BedrockPromptsStack
        // Prompts are created as CDK resources, so we have their ARNs at deployment time
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:GetPrompt'],
            resources: promptArns,
        }));

        // Bedrock ListKnowledgeBases (account-level operation - requires wildcard)
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:ListKnowledgeBases'],
            resources: ['*'],
        }));

        // Agent-to-Agent (A2A) permissions - scoped to specific agents
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock-agentcore:InvokeAgentRuntime'],
            resources: [
                pdfConverterArn,
                `${pdfConverterArn}/*`,
                evaluatorArn,
                `${evaluatorArn}/*`
            ],
        }));

        return role;
    }

    private createPdfConverterRole(proposalsBucketName: string, deployRegion: string): iam.Role {
        // SECURITY FIX: Removed AWS managed policies (IAM4)
        const role = new iam.Role(this, 'PdfConverterExecutionRole', {
            assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
            description: 'Execution role for PDF Converter Agent',
        });

        // Add custom CloudWatch Logs policy (replaces CloudWatchLogsFullAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                `arn:aws:logs:${deployRegion}:${this.account}:log-group:/aws/bedrock/*`
            ]
        }));

        // Add custom X-Ray policy (replaces AWSXRayDaemonWriteAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords'
            ],
            resources: ['*'] // X-Ray requires wildcard resource
        }));

        // S3 permissions
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
            resources: [
                `arn:aws:s3:::${proposalsBucketName}`,
                `arn:aws:s3:::${proposalsBucketName}/*`,
            ],
        }));

        // Bedrock model permissions (for any text processing)
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: [
                `arn:aws:bedrock:${deployRegion}::foundation-model/anthropic.claude-*`,
                `arn:aws:bedrock:${deployRegion}::foundation-model/us.anthropic.claude-*`,
            ],
        }));

        return role;
    }

    private createProposalEvaluatorRole(
        proposalTableName: string,
        appsyncApiId: string,
        deployRegion: string
    ): iam.Role {
        // SECURITY FIX: Removed AWS managed policies (IAM4)
        const role = new iam.Role(this, 'ProposalEvaluatorExecutionRole', {
            assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
            description: 'Execution role for Proposal Evaluator Agent',
        });

        // Add custom CloudWatch Logs policy (replaces CloudWatchLogsFullAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                `arn:aws:logs:${deployRegion}:${this.account}:log-group:/aws/bedrock/*`
            ]
        }));

        // Add custom X-Ray policy (replaces AWSXRayDaemonWriteAccess)
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords'
            ],
            resources: ['*'] // X-Ray requires wildcard resource
        }));

        // DynamoDB permissions - use ARN strings directly
        role.addToPolicy(new iam.PolicyStatement({
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
            ],
            resources: [
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${proposalTableName}`,
                `arn:aws:dynamodb:${deployRegion}:${this.account}:table/${proposalTableName}/index/*`,
            ],
        }));

        // AppSync permissions
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['appsync:GraphQL'],
            resources: [`arn:aws:appsync:${deployRegion}:${this.account}:apis/${appsyncApiId}/*`],
        }));

        // Bedrock model permissions
        role.addToPolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            resources: [
                `arn:aws:bedrock:${deployRegion}::foundation-model/anthropic.claude-*`,
                `arn:aws:bedrock:${deployRegion}::foundation-model/us.anthropic.claude-*`,
            ],
        }));

        return role;
    }
}
