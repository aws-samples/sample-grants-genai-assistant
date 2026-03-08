<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# Amplify Gen 2 Overview

## What is Amplify Gen 2?

AWS Amplify Gen 2 is a code-first approach to building cloud backends. Instead of using configuration files or a CLI wizard, you define your entire backend infrastructure using TypeScript.

**Key Benefits:**
- **Type-safe** - Full TypeScript support with IntelliSense
- **Git-based** - Your infrastructure is code, versioned alongside your app
- **Integrated** - Seamlessly connects backend to React frontend
- **Fast iteration** - Sandbox mode for rapid development

## Core Concepts

### 1. Backend Definition (`amplify/backend.ts`)

This is the entry point for your entire backend. It imports and connects all resources:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { myFunction } from './functions/my-function/resource';

export const backend = defineBackend({
  auth,      // Cognito authentication
  data,      // GraphQL API + DynamoDB
  myFunction // Lambda functions
});
```

**What it creates:**
- Cognito User Pool for authentication
- AppSync GraphQL API
- DynamoDB tables
- Lambda functions
- IAM roles and permissions

### 2. Data Layer (`amplify/data/resource.ts`)

Define your GraphQL schema and DynamoDB tables using a type-safe builder:

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  UserProfile: a.model({
    userId: a.string().required(),
    email: a.string().required(),
    researchAreas: a.string().array(),
  })
  .authorization((allow) => [allow.authenticated()])
});

export const data = defineData({ schema });
```

**What you get:**
- DynamoDB table automatically created
- GraphQL queries, mutations, subscriptions
- TypeScript types for frontend
- Real-time data sync

### 3. Functions (`amplify/functions/`)

Each Lambda function lives in its own directory:

```
amplify/functions/
├── grants-search/
│   ├── handler.ts       # Function code
│   ├── resource.ts      # Function configuration
│   └── package.json     # Dependencies
```

**Example function definition** (`resource.ts`):

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts'
});
```

**Note:** GROW2 uses advanced CDK patterns with custom IAM roles. See existing functions in `amplify/functions/` for production examples.

### 4. Custom Resources (`amplify/custom/`)

For AWS services not built into Amplify Gen 2, use CDK directly:

```typescript
// amplify/custom/my-custom-stack.ts
import { Stack } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class MyCustomStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    new s3.Bucket(this, 'MyBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED
    });
  }
}
```

Then import in `backend.ts`:

```typescript
import { MyCustomStack } from './custom/my-custom-stack';

const backend = defineBackend({ auth, data });
new MyCustomStack(backend.stack, 'MyCustomStack');
```

## GROW2 Architecture

### Backend Structure

```
amplify/
├── backend.ts                    # Main entry point
├── auth/resource.ts              # Cognito configuration
├── data/resource.ts              # GraphQL schema + DynamoDB
├── functions/                    # Lambda functions
│   ├── grants-search-v2/         # US grants search
│   ├── eu-grants-search-v2/      # EU grants search
│   ├── proposal-generation-agentcore/  # Proposal generation
│   ├── kb-document-upload/       # Knowledge base upload
│   ├── chat-handler/             # AI chat assistant
│   └── ... (17 total functions)
└── custom/                       # Custom CDK stacks
    ├── agentcore-stack.ts        # Bedrock AgentCore agents
    ├── opensearch-collection-stack.ts  # Vector search
    └── agent-discovery-stepfunction-v2.ts  # Step Functions
```

### What Gets Deployed

**Amplify Gen 2 Resources:**
- Cognito User Pool (authentication with MFA)
- AppSync GraphQL API (real-time data)
- DynamoDB tables (UserProfile, AgentConfig, GrantRecords, etc.)
- 17 Lambda functions (grants search, proposals, KB management)

**Custom CDK Resources:**
- 5 Bedrock AgentCore agents (US Grants, EU Grants, Proposals, PDF, Evaluator)
- OpenSearch Serverless collection (vector search)
- Bedrock Knowledge Base (document retrieval)
- Step Functions (agent discovery workflow)
- EventBridge schedules (nightly automation)
- S3 buckets (documents, EU cache, proposals)

## Making Changes

### Adding a New Lambda Function

1. **Create function directory:**
   ```bash
   mkdir -p amplify/functions/my-new-function
   ```

2. **Create `resource.ts`:**
   ```typescript
   import { defineFunction } from '@aws-amplify/backend';
   
   export const myNewFunction = defineFunction({
     name: 'my-new-function',
     entry: './handler.ts'
   });
   ```

3. **Create `handler.ts`:**
   ```typescript
   export const handler = async (event: any) => {
     console.log('Event:', event);
     return { statusCode: 200, body: 'Success' };
   };
   ```

4. **Add to `backend.ts`:**
   ```typescript
   import { myNewFunction } from './functions/my-new-function/resource';
   
   export const backend = defineBackend({
     auth,
     data,
     myNewFunction  // Add here
   });
   ```

5. **Deploy:**
   ```bash
   ./installation/deploy-grow2-bootstrap.sh us-east-1
   ```

**Note:** For production-grade functions with custom IAM roles and security configurations, refer to existing functions in `amplify/functions/` as templates.

### Modifying the GraphQL Schema

1. **Edit `amplify/data/resource.ts`:**
   ```typescript
   const schema = a.schema({
     UserProfile: a.model({
       userId: a.string().required(),
       email: a.string().required(),
       // Add new field
       phoneNumber: a.string()
     })
     .authorization((allow) => [allow.authenticated()])
   });
   ```

2. **Deploy backend:**
   ```bash
   ./installation/deploy-grow2-bootstrap.sh us-east-1
   ```

3. **Generate TypeScript types:**
   ```bash
   npx ampx generate graphql-client-code --out react-aws/src/graphql
   ```

4. **Copy config to frontend:**
   ```bash
   cp amplify_outputs.json react-aws/amplify_outputs.json
   ```

See [Architecture Overview](../../README.md#architecture-overview) for detailed steps.

### Adding IAM Permissions

Lambda functions need explicit permissions to access AWS services:

```typescript
// In backend.ts
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

