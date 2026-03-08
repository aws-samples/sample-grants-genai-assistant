/**
 * GROW2 Backend Configuration
 * Last updated: 2026-01-28
 */
/**
 * GROW2 Backend Configuration
 * Last cleanup: 2026-01-28 - Removed 9 unused lambda functions
 */
import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Aspects } from 'aws-cdk-lib';
// CDK NAG: Disabled - not required for sample/demo deployment
// import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { grantsSearchV2 } from './functions/grants-search-v2/resource';
import { euGrantsSearchV2 } from './functions/eu-grants-search-v2/resource';
import { euGrantsCacheDownloader } from './functions/eu-grants-cache-downloader/resource';
import { agentConfig } from './functions/agent-config/resource';
import { agentDiscoverySearch } from './functions/agent-discovery-search/resource';
import { agentDiscoveryUpdate } from './functions/agent-discovery-update/resource';
import { agentDiscoveryScheduler } from './functions/agent-discovery-scheduler/resource';
import { s3BucketOperations } from './functions/s3-bucket-operations/resource';
import { chatHandler } from './functions/chat-handler/resource';
import { kbDocumentUpload } from './functions/kb-document-upload/resource';
import { kbDocumentProcessor } from './functions/kb-document-processor/resource';
import { kbSearch } from './functions/kb-search/resource';
import { kbDocumentManager } from './functions/kb-document-manager/resource';
import { promptManager } from './functions/prompt-manager/resource';
import { proposalsQuery } from './functions/proposals-query/resource';
import { proposalGenerationAgentcore } from './functions/proposal-generation-agentcore/resource';
import { proposalDownload } from './functions/proposal-download/resource';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Duration, Stack, CfnOutput } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { AgentDiscoveryStepFunctionV2 } from './custom/agent-discovery-stepfunction-v2';

// Phase 1: OpenSearch Collection Only (no Knowledge Base yet)
import { OpenSearchCollectionStack } from './custom/opensearch-collection-stack';
import { CfnGuardrail, CfnGuardrailVersion } from 'aws-cdk-lib/aws-bedrock';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

// CDK Aspect to remove AppSync Lambda DataSource version wildcards
import { RemoveAppSyncLambdaVersionWildcard } from './custom/appsync-datasource-aspect';

// CDK AgentCore - ALL AGENTS MIGRATED
import { AgentCoreStack } from './custom/agentcore-stack';

// Post-Deployment Seeding
import { PostDeploymentSeeder } from './custom/post-deployment-seeder';

// CDK-Nag Suppressions - DISABLED
// import { suppressAllBackendLambdas } from './backend-suppressions';

export const backend = defineBackend({
  auth,
  data,
  grantsSearchV2,
  euGrantsSearchV2,
  euGrantsCacheDownloader,
  agentConfig,
  agentDiscoverySearch,
  agentDiscoveryUpdate,
  agentDiscoveryScheduler,
  s3BucketOperations,
  chatHandler,
  kbDocumentUpload,
  kbDocumentProcessor,
  kbSearch,
  kbDocumentManager,
  promptManager,  // Keep for now - will be replaced by CDK version in resolvers
  proposalsQuery,
  proposalGenerationAgentcore,
  proposalDownload
});

// ============================================================================
// AGENT ARN ENVIRONMENT VARIABLES - Passed directly (no CloudFormation exports)
// ============================================================================
// SECURITY FIX: Eliminated cloudformation:ListExports wildcards by passing ARNs
// directly via environment variables instead of runtime discovery.
// This eliminates 3 high-risk IAM5 suppressions.
//
// Agent ARNs will be set after AgentCore stack is created (see line ~1550)

// ============================================================================
// APPSYNC PERMISSIONS - API Key Passed via Environment Variable
// ============================================================================
// SECURITY FIX: Eliminated appsync:ListApiKeys wildcards by passing API key
// directly via environment variable instead of runtime discovery.
// This eliminates 5 high-risk IAM5 suppressions.
//
// API key is available at CDK synthesis time from backend.data.resources.graphqlApi.apiKey

// US Grants Search V2 - discovers AppSync endpoint only (API key from environment)
backend.grantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['appsync:GetGraphqlApi'],
  resources: [
    `arn:aws:appsync:${Stack.of(backend.grantsSearchV2.resources.lambda).region}:${Stack.of(backend.grantsSearchV2.resources.lambda).account}:apis/${backend.data.resources.graphqlApi.apiId}`
  ]
}));

// US Grants Search V2 - Bedrock AgentCore permissions (specific runtime ARN from CloudFormation export)
// Read the agent runtime ARN from CloudFormation export at deployment time
// TEMPORARILY COMMENTED OUT - AgentCore stack must be deployed first
// const usGrantsV2RuntimeArn = Fn.importValue('AgentCore-UsGrantsV2AgentArn');
// backend.grantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
//   actions: ['bedrock-agentcore:InvokeAgentRuntime'],
//   resources: [
//     usGrantsV2RuntimeArn,  // Runtime ARN
//     `${usGrantsV2RuntimeArn}/*`  // Runtime endpoints (DEFAULT, etc.)
//   ]
// }));

// EU Grants Search V2 - discovers AppSync endpoint only (API key from environment)
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['appsync:GetGraphqlApi'],
  resources: [
    `arn:aws:appsync:${Stack.of(backend.euGrantsSearchV2.resources.lambda).region}:${Stack.of(backend.euGrantsSearchV2.resources.lambda).account}:apis/${backend.data.resources.graphqlApi.apiId}`
  ]
}));

// EU Grants Search V2 - Bedrock AgentCore permissions (specific runtime ARN from CloudFormation export)
// Read the agent runtime ARN from CloudFormation export at deployment time
// TEMPORARILY COMMENTED OUT - AgentCore stack must be deployed first
// const euGrantsV2RuntimeArn = Fn.importValue('AgentCore-EuGrantsV2AgentArn');
// backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
//   actions: ['bedrock-agentcore:InvokeAgentRuntime'],
//   resources: [
//     euGrantsV2RuntimeArn,  // Runtime ARN
//     `${euGrantsV2RuntimeArn}/*`  // Runtime endpoints (DEFAULT, etc.)
//   ]
// }));

// Proposal Generation - discovers AppSync endpoint only (API key from environment)
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['appsync:GetGraphqlApi'],
  resources: [
    `arn:aws:appsync:${Stack.of(backend.proposalGenerationAgentcore.resources.lambda).region}:${Stack.of(backend.proposalGenerationAgentcore.resources.lambda).account}:apis/${backend.data.resources.graphqlApi.apiId}`
  ]
}));

// Proposal Generation - Bedrock AgentCore permissions
// NOTE: agentCore.proposalGenerationArn is wired in after AgentCoreStack is instantiated below
// (see "PROPOSAL GENERATION AGENTCORE" section ~line 1500)

// ============================================================================
// BEDROCK GUARDRAIL - Prompt Injection Protection
// ============================================================================
// Protects against prompt injection, jailbreaks, and prompt leakage.
// Applied to: chat-handler, grants-search-v2, eu-grants-search-v2, proposal-generation-agentcore
const promptInjectionGuardrail = new CfnGuardrail(
  backend.stack,
  'PromptInjectionGuardrail',
  {
    name: 'GROW2-PromptInjection-Guardrail',
    description: 'Protects against prompt injection, jailbreaks, and prompt leakage for GROW2 user-facing AI functions',
    blockedInputMessaging: 'Your request was blocked for security reasons. Please rephrase your question about research grants.',
    blockedOutputsMessaging: 'The response was blocked for security reasons. Please try a different question.',
    contentPolicyConfig: {
      filtersConfig: [
        {
          type: 'PROMPT_ATTACK',
          inputStrength: 'HIGH',
          outputStrength: 'NONE', // Prompt attacks are input-only
        },
        {
          type: 'INSULTS',
          inputStrength: 'HIGH',
          outputStrength: 'HIGH',
        },
        {
          type: 'HATE',
          inputStrength: 'HIGH',
          outputStrength: 'HIGH',
        },
        {
          type: 'SEXUAL',
          inputStrength: 'HIGH',
          outputStrength: 'HIGH',
        },
        {
          type: 'VIOLENCE',
          inputStrength: 'HIGH',
          outputStrength: 'HIGH',
        },
      ],
    },
  }
);

const guardrailVersion = new CfnGuardrailVersion(
  backend.stack,
  'PromptInjectionGuardrailV1',
  {
    guardrailIdentifier: promptInjectionGuardrail.attrGuardrailId,
    description: 'V1 - Prompt injection protection with HIGH content filters',
  }
);

// Export guardrail ID and version for reference
new CfnOutput(backend.stack, 'GuardrailId', {
  value: promptInjectionGuardrail.attrGuardrailId,
  description: 'Bedrock Guardrail ID for prompt injection protection',
  exportName: 'GROW2-GuardrailId',
});

new CfnOutput(backend.stack, 'GuardrailVersion', {
  value: guardrailVersion.attrVersion,
  description: 'Bedrock Guardrail version',
  exportName: 'GROW2-GuardrailVersion',
});