backend.myFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:GetObject', 's3:PutObject'],
    resources: ['arn:aws:s3:::my-bucket/*']
  })
);
```

### Adding Environment Variables

Pass configuration to Lambda functions:

```typescript
// In backend.ts
backend.myFunction.resources.lambda.addEnvironment(
  'BUCKET_NAME',
  myBucket.bucketName
);
```

Access in function code:

```typescript
// In handler.ts
const bucketName = process.env.BUCKET_NAME;
```

## Development Workflow

### Deployment

GROW2 uses a custom deployment script instead of `npx ampx sandbox`:

```bash
# Deploy to AWS
./installation/deploy-grow2-bootstrap.sh us-east-1

# This script:
# - Runs npx ampx sandbox --once
# - Deploys all infrastructure
# - Takes 45-60 minutes
```

**For local React development:**
```bash
cd react-aws
npm start
```

The React app connects to your deployed AWS backend (not a local backend).

### One-Time Deployment

```bash
# Deploy once without watching
./installation/deploy-grow2-bootstrap.sh us-east-1
```

Use this for:
- Production deployments
- Testing changes
- CI/CD pipelines

### Viewing Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/amplify-grow2-[username]-sandbox-[hash]-[FunctionName] --follow

# View all log groups
aws logs describe-log-groups --query 'logGroups[*].logGroupName'
```

See [Monitoring Guide](../maintenance/MONITORING.md) for CloudWatch details.

## Common Patterns

### Connecting Lambda to GraphQL

Use custom resolvers to connect Lambda functions to GraphQL operations:

```typescript
// In data/resource.ts
const schema = a.schema({
  searchGrants: a
    .query()
    .arguments({ query: a.string().required() })
    .returns(a.ref('SearchResult'))
    .handler(a.handler.function(grantsSearchFunction))
    .authorization((allow) => [allow.authenticated()])
});
```

### Accessing DynamoDB from Lambda

```typescript
// In handler.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: any) => {
  const tableName = process.env.USER_PROFILE_TABLE_NAME;
  
  const result = await client.send(new GetCommand({
    TableName: tableName,
    Key: { userId: event.userId }
  }));
  
  return result.Item;
};
```

### Calling Bedrock from Lambda

```typescript
// In handler.ts
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({});

export const handler = async (event: any) => {
  const response = await client.send(new InvokeAgentCommand({
    agentId: process.env.AGENT_ID,
    agentAliasId: process.env.AGENT_ALIAS_ID,
    sessionId: event.sessionId,
    inputText: event.query
  }));
  
  return response;
};
```

## Troubleshooting

### "Cannot find module '@aws-amplify/backend'"

Install dependencies:
```bash
npm install
```

### "Deployment failed: Stack already exists"

Delete the existing stack:
```bash
./installation/delete-grow2.sh us-east-1
```

Then redeploy:
```bash
./installation/deploy-grow2-bootstrap.sh us-east-1
```

### "Permission denied" errors

Check your AWS credentials:
```bash
aws sts get-caller-identity
```

See [AWS Credentials Setup](../deployment/AWS_CREDENTIALS.md) for help.

### Schema changes not reflected in UI

Regenerate GraphQL types:
```bash
npx ampx generate graphql-client-code --out react-aws/src/graphql
cp amplify_outputs.json react-aws/amplify_outputs.json
```

## Best Practices

1. **Use TypeScript** - Full type safety across backend and frontend
2. **Keep functions small** - One function per responsibility
3. **Use environment variables** - Never hardcode ARNs or IDs
4. **Add IAM permissions explicitly** - Don't use wildcards
5. **Test locally first** - Use sandbox mode before production
6. **Version control everything** - Infrastructure is code
7. **Use CDK for custom resources** - Extend beyond Amplify's built-ins

## Additional Resources

- [Official Amplify Gen 2 Docs](https://docs.amplify.aws/gen2/)
- [Amplify Gen 2 Examples](https://github.com/aws-samples/amplify-gen2-examples)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [GROW2 Architecture Overview](../../README.md#architecture-overview)

---

**Last Updated:** February 4, 2026