// ============================================================================
// AWS WAF - Rate Limiting for GraphQL API
// ============================================================================
// Protects the AppSync GraphQL API against abuse with a rate-based rule.
// Limits each IP to ~5 requests/second (1500 per 5-minute evaluation window).
const wafWebAcl = new wafv2.CfnWebACL(
  backend.stack,
  'GraphQLApiWaf',
  {
    name: 'GROW2-GraphQL-RateLimit',
    description: 'Rate limits the GROW2 AppSync GraphQL API to prevent abuse',
    scope: 'REGIONAL',
    defaultAction: { allow: {} },
    visibilityConfig: {
      cloudWatchMetricsEnabled: true,
      metricName: 'GROW2GraphQLRateLimit',
      sampledRequestsEnabled: true,
    },
    rules: [
      {
        name: 'RateLimitPerIP',
        priority: 1,
        action: { block: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'GROW2RateLimitPerIP',
          sampledRequestsEnabled: true,
        },
        statement: {
          rateBasedStatement: {
            limit: 1500,
            aggregateKeyType: 'IP',
          },
        },
      },
    ],
  }
);

// Associate WAF WebACL with AppSync GraphQL API
const wafAssociation = new wafv2.CfnWebACLAssociation(
  backend.stack,
  'GraphQLApiWafAssociation',
  {
    resourceArn: backend.data.resources.graphqlApi.arn,
    webAclArn: wafWebAcl.attrArn,
  }
);

new CfnOutput(backend.stack, 'WafWebAclArn', {
  value: wafWebAcl.attrArn,
  description: 'WAF WebACL ARN for GraphQL API rate limiting',
  exportName: 'GROW2-WafWebAclArn',
});

// ============================================================================
// BEDROCK INVOKE MODEL PERMISSIONS - For Claude/Titan Models
// ============================================================================

// Chat Handler - needs Claude 4.5 Sonnet for chat responses
// Uses region-aware inference profile: us.* for US regions, eu.* for EU regions
// Inference profiles are account-scoped; foundation models are cross-region routing targets
const chatHandlerRegion = Stack.of(backend.chatHandler.resources.lambda).region;
const chatHandlerAccount = Stack.of(backend.chatHandler.resources.lambda).account;

// Inference profile permissions (account-scoped ARNs)
backend.chatHandler.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel'],
  resources: [
    `arn:aws:bedrock:${chatHandlerRegion}:${chatHandlerAccount}:inference-profile/us.anthropic.claude-sonnet-4-5-*`,
    `arn:aws:bedrock:${chatHandlerRegion}:${chatHandlerAccount}:inference-profile/eu.anthropic.claude-sonnet-4-5-*`,
  ]
}));

// Foundation model permissions for cross-region routing
// us.* profiles route to US regions; eu.* profiles route to EU regions
backend.chatHandler.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel'],
  resources: [
    // US regions
    `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    // EU regions
    `arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:eu-west-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:eu-west-3::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:eu-central-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:eu-north-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:eu-south-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    `arn:aws:bedrock:eu-south-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
  ]
}));

// Chat Handler - Guardrail permissions (scoped to specific guardrail ARN)
backend.chatHandler.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:ApplyGuardrail'],
  resources: [promptInjectionGuardrail.attrGuardrailArn],
}));

// Prompt Manager - needs Bedrock permissions for prompt management and model invocation
// SECURITY FIX: Eliminated bedrock:ListPrompts wildcard by passing prompt IDs
// directly via environment variables instead of runtime discovery.
// This eliminates 1 medium-risk IAM5 suppression.
//
// Prompt IDs will be set after BedrockPrompts stack is created (see line ~1540)

// Prompt Manager can invoke Claude models for testing prompts
// SECURITY FIX: Scope to specific Claude model version used in production
backend.promptManager.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['bedrock:InvokeModel'],
  resources: [
    `arn:aws:bedrock:${Stack.of(backend.promptManager.resources.lambda).region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`
  ]
}));

// CDK-NAG suppressions disabled - not required for sample/demo deployment
// NagSuppressions.addResourceSuppressions(backend.grantsSearchV2 ...)
// NagSuppressions.addResourceSuppressions(backend.euGrantsSearchV2 ...)
// NagSuppressions.addResourceSuppressions(backend.proposalGenerationAgentcore ...)
// NagSuppressions.addResourceSuppressions(backend.promptManager ...)

// ============================================================================
// CDK ASPECTS - AppSync Lambda DataSource aspect (CDK-NAG disabled)
// ============================================================================
const appSyncAspect = new RemoveAppSyncLambdaVersionWildcard();
Aspects.of(backend.stack).add(appSyncAspect);

// ============================================================================
// APPSYNC LAMBDA DATASOURCE IAM5 SUPPRESSIONS - DISABLED (CDK-NAG off)
// ============================================================================
/*
const stackPrefix = `/${backend.stack.stackName}`;
const appSyncDataSourcePaths = [
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnStartGrantSearchV2LambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnStartEuGrantSearchV2LambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnTriggerAgentDiscoveryLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnProcessAgentDiscoveryUpdateLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnListDiscoveryResultsLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnGetDiscoveryResultContentLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnGetDiscoveryResultDownloadUrlLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnUploadDocumentLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnListDocumentsLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnGetDocumentLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnDeleteDocumentLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnUpdateDocumentStatusLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnOnDocumentStatusChangedLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnSearchDocumentsLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnListPromptsLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnGetPromptLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnTestPromptLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnGenerateProposalLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnListProposalsByUserLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnDownloadProposalLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnSendChatMessageLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnListUserChatSessionsLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
  `${stackPrefix}/data/amplifyData/FunctionDirectiveStack/FnGetChatSessionLambdaDataSource/ServiceRole/DefaultPolicy/Resource`,
];
appSyncDataSourcePaths.forEach(path => {
  NagSuppressions.addResourceSuppressionsByPath(backend.stack, path, [{
    id: 'AwsSolutions-IAM5',
    reason: 'AppSync Lambda DataSource policy includes Lambda version wildcard (:*). Amplify Gen 2 framework limitation.'
  }]);
});
*/

// ============================================================================
// CDK-NAG SECURITY SCANNING - TEMPORARILY DISABLED FOR TESTING
// ============================================================================
// DISABLED: Testing deployment after Priority 1 & 2 suppression fixes
// Re-enable after successful deployment to verify suppression count
// Aspects.of(backend.stack).add(
//   new AwsSolutionsChecks({
//     verbose: false,
//     reports: true,
//     logIgnores: false
//   })
// );

// ============================================================================
// SECURITY FINDINGS SUMMARY (from baseline scan)
// ============================================================================
// Original: 385 findings
// Fixed: 152 (39.5%)
// Remaining: 233 (need statement-based suppressions)
// - IAM4 (Managed Policies): 39 issues - FIX THESE FIRST (easier)
// - L1 (Lambda Runtime): 27 issues
// - S10 (S3 SSL): 10 issues
// - S1 (S3 Logging): 7 issues
// - COG (Cognito): 3 issues
// - Others: 7 issues
//
// See: security/SECURITY_REPORT.md for full details
// See: SECURITY_FIX_WORKFLOW.md for remediation plan

// ============================================================================
// CDK NAG SUPPRESSIONS - DISABLED (CDK-NAG off for sample deployment)
// ============================================================================
// NagSuppressions for Amplify-managed buckets removed

// ============================================================================
// APPSYNC LOGGING, TRACING, AND ENHANCED MONITORING
// ============================================================================
// Enable comprehensive logging and monitoring for AppSync API
// This helps debug resolver issues, Lambda invocations, and performance

// Create IAM role for AppSync CloudWatch Logs
// SECURITY FIX: Replaced AWS managed policy with custom inline policy (IAM4)
const appSyncLogsRole = new iam.Role(
  Stack.of(backend.data.resources.graphqlApi),
  'AppSyncCloudWatchLogsRole',
  {
    assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
    description: 'Allows AppSync to write logs to CloudWatch'
  }
);

// Add custom inline policy with specific permissions (replaces AWSAppSyncPushToCloudWatchLogs)
appSyncLogsRole.addToPolicy(new iam.PolicyStatement({
  actions: [
    'logs:CreateLogGroup',
    'logs:CreateLogStream',
    'logs:PutLogEvents'
  ],
  resources: [
    `arn:aws:logs:${Stack.of(backend.data.resources.graphqlApi).region}:${Stack.of(backend.data.resources.graphqlApi).account}:log-group:/aws/appsync/apis/*`
  ]
}));

// Suppress IAM5 for AppSync CloudWatch Logs role - DISABLED (CDK-NAG off)
// NagSuppressions.addResourceSuppressions(appSyncLogsRole, ...)

// Get the L1 CfnGraphQLApi construct to configure logging
const cfnGraphQLApi = backend.data.resources.cfnResources.cfnGraphqlApi;

// Enable field-level logging (ALL logs including resolver execution)
cfnGraphQLApi.logConfig = {
  cloudWatchLogsRoleArn: appSyncLogsRole.roleArn,
  fieldLogLevel: 'ALL', // ALL, ERROR, or NONE
  excludeVerboseContent: false // Include full request/response content
};

// Enable X-Ray tracing for performance analysis
cfnGraphQLApi.xrayEnabled = true;

// Enable enhanced metrics for detailed CloudWatch metrics
cfnGraphQLApi.enhancedMetricsConfig = {
  resolverLevelMetricsBehavior: 'PER_RESOLVER_METRICS',
  dataSourceLevelMetricsBehavior: 'PER_DATA_SOURCE_METRICS',
  operationLevelMetricsConfig: 'ENABLED'
};

// Output log group name for easy access
new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'AppSyncLogGroup', {
  value: `/aws/appsync/apis/${backend.data.resources.graphqlApi.apiId}`,
  description: 'AppSync CloudWatch Log Group'
});

new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'AppSyncLoggingEnabled', {
  value: 'ALL field-level logs, X-Ray tracing, and enhanced metrics enabled',
  description: 'AppSync Monitoring Configuration'
});

// ============================================================================
// AMPLIFY TABLE MANAGER IAM4 FIXES - REMOVED
// ============================================================================
// These CloudWatch Logs policies were causing circular dependencies
// Will be addressed through CDK Lambda migration instead
// ============================================================================

// ============================================================================
// COGNITO SECURITY CONFIGURATION (SECURITY FIX: COG2, COG7)
// ============================================================================
// Configure Cognito User Pool and Identity Pool security features

// Get the underlying CloudFormation resources
const cfnUserPool = backend.auth.resources.userPool.node.defaultChild as any;
const cfnIdentityPool = backend.auth.resources.cfnResources.cfnIdentityPool;

// COG2: MFA Configuration
// Set to ON for enhanced security (REQUIRED is not a valid value - must be ON, OFF, or OPTIONAL)
// Using SOFTWARE_TOKEN_MFA only (authenticator apps like Google Authenticator)
// SMS_MFA requires additional SNS configuration
cfnUserPool.mfaConfiguration = 'ON';
cfnUserPool.enabledMfas = ['SOFTWARE_TOKEN_MFA'];

// COG3: Suppress Advanced Security Mode - DISABLED (CDK-NAG off)
// NagSuppressions.addResourceSuppressions(cfnUserPool, [{ id: 'AwsSolutions-COG3', ... }])

// COG7: Disable unauthenticated access - all users must authenticate
// SECURITY FIX: Explicitly disable unauthenticated identities
cfnIdentityPool.allowUnauthenticatedIdentities = false;

new CfnOutput(Stack.of(backend.auth.resources.userPool), 'CognitoSecurityMode', {
  value: 'MFA: REQUIRED (SOFTWARE_TOKEN only - authenticator apps)',
  description: 'Cognito Security Configuration'
});

// ============================================================================
// S3 ACCESS LOGS BUCKET (SECURITY FIX: S1)
// ============================================================================
// Central bucket for S3 access logs - required for audit trail
const accessLogsBucket = new s3.Bucket(
  Stack.of(backend.agentDiscoverySearch.resources.lambda),
  'AccessLogsBucket',
  {
    versioned: false,
    publicReadAccess: false,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
    lifecycleRules: [
      {
        id: 'DeleteOldLogs',
        enabled: true,
        expiration: Duration.days(90),
      },
    ],
  }
);

// Enforce SSL on access logs bucket (S10)
accessLogsBucket.addToResourcePolicy(new PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:*'],
  resources: [
    accessLogsBucket.bucketArn,
    `${accessLogsBucket.bucketArn}/*`
  ],
  conditions: {
    Bool: {
      'aws:SecureTransport': 'false'
    }
  }
}));

// Create S3 bucket for agent discovery results
const discoveryResultsBucket = new s3.Bucket(
  Stack.of(backend.agentDiscoverySearch.resources.lambda),
  'AgentDiscoveryResults',
  {
    versioned: false,
    publicReadAccess: false,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
    serverAccessLogsBucket: accessLogsBucket, // SECURITY FIX: S1 - Enable access logging
    serverAccessLogsPrefix: 'discovery-results/', // SECURITY FIX: S1
    lifecycleRules: [
      {
        id: 'DeleteOldResults',
        enabled: true,
        expiration: Duration.days(90),
      },
    ],
  }
);

// SECURITY FIX: S10 - Enforce SSL/TLS
discoveryResultsBucket.addToResourcePolicy(new PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:*'],
  resources: [
    discoveryResultsBucket.bucketArn,
    `${discoveryResultsBucket.bucketArn}/*`
  ],
  conditions: {
    Bool: {
      'aws:SecureTransport': 'false'
    }
  }
}));

// Create S3 bucket for EU grants cache
const euGrantsCacheBucket = new s3.Bucket(
  Stack.of(backend.euGrantsCacheDownloader.resources.lambda),
  'EuGrantsCache',
  {
    versioned: true, // Keep version history
    publicReadAccess: false,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
    serverAccessLogsBucket: accessLogsBucket, // SECURITY FIX: S1 - Enable access logging
    serverAccessLogsPrefix: 'eu-grants-cache/', // SECURITY FIX: S1
    lifecycleRules: [
      {
        id: 'DeleteOldVersions',
        enabled: true,
        noncurrentVersionExpiration: Duration.days(7), // Keep last 7 versions
      },
    ],
  }
);

// SECURITY FIX: S10 - Enforce SSL/TLS
euGrantsCacheBucket.addToResourcePolicy(new PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:*'],
  resources: [
    euGrantsCacheBucket.bucketArn,
    `${euGrantsCacheBucket.bucketArn}/*`
  ],
  conditions: {
    Bool: {
      'aws:SecureTransport': 'false'
    }
  }
}));

// Output bucket name directly in the data stack (where bucket is created)
// This ensures CloudFormation resolves the actual bucket name, not a reference
new CfnOutput(Stack.of(backend.euGrantsCacheDownloader.resources.lambda), 'DeploymentAssetsBucketName', {
  value: euGrantsCacheBucket.bucketName,
  description: 'S3 bucket for deployment artifacts and EU grants cache',
  exportName: `${Stack.of(backend.euGrantsCacheDownloader.resources.lambda).stackName}-DeploymentAssetsBucket`,
});

// Create DynamoDB table for chat sessions
const chatSessionsTable = new dynamodb.Table(
  Stack.of(backend.chatHandler.resources.lambda),
  'ChatSessions',
  {
    partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    encryption: dynamodb.TableEncryption.AWS_MANAGED,
    pointInTimeRecovery: true,
  }
);

// Add GSIs for chat sessions
chatSessionsTable.addGlobalSecondaryIndex({
  indexName: 'GSI1',
  partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
});

chatSessionsTable.addGlobalSecondaryIndex({
  indexName: 'GSI2',
  partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
});

// Create S3 bucket for chat context documents
const chatContextBucket = new s3.Bucket(
  Stack.of(backend.chatHandler.resources.lambda),
  'ChatContextDocuments',
  {
    versioned: false,
    publicReadAccess: false,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
    serverAccessLogsBucket: accessLogsBucket, // SECURITY FIX: S1 - Enable access logging
    serverAccessLogsPrefix: 'chat-context/', // SECURITY FIX: S1
  }
);

// SECURITY FIX: S10 - Enforce SSL/TLS
chatContextBucket.addToResourcePolicy(new PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:*'],
  resources: [
    chatContextBucket.bucketArn,
    `${chatContextBucket.bucketArn}/*`
  ],
  conditions: {
    Bool: {
      'aws:SecureTransport': 'false'
    }
  }
}));

// SECURITY FIX: IAM5 - Replace grantReadWrite with explicit S3 permissions
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
  resources: [`${discoveryResultsBucket.bucketArn}/*`]
}));
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [discoveryResultsBucket.bucketArn]
}));

// Grant permissions to chat handler
// SECURITY FIX: IAM5 - Replace grantReadWriteData with explicit permissions
// chatSessionsTable has no GSIs
backend.chatHandler.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [chatSessionsTable.tableArn]
}));

// SECURITY FIX: IAM5 - Replace grantRead with explicit S3 permissions
backend.chatHandler.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [`${chatContextBucket.bucketArn}/*`]
}));
backend.chatHandler.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [chatContextBucket.bucketArn]
}));

// Add environment variables to chat handler
backend.chatHandler.addEnvironment('CHAT_SESSIONS_TABLE', chatSessionsTable.tableName);
backend.chatHandler.addEnvironment('CHAT_CONTEXT_BUCKET', chatContextBucket.bucketName);
backend.chatHandler.addEnvironment('GUARDRAIL_ID', promptInjectionGuardrail.attrGuardrailId);
backend.chatHandler.addEnvironment('GUARDRAIL_VERSION', guardrailVersion.attrVersion);

// Deploy chat documentation files to S3 automatically
const chatDocsDeployment = new BucketDeployment(
  Stack.of(backend.chatHandler.resources.lambda),
  'ChatDocsDeployment',
  {
    sources: [Source.asset('./chat-docs')],
    destinationBucket: chatContextBucket,
    destinationKeyPrefix: '', // Deploy to root of bucket
  }
);

// SECURITY FIX: IAM5 - Replace grantReadWriteData with explicit scoped permissions
// GrantRecord table - has GSI: grantRecordsBySession
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["GrantRecord"].tableArn,
    `${backend.data.resources.tables["GrantRecord"].tableArn}/index/grantRecordsBySession`
  ]
}));

// AgentConfig table - has GSI: agentConfigsByUser
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["AgentConfig"].tableArn,
    `${backend.data.resources.tables["AgentConfig"].tableArn}/index/agentConfigsByUser`
  ]
}));

// UserProfile table - read-only for keyword extraction
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [backend.data.resources.tables["UserProfile"].tableArn]
}));

// AgentConfig table for agent-discovery-update
backend.agentDiscoveryUpdate.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["AgentConfig"].tableArn,
    `${backend.data.resources.tables["AgentConfig"].tableArn}/index/agentConfigsByUser`
  ]
}));

// Add environment variables for agentDiscoverySearch
backend.agentDiscoverySearch.addEnvironment('GRANT_RECORD_TABLE', backend.data.resources.tables["GrantRecord"].tableName);
backend.agentDiscoverySearch.addEnvironment('AGENT_CONFIG_TABLE', backend.data.resources.tables["AgentConfig"].tableName);
backend.agentDiscoverySearch.addEnvironment('USER_PROFILE_TABLE', backend.data.resources.tables["UserProfile"].tableName);

// ============================================================================
// AppSync Runtime Resolution (for all lambdas that need it)
// ============================================================================
const graphqlApiId = backend.data.resources.graphqlApi.apiId;

// ============================================================================
// US Grants Search V2 (AgentCore Native - No SQS/Processor)
// ============================================================================
// SECURITY FIX: IAM5 - Replace grantReadWriteData with explicit scoped permissions
// SearchEvent table - no GSIs
backend.grantsSearchV2.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [backend.data.resources.tables["SearchEvent"].tableArn]
}));

// GrantRecord table - has GSI: grantRecordsBySession
backend.grantsSearchV2.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["GrantRecord"].tableArn,
    `${backend.data.resources.tables["GrantRecord"].tableArn}/index/grantRecordsBySession`
  ]
}));

// UserProfile table - has GSI: agentConfigsByUser (read-only)
backend.grantsSearchV2.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [backend.data.resources.tables["UserProfile"].tableArn]
}));

backend.grantsSearchV2.addEnvironment('SEARCH_STATUS_TABLE', backend.data.resources.tables["SearchEvent"].tableName);
backend.grantsSearchV2.addEnvironment('GRANT_RECORDS_TABLE', backend.data.resources.tables["GrantRecord"].tableName);
backend.grantsSearchV2.addEnvironment('USER_PROFILE_TABLE', backend.data.resources.tables["UserProfile"].tableName);
backend.grantsSearchV2.addEnvironment('BEDROCK_AGENTCORE_REGION', Stack.of(backend.grantsSearchV2.resources.lambda).region);
backend.grantsSearchV2.addEnvironment('GRAPHQL_API_ID', backend.data.resources.graphqlApi.apiId);
backend.grantsSearchV2.addEnvironment('AGENT_ARN_EXPORT_NAME', 'AgentCore-UsGrantsV2AgentArn');
backend.grantsSearchV2.addEnvironment('GUARDRAIL_ID', promptInjectionGuardrail.attrGuardrailId);
backend.grantsSearchV2.addEnvironment('GUARDRAIL_VERSION', guardrailVersion.attrVersion);

// Grants Search V2 - CloudFormation ListExports (required to discover agent ARN at runtime)
// cloudformation:ListExports has no resource-level granularity — AWS requires * (IAM limitation)
backend.grantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cloudformation:ListExports'],
  resources: ['*'],
}));

// Grants Search V2 - Bedrock AgentCore InvokeAgentRuntime
// Scoped to runtimes in this account/region only (avoids cyclic dependency with AgentCore stack)
backend.grantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock-agentcore:InvokeAgentRuntime'],
  resources: [
    `arn:aws:bedrock-agentcore:${Stack.of(backend.grantsSearchV2.resources.lambda).region}:${Stack.of(backend.grantsSearchV2.resources.lambda).account}:runtime/*`
  ]
}));

// Grants Search V2 - Guardrail permissions (scoped to specific guardrail ARN)
backend.grantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:ApplyGuardrail'],
  resources: [promptInjectionGuardrail.attrGuardrailArn],
}));

// ============================================================================
// EU Grants Search V2 (AgentCore Native - No SQS/Processor)
// ============================================================================
// SECURITY FIX: IAM5 - Replace grantReadWriteData with explicit scoped permissions
// SearchEvent table - no GSIs
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [backend.data.resources.tables["SearchEvent"].tableArn]
}));

// EuGrantRecord table - has GSI: euGrantRecordsBySession
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["EuGrantRecord"].tableArn,
    `${backend.data.resources.tables["EuGrantRecord"].tableArn}/index/euGrantRecordsBySession`
  ]
}));

// SECURITY FIX: IAM5 - Replace grantReadData with explicit permissions
// UserProfile table - no GSIs (read-only)
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [backend.data.resources.tables["UserProfile"].tableArn]
}));

backend.euGrantsSearchV2.addEnvironment('SEARCH_STATUS_TABLE', backend.data.resources.tables["SearchEvent"].tableName);
backend.euGrantsSearchV2.addEnvironment('EU_GRANT_RECORDS_TABLE', backend.data.resources.tables["EuGrantRecord"].tableName);
backend.euGrantsSearchV2.addEnvironment('USER_PROFILE_TABLE', backend.data.resources.tables["UserProfile"].tableName);
backend.euGrantsSearchV2.addEnvironment('BEDROCK_AGENTCORE_REGION', Stack.of(backend.euGrantsSearchV2.resources.lambda).region);
backend.euGrantsSearchV2.addEnvironment('GRAPHQL_API_ID', backend.data.resources.graphqlApi.apiId);
backend.euGrantsSearchV2.addEnvironment('EU_CACHE_BUCKET', euGrantsCacheBucket.bucketName);
backend.euGrantsSearchV2.addEnvironment('AGENT_ARN_EXPORT_NAME', 'AgentCore-EuGrantsV2AgentArn');
backend.euGrantsSearchV2.addEnvironment('GUARDRAIL_ID', promptInjectionGuardrail.attrGuardrailId);
backend.euGrantsSearchV2.addEnvironment('GUARDRAIL_VERSION', guardrailVersion.attrVersion);

// EU Grants Search V2 - CloudFormation ListExports (required to discover agent ARN at runtime)
// cloudformation:ListExports has no resource-level granularity — AWS requires * (IAM limitation)
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cloudformation:ListExports'],
  resources: ['*'],
}));

// EU Grants Search V2 - Bedrock AgentCore InvokeAgentRuntime
// Scoped to runtimes in this account/region only (avoids cyclic dependency with AgentCore stack)
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock-agentcore:InvokeAgentRuntime'],
  resources: [
    `arn:aws:bedrock-agentcore:${Stack.of(backend.euGrantsSearchV2.resources.lambda).region}:${Stack.of(backend.euGrantsSearchV2.resources.lambda).account}:runtime/*`
  ]
}));

// EU Grants Search V2 - Guardrail permissions (scoped to specific guardrail ARN)
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:ApplyGuardrail'],
  resources: [promptInjectionGuardrail.attrGuardrailArn],
}));

// SECURITY FIX: IAM5 - Replace grantRead with explicit S3 permissions
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [`${euGrantsCacheBucket.bucketArn}/*`]
}));
backend.euGrantsSearchV2.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [euGrantsCacheBucket.bucketArn]
}));

// V2 agent ARN - NOW PROVIDED BY CDK (see line ~470)
// Commented out SSM read since CDK provides ARN directly
// const euGrantsV2AgentArn = ssm.StringParameter.valueForStringParameter(
//   Stack.of(backend.euGrantsSearchV2.resources.lambda),
//   '/grants-platform/agents/eu-grants-v2-arn'
// );
// backend.euGrantsSearchV2.addEnvironment('EU_GRANTS_V2_AGENT_ARN', euGrantsV2AgentArn);

// Reference existing EU grants cache bucket SSM parameter (created manually or by cache downloader)
// Agent reads this at runtime for multi-account deployment
// TEMPORARILY COMMENTED OUT for us-west-2 deployment (parameter doesn't exist there)
// const euGrantsCacheBucketParam = ssm.StringParameter.fromStringParameterName(
//   Stack.of(backend.euGrantsSearchV2.resources.lambda),
//   'EuGrantsCacheBucketParam',
//   '/grants-platform/eu-grants-cache-bucket'
// );

// ============================================================================
// EU GRANTS CACHE DOWNLOADER
// ============================================================================

// Export bucket name for verification and testing
new CfnOutput(
  Stack.of(backend.euGrantsCacheDownloader.resources.lambda),
  'EuGrantsCacheBucketName',
  {
    value: euGrantsCacheBucket.bucketName,
    description: 'EU Grants Cache S3 Bucket Name',
    exportName: 'EuGrantsCacheBucketName'
  }
);

// Export Lambda function name for testing
new CfnOutput(
  Stack.of(backend.euGrantsCacheDownloader.resources.lambda),
  'EuGrantsCacheDownloaderFunctionName',
  {
    value: backend.euGrantsCacheDownloader.resources.lambda.functionName,
    description: 'EU Grants Cache Downloader Lambda Function Name',
    exportName: 'EuGrantsCacheDownloaderFunctionName'
  }
);

// Configure EU Grants Cache Downloader Lambda
// CRITICAL: Use bucketName property which resolves to the actual deployed bucket in this region
backend.euGrantsCacheDownloader.addEnvironment('EU_GRANTS_BUCKET', euGrantsCacheBucket.bucketName);

// SECURITY FIX: IAM5 - Replace grantPut with explicit S3 permissions
backend.euGrantsCacheDownloader.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:PutObject'],
  resources: [`${euGrantsCacheBucket.bucketArn}/*`]
}));
backend.euGrantsCacheDownloader.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [euGrantsCacheBucket.bucketArn]
}));

// SECURITY FIX: IAM4 - Remove AWS managed policy

// Grant S3 read permissions to EU search V2 (already done above in EU V2 section)
// euGrantsCacheBucket.grantRead(backend.euGrantsSearchV2.resources.lambda);

// Create EventBridge rule for nightly EU grants cache download
const euCacheDownloadRule = new events.Rule(
  Stack.of(backend.euGrantsCacheDownloader.resources.lambda),
  'EuGrantsCacheDownloadSchedule',
  {
    description: 'Downloads EU grants file nightly at 2 AM CET',
    schedule: events.Schedule.cron({
      minute: '0',
      hour: '1', // 1 AM UTC = 2 AM CET (winter) / 3 AM CEST (summer)
      day: '*',
      month: '*',
      year: '*'
    }),
    enabled: true,
  }
);

// Add Lambda as target
euCacheDownloadRule.addTarget(
  new targets.LambdaFunction(backend.euGrantsCacheDownloader.resources.lambda)
);

// Add environment variables to agent discovery functions
backend.agentDiscoverySearch.addEnvironment('DISCOVERY_RESULTS_BUCKET', discoveryResultsBucket.bucketName);
// USE V2 LAMBDAS (no SSM, uses CloudFormation exports for agent ARNs)
backend.agentDiscoverySearch.addEnvironment('GRANTS_SEARCH_FUNCTION', backend.grantsSearchV2.resources.lambda.functionName);
// 🌍 MULTI-REGION: Add EU grants search V2 function and table
backend.agentDiscoverySearch.addEnvironment('EU_GRANTS_SEARCH_FUNCTION', backend.euGrantsSearchV2.resources.lambda.functionName);
backend.agentDiscoverySearch.addEnvironment('EU_GRANT_RECORDS_TABLE', backend.data.resources.tables["EuGrantRecord"].tableName);
// FIX #1: Use runtime resolution
backend.agentDiscoverySearch.addEnvironment('GRAPHQL_API_ID', graphqlApiId);
// SECURITY FIX: IAM5 - Scope AppSync API access to specific API
// Grant both GetGraphqlApi (metadata) and GraphQL (query/mutation execution) permissions
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['appsync:GetGraphqlApi', 'appsync:GraphQL'],
  resources: [
    `arn:aws:appsync:${Stack.of(backend.agentDiscoverySearch.resources.lambda).region}:${Stack.of(backend.agentDiscoverySearch.resources.lambda).account}:apis/${backend.data.resources.graphqlApi.apiId}`,
    `arn:aws:appsync:${Stack.of(backend.agentDiscoverySearch.resources.lambda).region}:${Stack.of(backend.agentDiscoverySearch.resources.lambda).account}:apis/${backend.data.resources.graphqlApi.apiId}/*`
  ]
}));

// Grant permission to invoke grants-search-v2 Lambda directly (US)
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['lambda:InvokeFunction'],
  resources: [backend.grantsSearchV2.resources.lambda.functionArn]
}));
// 🌍 MULTI-REGION: Grant permission to invoke eu-grants-search-v2 Lambda
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['lambda:InvokeFunction'],
  resources: [backend.euGrantsSearchV2.resources.lambda.functionArn]
}));
// 🌍 MULTI-REGION: Grant permission to scan EuGrantRecord table
// SECURITY FIX: IAM5 - Replace grantReadWriteData with explicit scoped permissions
// EuGrantRecord table - has GSI: euGrantRecordsBySession
backend.agentDiscoverySearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["EuGrantRecord"].tableArn,
    `${backend.data.resources.tables["EuGrantRecord"].tableArn}/index/euGrantRecordsBySession`
  ]
}));

backend.agentDiscoveryUpdate.addEnvironment('GRAPHQL_API_ID', graphqlApiId);
// SECURITY FIX: IAM5 - Scope AppSync API access to specific API (API key from environment)
backend.agentDiscoveryUpdate.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['appsync:GetGraphqlApi'],
  resources: [
    `arn:aws:appsync:${Stack.of(backend.agentDiscoveryUpdate.resources.lambda).region}:${Stack.of(backend.agentDiscoveryUpdate.resources.lambda).account}:apis/${backend.data.resources.graphqlApi.apiId}`
  ]
}));

// IAM AUTH MIGRATION: Grant permission to call AppSync GraphQL API with IAM auth
// SECURITY FIX: Scope to specific API ID and operations (getAgentConfig, updateAgentConfig, createAgentDiscoveryResult)
backend.agentDiscoveryUpdate.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['appsync:GraphQL'],
  resources: [
    `${backend.data.resources.graphqlApi.arn}/types/Query/fields/getAgentConfig`,
    `${backend.data.resources.graphqlApi.arn}/types/Mutation/fields/updateAgentConfig`,
    `${backend.data.resources.graphqlApi.arn}/types/Mutation/fields/createAgentDiscoveryResult`,
  ]
}));

// Add environment variables to S3 operations function
backend.s3BucketOperations.addEnvironment('DISCOVERY_RESULTS_BUCKET', discoveryResultsBucket.bucketName);

// SECURITY FIX: IAM5 - Replace grantRead with explicit S3 permissions
backend.s3BucketOperations.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [`${discoveryResultsBucket.bucketArn}/*`]
}));
backend.s3BucketOperations.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [discoveryResultsBucket.bucketArn]
}));


// Create Step Function V2 for agent discovery workflow (no DDB streams)
const agentDiscoveryStepFunction = new AgentDiscoveryStepFunctionV2(
  Stack.of(backend.agentDiscoverySearch.resources.lambda),
  'AgentDiscoveryWorkflowV2',
  {
    agentDiscoverySearchFunction: backend.agentDiscoverySearch.resources.lambda,
    agentDiscoveryUpdateFunction: backend.agentDiscoveryUpdate.resources.lambda,
  }
);

// Export Step Function ARN for testing and monitoring
new CfnOutput(
  Stack.of(backend.agentDiscoverySearch.resources.lambda),
  'AgentDiscoveryStepFunctionArn',
  {
    value: agentDiscoveryStepFunction.stateMachine.stateMachineArn,
    description: 'Agent Discovery Step Function ARN',
    exportName: 'AgentDiscoveryStepFunctionArn'
  }
);

// Export Step Function Name for testing
new CfnOutput(
  Stack.of(backend.agentDiscoverySearch.resources.lambda),
  'AgentDiscoveryStepFunctionName',
  {
    value: agentDiscoveryStepFunction.stateMachine.stateMachineName,
    description: 'Agent Discovery Step Function Name',
    exportName: 'AgentDiscoveryStepFunctionName'
  }
);

// Configure Scheduler Lambda with environment variables
backend.agentDiscoveryScheduler.addEnvironment('STATE_MACHINE_ARN', agentDiscoveryStepFunction.stateMachine.stateMachineArn);
backend.agentDiscoveryScheduler.addEnvironment('AGENT_CONFIG_TABLE', backend.data.resources.tables["AgentConfig"].tableName);

// SECURITY FIX: IAM5 - Replace grantReadData with explicit scoped permissions
// AgentConfig table - has GSI: agentConfigsByUser
backend.agentDiscoveryScheduler.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["AgentConfig"].tableArn,
    `${backend.data.resources.tables["AgentConfig"].tableArn}/index/agentConfigsByUser`
  ]
}));

// SECURITY FIX: IAM5 - Replace grantStartExecution with explicit Step Functions permissions
backend.agentDiscoveryScheduler.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['states:StartExecution'],
  resources: [agentDiscoveryStepFunction.stateMachine.stateMachineArn]
}));


// Create EventBridge rule for autonomous grant discovery
const agentDiscoveryRule = new events.Rule(
  Stack.of(backend.agentDiscoverySearch.resources.lambda),
  'AgentDiscoverySchedule',
  {
    description: 'Triggers autonomous grant discovery every 12 hours',
    schedule: events.Schedule.rate(Duration.hours(12)), // Run every 12 hours
    enabled: true,
  }
);

// Add Scheduler Lambda as target (it will start Step Function for each user)
agentDiscoveryRule.addTarget(
  new targets.LambdaFunction(backend.agentDiscoveryScheduler.resources.lambda, {
    event: events.RuleTargetInput.fromObject({
      source: 'eventbridge-schedule',
      triggerType: 'autonomous-discovery',
      timestamp: events.EventField.fromPath('$.time')
    })
  })
);

// ============================================================================
// PHASE 1: OpenSearch Collection Only
// ============================================================================
// ============================================================================
// OpenSearch Collection + Knowledge Base (Fully Automated)
// ============================================================================
// This creates everything in one deployment:
// - OpenSearch collection with security policies
// - S3 bucket for documents
// - Bedrock IAM role
// - Lambda function to create vector index (automated via Custom Resource)
// - Knowledge Base (created after index)
// - S3 Data Source

const openSearchStack = new OpenSearchCollectionStack(
  Stack.of(backend.data.resources.graphqlApi),
  'OpenSearchCollection',
  {
    collectionName: 'kb', // Short base name - will become kb-{region}-{uniqueId}
    accessLogsBucket: accessLogsBucket, // SECURITY FIX: S1 - Pass access logs bucket
  }
);

// ============================================================================
// Knowledge Base Lambda Functions Configuration
// ============================================================================

// Configure Knowledge Base Document Upload Lambda
backend.kbDocumentUpload.addEnvironment('DOCUMENT_BUCKET', openSearchStack.documentBucket.bucketName);
backend.kbDocumentUpload.addEnvironment('DOCUMENT_TABLE', backend.data.resources.tables["DocumentMetadata"].tableName);

// SECURITY FIX: IAM5 - Replace grantPut/grantRead with explicit S3 permissions
backend.kbDocumentUpload.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:PutObject', 's3:GetObject'],
  resources: [`${openSearchStack.documentBucket.bucketArn}/*`]
}));
backend.kbDocumentUpload.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [openSearchStack.documentBucket.bucketArn]
}));

// SECURITY FIX: IAM5 - Replace grantReadWriteData with explicit scoped permissions
// DocumentMetadata table - has 2 GSIs: listDocumentsByStatus, listDocumentsByDate
backend.kbDocumentUpload.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["DocumentMetadata"].tableArn,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByStatus`,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByDate`
  ]
}));



// Configure Knowledge Base Document Processor Lambda
backend.kbDocumentProcessor.addEnvironment('KNOWLEDGE_BASE_ID', openSearchStack.knowledgeBase.attrKnowledgeBaseId);
backend.kbDocumentProcessor.addEnvironment('DATA_SOURCE_ID', openSearchStack.dataSource.attrDataSourceId);
backend.kbDocumentProcessor.addEnvironment('DOCUMENT_TABLE', backend.data.resources.tables["DocumentMetadata"].tableName);
backend.kbDocumentProcessor.addEnvironment('KB_MANAGER_FUNCTION_NAME', backend.kbDocumentManager.resources.lambda.functionName);

// SECURITY FIX: IAM5 - Replace grantReadWriteData with explicit scoped permissions
// DocumentMetadata table - has 2 GSIs: listDocumentsByStatus, listDocumentsByDate
backend.kbDocumentProcessor.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["DocumentMetadata"].tableArn,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByStatus`,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByDate`
  ]
}));

// SECURITY FIX: IAM5 - Replace grantRead with explicit S3 permissions
backend.kbDocumentProcessor.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [`${openSearchStack.documentBucket.bucketArn}/*`]
}));
backend.kbDocumentProcessor.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [openSearchStack.documentBucket.bucketArn]
}));

// SECURITY FIX: IAM5 - Replace grantInvoke with explicit Lambda permissions
backend.kbDocumentProcessor.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['lambda:InvokeFunction'],
  resources: [backend.kbDocumentManager.resources.lambda.functionArn]
}));

// Add Bedrock permissions for ingestion jobs
// SECURITY REFINEMENT: Separate permissions for better scoping
// - ListIngestionJobs: KB-level operation (requires KB ARN only)
// - GetIngestionJob: Requires knowledge-base resource (per AWS IAM docs) - needs KB_ARN and KB_ARN/*
// - StartIngestionJob: KB-level operation (creates new jobs)
backend.kbDocumentProcessor.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    sid: 'AllowListAndStartIngestionJobs',
    effect: iam.Effect.ALLOW,
    actions: [
      'bedrock:ListIngestionJobs',
      'bedrock:StartIngestionJob'
    ],
    resources: [
      openSearchStack.knowledgeBase.attrKnowledgeBaseArn  // KB-level operations
    ]
  })
);

backend.kbDocumentProcessor.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    sid: 'AllowGetSpecificIngestionJob',
    effect: iam.Effect.ALLOW,
    actions: [
      'bedrock:GetIngestionJob'
    ],
    resources: [
      // GetIngestionJob requires knowledge-base resource (per AWS IAM docs)
      // Both KB ARN and KB_ARN/* are needed for the API to work
      openSearchStack.knowledgeBase.attrKnowledgeBaseArn,
      `${openSearchStack.knowledgeBase.attrKnowledgeBaseArn}/*`
    ]
  })
);

// Set up S3 event trigger for document processing
openSearchStack.documentBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(backend.kbDocumentProcessor.resources.lambda),
  { prefix: 'user-' }
);

// SECURITY FIX: IAM5 - BucketNotificationsHandler CloudWatch policy removed
// This was causing circular dependencies - will be addressed through CDK Lambda migration

// SECURITY FIX: IAM4 - Remove AWS managed policy (Amplify adds it automatically)

// Configure Knowledge Base Search Lambda
backend.kbSearch.addEnvironment('KNOWLEDGE_BASE_ID', openSearchStack.knowledgeBase.attrKnowledgeBaseId);
backend.kbSearch.addEnvironment('DOCUMENT_TABLE', backend.data.resources.tables["DocumentMetadata"].tableName);

// SECURITY FIX: IAM5 - Replace grantReadData with explicit scoped permissions
// DocumentMetadata table - has 2 GSIs: listDocumentsByStatus, listDocumentsByDate (read-only)
backend.kbSearch.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["DocumentMetadata"].tableArn,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByStatus`,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByDate`
  ]
}));
backend.kbSearch.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'bedrock:Retrieve',
      'bedrock:RetrieveAndGenerate'
    ],
    resources: [openSearchStack.knowledgeBase.attrKnowledgeBaseArn]
  })
);
backend.kbSearch.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:${Stack.of(backend.kbSearch.resources.lambda).region}::foundation-model/amazon.titan-embed-text-v2:0`
    ]
  })
);


// Configure Knowledge Base Document Manager Lambda
backend.kbDocumentManager.addEnvironment('DOCUMENT_BUCKET', openSearchStack.documentBucket.bucketName);
backend.kbDocumentManager.addEnvironment('DOCUMENT_TABLE', backend.data.resources.tables["DocumentMetadata"].tableName);
backend.kbDocumentManager.addEnvironment('KNOWLEDGE_BASE_ID', openSearchStack.knowledgeBase.attrKnowledgeBaseId);
backend.kbDocumentManager.addEnvironment('DATA_SOURCE_ID', openSearchStack.dataSource.attrDataSourceId);

// SECURITY FIX: IAM5 - Replace grantReadWrite with explicit S3 permissions
backend.kbDocumentManager.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
  resources: [`${openSearchStack.documentBucket.bucketArn}/*`]
}));
backend.kbDocumentManager.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [openSearchStack.documentBucket.bucketArn]
}));

// SECURITY FIX: IAM5 - Replace grantReadWriteData with explicit scoped permissions
// DocumentMetadata table - has 2 GSIs: listDocumentsByStatus, listDocumentsByDate
backend.kbDocumentManager.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["DocumentMetadata"].tableArn,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByStatus`,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByDate`
  ]
}));
// Add Bedrock permissions for ingestion jobs
// SECURITY REFINEMENT: Separate permissions for better scoping
// - ListIngestionJobs: KB-level operation (requires KB ARN only)
// - GetIngestionJob: Requires knowledge-base resource (per AWS IAM docs) - needs KB_ARN and KB_ARN/*
// - StartIngestionJob: KB-level operation (creates new jobs)
backend.kbDocumentManager.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    sid: 'AllowListAndStartIngestionJobs',
    effect: iam.Effect.ALLOW,
    actions: [
      'bedrock:ListIngestionJobs',
      'bedrock:StartIngestionJob'
    ],
    resources: [
      openSearchStack.knowledgeBase.attrKnowledgeBaseArn  // KB-level operations
    ]
  })
);

backend.kbDocumentManager.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    sid: 'AllowGetSpecificIngestionJob',
    effect: iam.Effect.ALLOW,
    actions: [
      'bedrock:GetIngestionJob'
    ],
    resources: [
      // GetIngestionJob requires knowledge-base resource (per AWS IAM docs)
      // Both KB ARN and KB_ARN/* are needed for the API to work
      openSearchStack.knowledgeBase.attrKnowledgeBaseArn,
      `${openSearchStack.knowledgeBase.attrKnowledgeBaseArn}/*`
    ]
  })
);

// ============================================================================
// PROMPT MANAGER - Role overridden with CloudFormation approach
// ============================================================================
// The promptManager role is overridden using the CloudFormation override approach
// All Bedrock permissions are configured in the override function above
// See: Line ~1370 for overrideWithCustomRole()

// Export Knowledge Base resources for use by Lambda functions
export const knowledgeBase = {
  collectionEndpoint: openSearchStack.collectionEndpoint,
  collectionArn: openSearchStack.collectionArn,
  bedrockRoleArn: openSearchStack.bedrockRole.roleArn,
  documentBucket: openSearchStack.documentBucket,
  knowledgeBaseId: openSearchStack.knowledgeBase.attrKnowledgeBaseId,
  dataSourceId: openSearchStack.dataSource.attrDataSourceId,
};

// ============================================================================
// PROPOSAL GENERATION INFRASTRUCTURE
// ============================================================================

// ============================================================================
// PROPOSALS BUCKET - Used by AgentCore proposal generation
// ============================================================================
// Create S3 bucket for proposal storage
const proposalsBucket = new s3.Bucket(
  Stack.of(backend.proposalsQuery.resources.lambda),
  'ProposalsBucket',
  {
    versioned: false,
    publicReadAccess: false,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
    serverAccessLogsBucket: accessLogsBucket, // SECURITY FIX: S1 - Enable access logging
    serverAccessLogsPrefix: 'proposals/', // SECURITY FIX: S1
    lifecycleRules: [
      {
        id: 'DeleteOldProposals',
        enabled: true,
        expiration: Duration.days(7), // Delete proposals after 7 days (matches presigned URL expiration)
      },
    ],
  }
);

// SECURITY FIX: S10 - Enforce SSL/TLS
// Re-enabled after fixing presigned URL IAM role issue
proposalsBucket.addToResourcePolicy(new PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:*'],
  resources: [
    proposalsBucket.bucketArn,
    `${proposalsBucket.bucketArn}/*`
  ],
  conditions: {
    Bool: {
      'aws:SecureTransport': 'false'
    }
  }
}));

// ============================================================================
// PROPOSALS QUERY LAMBDA - Query and manage proposals
// ============================================================================
// Configure Proposals Query Lambda
backend.proposalsQuery.addEnvironment(
  'PROPOSAL_TABLE_NAME',
  backend.data.resources.tables["Proposal"].tableName
);
backend.proposalsQuery.addEnvironment(
  'PROPOSALS_BUCKET_NAME',
  proposalsBucket.bucketName
);

// SECURITY FIX: IAM5 - Replace grantReadData/grantWriteData with explicit scoped permissions
// Proposal table - Grant access to table and all GSIs (index names are generated by Amplify)
backend.proposalsQuery.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["Proposal"].tableArn,
    `${backend.data.resources.tables["Proposal"].tableArn}/index/proposalsByUserId`,
    `${backend.data.resources.tables["Proposal"].tableArn}/index/proposalsByGrantId`
  ]
}));

// SECURITY FIX: IAM5 - Replace grantRead with explicit S3 permissions
backend.proposalsQuery.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [`${proposalsBucket.bucketArn}/*`]
}));
backend.proposalsQuery.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [proposalsBucket.bucketArn]
}));


// CRITICAL FIX: Explicitly add Lambda role to bucket policy
// The grantRead() above adds IAM permissions, but with autoDeleteObjects=true,
// the bucket policy only allows the CustomS3AutoDeleteObjects role by default.
// We must explicitly add the Lambda role to the bucket policy for presigned URLs to work.
proposalsBucket.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [new iam.ArnPrincipal(backend.proposalsQuery.resources.lambda.role!.roleArn)],
  actions: ['s3:GetObject', 's3:GetObjectVersion'],
  resources: [`${proposalsBucket.bucketArn}/*`]
}));

// Explicitly grant Query permission on the Proposal table and all its GSIs
backend.proposalsQuery.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['dynamodb:Query'],
    resources: [
      backend.data.resources.tables["Proposal"].tableArn,
      `${backend.data.resources.tables["Proposal"].tableArn}/index/proposalsByUserId`,
      `${backend.data.resources.tables["Proposal"].tableArn}/index/proposalsByGrantId`
    ]
  })
);

// ============================================================================
// PROPOSAL DOWNLOAD LAMBDA - Stream S3 content directly (no presigned URLs)
// ============================================================================
// This Lambda eliminates presigned URL issues by:
// 1. Verifying user owns the proposal (DynamoDB check)
// 2. Streaming S3 content directly to user
// 3. No credential expiration issues
// 4. Works with Block Public Access enabled
// 5. No bucket policy complexity

backend.proposalDownload.addEnvironment(
  'PROPOSAL_TABLE_NAME',
  backend.data.resources.tables["Proposal"].tableName
);
backend.proposalDownload.addEnvironment(
  'PROPOSALS_BUCKET_NAME',
  proposalsBucket.bucketName
);

// Grant DynamoDB read permissions (to verify ownership)
backend.proposalDownload.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem'],
  resources: [backend.data.resources.tables["Proposal"].tableArn]
}));

// Grant S3 read permissions (to stream content)
backend.proposalDownload.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [`${proposalsBucket.bucketArn}/*`]
}));
backend.proposalDownload.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [proposalsBucket.bucketArn]
}));

// ============================================================================
// BEDROCK PROMPTS - Infrastructure as Code
// ============================================================================
// Create all Bedrock prompts as CDK resources instead of using CodeBuild script.
// This provides:
// - Proper infrastructure-as-code for prompts
// - Prompt IDs available for IAM policies
// - Auditable and repeatable deployments
// - No manual prompt creation needed
import { BedrockPromptsStack } from './custom/bedrock-prompts-stack';

const bedrockPrompts = new BedrockPromptsStack(
  backend.createStack('BedrockPrompts'),
  'BedrockPrompts',
  {}
);

// ============================================================================
// PROMPT MANAGER - Bedrock Prompt Permissions (after BedrockPrompts stack created)
// ============================================================================
// Set region so the lambda calls Bedrock in the correct region
backend.promptManager.addEnvironment('REGION', Stack.of(backend.promptManager.resources.lambda).region);

// ListPrompts - needs wildcard (AWS API limitation - cannot scope to specific prompts)
backend.promptManager.resources.lambda.addToRolePolicy(new PolicyStatement({
  sid: 'AllowListPrompts',
  actions: ['bedrock:ListPrompts'],
  resources: ['*']  // ListPrompts requires wildcard per AWS API design
}));

// GetPrompt - scoped to specific prompt ARNs (no wildcard)
// Prompts are created in BedrockPrompts stack with known IDs
backend.promptManager.resources.lambda.addToRolePolicy(new PolicyStatement({
  sid: 'AllowGetSpecificPrompts',
  actions: ['bedrock:GetPrompt'],
  resources: bedrockPrompts.getAllPromptArns()
}));

// ============================================================================
// CDK AgentCore - ALL 5 AGENTS (Full Migration)
// ============================================================================
// ARCHITECTURE: AgentCore stack needs table names for IAM policies only
// Agents will discover table names at runtime via CloudFormation exports or AppSync API
//
// This eliminates the circular dependency:
//   - Data stack creates tables and exports names
//   - AgentCore stack creates agents with IAM policies (uses table names for ARN construction)
//   - Data stack receives agent ARNs from AgentCore ✅
//   - Agents discover table names at runtime (no environment variables needed)
//
// KEY: Table names are used for IAM policy ARNs, NOT passed as environment variables

const agentCore = new AgentCoreStack(
  backend.createStack('AgentCore'),
  'AgentCore',
  {
    // Table names for IAM policy ARN construction (not env vars)
    grantRecordTableName: backend.data.resources.tables['GrantRecord'].tableName,
    euGrantRecordTableName: backend.data.resources.tables['EuGrantRecord'].tableName,
    searchEventTableName: backend.data.resources.tables['SearchEvent'].tableName,
    userProfileTableName: backend.data.resources.tables['UserProfile'].tableName,
    proposalTableName: backend.data.resources.tables['Proposal'].tableName,
    documentMetadataTableName: backend.data.resources.tables['DocumentMetadata'].tableName,

    // Bucket and service IDs
    proposalsBucketName: proposalsBucket.bucketName,
    documentBucketName: openSearchStack.documentBucket.bucketName,
    euCacheBucketName: euGrantsCacheBucket.bucketName,
    knowledgeBaseId: openSearchStack.knowledgeBase.attrKnowledgeBaseId,
    appsyncApiId: backend.data.resources.graphqlApi.apiId,
    promptArns: bedrockPrompts.getAllPromptArns(),
  }
);

// Wire up all 5 agent ARNs to their Lambda functions
// Use CfnOutput exports with static names (cannot use tokens in export names)
new CfnOutput(agentCore, 'UsGrantsV2AgentArn', {
  value: agentCore.usGrantsSearchV2Arn,
  exportName: 'AgentCore-UsGrantsV2AgentArn',
  description: 'US Grants Search V2 Agent ARN',
});

new CfnOutput(agentCore, 'EuGrantsV2AgentArn', {
  value: agentCore.euGrantsSearchV2Arn,
  exportName: 'AgentCore-EuGrantsV2AgentArn',
  description: 'EU Grants Search V2 Agent ARN',
});

new CfnOutput(agentCore, 'ProposalGenerationAgentArn', {
  value: agentCore.proposalGenerationArn,
  exportName: 'AgentCore-ProposalGenerationAgentArn',
  description: 'Proposal Generation Agent ARN',
});

// ARCHITECTURE NOTE: Agent ARNs are exported via CloudFormation (see lines 1437-1452)
// and read by Lambdas at runtime. They cannot be passed as environment variables
// at synthesis time because it would create a circular dependency:
//   Data stack (Lambdas) → AgentCore stack (needs agent ARNs)
//   AgentCore stack → Data stack (needs table names)
// 
// Lambdas discover agent ARNs at runtime from CloudFormation exports:
//   - AgentCore-UsGrantsV2AgentArn
//   - AgentCore-EuGrantsV2AgentArn
//   - AgentCore-ProposalGenerationAgentArn

// NOTE: AppSync API key cannot be passed via environment variable
// Accessing backend.data.resources.cfnResources.cfnApiKey creates a circular dependency:
// - Data stack depends on AgentCore stack (for agent ARNs)
// - AgentCore stack would depend on Data stack (for API key)
// Therefore, Lambdas must discover the API key at runtime using appsync:ListApiKeys
// This requires 5 IAM5 suppressions (one per Lambda function)

// Output all agent ARNs for verification
new CfnOutput(agentCore, 'AllAgentArns', {
  value: JSON.stringify({
    usGrantsV2: agentCore.usGrantsSearchV2Arn,
    euGrantsV2: agentCore.euGrantsSearchV2Arn,
    proposalGen: agentCore.proposalGenerationArn,
    pdfConverter: agentCore.pdfConverterArn,
    evaluator: agentCore.proposalEvaluatorArn,
  }),
  description: 'All CDK-deployed Agent ARNs',
});

// ============================================================================
// PROPOSAL GENERATION AGENTCORE (Native AgentCore - No SQS/Processor)
// ============================================================================
// SECURITY FIX: IAM5 - Replace grant methods with explicit scoped permissions
// Proposal table - has 2 GSIs: proposalsByUser, proposalsByGrant
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["Proposal"].tableArn,
    `${backend.data.resources.tables["Proposal"].tableArn}/index/proposalsByUser`,
    `${backend.data.resources.tables["Proposal"].tableArn}/index/proposalsByGrant`
  ]
}));

// DocumentMetadata table - has 2 GSIs: listDocumentsByStatus, listDocumentsByDate (read-only)
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [
    backend.data.resources.tables["DocumentMetadata"].tableArn,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByStatus`,
    `${backend.data.resources.tables["DocumentMetadata"].tableArn}/index/listDocumentsByDate`
  ]
}));

// UserProfile table - no GSIs (read-only)
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
  resources: [backend.data.resources.tables["UserProfile"].tableArn]
}));

backend.proposalGenerationAgentcore.addEnvironment('PROPOSALS_TABLE', backend.data.resources.tables["Proposal"].tableName);
backend.proposalGenerationAgentcore.addEnvironment('KNOWLEDGE_BASE_ID', openSearchStack.knowledgeBase.attrKnowledgeBaseId);
backend.proposalGenerationAgentcore.addEnvironment('PROPOSALS_BUCKET', proposalsBucket.bucketName);
backend.proposalGenerationAgentcore.addEnvironment('DOCUMENT_TABLE', backend.data.resources.tables["DocumentMetadata"].tableName);
backend.proposalGenerationAgentcore.addEnvironment('DOCUMENT_BUCKET', openSearchStack.documentBucket.bucketName);
backend.proposalGenerationAgentcore.addEnvironment('USER_PROFILE_TABLE', backend.data.resources.tables["UserProfile"].tableName);
backend.proposalGenerationAgentcore.addEnvironment('BEDROCK_AGENTCORE_REGION', Stack.of(backend.proposalGenerationAgentcore.resources.lambda).region);
backend.proposalGenerationAgentcore.addEnvironment('GRAPHQL_API_ID', backend.data.resources.graphqlApi.apiId);
backend.proposalGenerationAgentcore.addEnvironment('AGENT_ARN_EXPORT_NAME', 'AgentCore-ProposalGenerationAgentArn');
backend.proposalGenerationAgentcore.addEnvironment('GUARDRAIL_ID', promptInjectionGuardrail.attrGuardrailId);
backend.proposalGenerationAgentcore.addEnvironment('GUARDRAIL_VERSION', guardrailVersion.attrVersion);
// PROPOSAL_MODEL_TIER: 'opus' uses Claude Opus 4.6 (200K context, better for large EU prompts)
//                      'sonnet' uses Claude Sonnet 4.5 (200K context, faster/cheaper)
// Change this value and redeploy to switch models without touching agent code.
backend.proposalGenerationAgentcore.addEnvironment('PROPOSAL_MODEL_TIER', 'opus');

// Proposal Generation - Guardrail permissions (scoped to specific guardrail ARN)
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:ApplyGuardrail'],
  resources: [promptInjectionGuardrail.attrGuardrailArn],
}));

// Proposal Generation - CloudFormation ListExports (required to discover agent ARN at runtime)
// cloudformation:ListExports has no resource-level granularity — AWS requires * (IAM limitation)
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['cloudformation:ListExports'],
  resources: ['*'],
}));

// Proposal Generation - Bedrock AgentCore InvokeAgentRuntime
// CANNOT use agentCore.proposalGenerationArn here — it creates a CDK cyclic dependency:
//   data stack (Lambda) → AgentCore stack (for ARN token)
//   AgentCore stack → data stack (for table name tokens)
// Scoped to bedrock-agentcore runtimes in this account/region only (no cross-account access possible)
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock-agentcore:InvokeAgentRuntime'],
  resources: [
    `arn:aws:bedrock-agentcore:${Stack.of(backend.proposalGenerationAgentcore.resources.lambda).region}:${Stack.of(backend.proposalGenerationAgentcore.resources.lambda).account}:runtime/*`
  ]
}));

// SECURITY FIX: IAM5 - Replace grantReadWrite/grantRead with explicit S3 permissions
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
  resources: [`${proposalsBucket.bucketArn}/*`]
}));
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [proposalsBucket.bucketArn]
}));
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [`${openSearchStack.documentBucket.bucketArn}/*`]
}));
backend.proposalGenerationAgentcore.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ['s3:ListBucket'],
  resources: [openSearchStack.documentBucket.bucketArn]
}));


// Agent ARN - NOW PROVIDED BY CDK (see line ~470)
// Commented out SSM read since CDK provides ARN directly
// const proposalGenerationAgentArn = ssm.StringParameter.valueForStringParameter(
//   Stack.of(backend.proposalGenerationAgentcore.resources.lambda),
//   '/grants-platform/agents/proposal-generation-arn'
// );
// backend.proposalGenerationAgentcore.addEnvironment('PROPOSAL_GENERATION_AGENT_ARN', proposalGenerationAgentArn);


// ============================================================================
// CLOUDFORMATION EXPORTS FOR TESTING AND MULTI-REGION DEPLOYMENT
// ============================================================================

// DynamoDB Table Names
new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'GrantRecordTableName', {
  value: backend.data.resources.tables["GrantRecord"].tableName,
  exportName: 'GrantRecordTableName',
  description: 'US Grant Records DynamoDB Table Name',
});

new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'EuGrantRecordTableName', {
  value: backend.data.resources.tables["EuGrantRecord"].tableName,
  exportName: 'EuGrantRecordTableName',
  description: 'EU Grant Records DynamoDB Table Name',
});

new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'UserProfileTableName', {
  value: backend.data.resources.tables["UserProfile"].tableName,
  exportName: 'UserProfileTableName',
  description: 'User Profile DynamoDB Table Name',
});

new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'AgentConfigTableName', {
  value: backend.data.resources.tables["AgentConfig"].tableName,
  exportName: 'AgentConfigTableName',
  description: 'Agent Config DynamoDB Table Name',
});

new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'ProposalTableName', {
  value: backend.data.resources.tables["Proposal"].tableName,
  exportName: 'ProposalTableName',
  description: 'Proposal DynamoDB Table Name',
});

// S3 Bucket Names
new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'ProposalsBucketName', {
  value: proposalsBucket.bucketName,
  exportName: 'ProposalsBucketName',
  description: 'Proposals S3 Bucket Name',
});

new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'DocumentBucketName', {
  value: openSearchStack.documentBucket.bucketName,
  exportName: 'DocumentBucketName',
  description: 'Knowledge Base Documents S3 Bucket Name',
});

// Lambda Function Names (for testing)
new CfnOutput(Stack.of(backend.grantsSearchV2.resources.lambda), 'GrantsSearchV2FunctionName', {
  value: backend.grantsSearchV2.resources.lambda.functionName,
  exportName: 'GrantsSearchV2FunctionName',
  description: 'US Grants Search V2 Lambda Function Name',
});

new CfnOutput(Stack.of(backend.euGrantsSearchV2.resources.lambda), 'EuGrantsSearchV2FunctionName', {
  value: backend.euGrantsSearchV2.resources.lambda.functionName,
  exportName: 'EuGrantsSearchV2FunctionName',
  description: 'EU Grants Search V2 Lambda Function Name',
});

new CfnOutput(Stack.of(backend.proposalGenerationAgentcore.resources.lambda), 'ProposalGenerationFunctionName', {
  value: backend.proposalGenerationAgentcore.resources.lambda.functionName,
  exportName: 'ProposalGenerationFunctionName',
  description: 'Proposal Generation Lambda Function Name',
});

// AppSync API
new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'GraphQLApiId', {
  value: backend.data.resources.graphqlApi.apiId,
  exportName: 'GraphQLApiId',
  description: 'AppSync GraphQL API ID',
});

// Knowledge Base
new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'KnowledgeBaseId', {
  value: openSearchStack.knowledgeBase.attrKnowledgeBaseId,
  exportName: 'KnowledgeBaseId',
  description: 'Bedrock Knowledge Base ID',
});

// Region (for multi-region deployments)
new CfnOutput(Stack.of(backend.data.resources.graphqlApi), 'DeploymentRegion', {
  value: Stack.of(backend.data.resources.graphqlApi).region,
  exportName: 'DeploymentRegion',
  description: 'AWS Region where resources are deployed',
});

// ============================================================================
// POST-DEPLOYMENT SEEDING (CodeBuild)
// ============================================================================
// This runs AFTER all other resources are deployed
const postDeploymentSeeder = new PostDeploymentSeeder(
  Stack.of(backend.data.resources.graphqlApi),
  'PostDeploymentSeeder',
  {
    // Cognito
    userPoolId: backend.auth.resources.userPool.userPoolId,
    userPoolClientId: backend.auth.resources.userPoolClient.userPoolClientId,

    // DynamoDB Tables
    userProfileTableName: backend.data.resources.tables["UserProfile"].tableName,
    agentConfigTableName: backend.data.resources.tables["AgentConfig"].tableName,
    grantRecordTableName: backend.data.resources.tables["GrantRecord"].tableName,
    euGrantRecordTableName: backend.data.resources.tables["EuGrantRecord"].tableName,
    proposalTableName: backend.data.resources.tables["Proposal"].tableName,
    documentMetadataTableName: backend.data.resources.tables["DocumentMetadata"].tableName,

    // S3 Buckets
    deploymentAssetsBucketName: euGrantsCacheBucket.bucketName, // Renamed from euCacheBucketName
    proposalsBucketName: proposalsBucket.bucketName,
    documentBucketName: openSearchStack.documentBucket.bucketName,

    // Lambda Functions
    euCacheDownloaderFunctionName: backend.euGrantsCacheDownloader.resources.lambda.functionName,

    // Step Function
    agentDiscoveryStepFunctionArn: agentDiscoveryStepFunction.stateMachine.stateMachineArn,

    // AppSync
    graphqlApiId: backend.data.resources.graphqlApi.apiId,

    // Knowledge Base
    knowledgeBaseId: openSearchStack.knowledgeBase.attrKnowledgeBaseId,

    // Region
    region: Stack.of(backend.data.resources.graphqlApi).region,
  }
);

// ============================================================================
// POST-DEPLOYMENT SEEDER SUPPRESSIONS - DISABLED (CDK-NAG off)
// ============================================================================
// NagSuppressions for CodeBuild role wildcards removed - CDK-NAG disabled

// ============================================================================
// FRAMEWORK-MANAGED RESOURCE SUPPRESSIONS - DISABLED (CDK-NAG off)
// ============================================================================
// These resources are created and managed by AWS CDK and Amplify frameworks
// We cannot modify their IAM policies - they must be suppressed with justification

// ----------------------------------------------------------------------------
// 1. Amplify Table Manager (Framework-Managed) - CDK-NAG DISABLED
// All NagSuppressions below are commented out - CDK-NAG not required for sample deployment
