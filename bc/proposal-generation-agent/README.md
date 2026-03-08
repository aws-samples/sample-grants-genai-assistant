# Proposal Generation Agent - AgentCore Native

AI-powered grant proposal generation using AWS Bedrock AgentCore.

## Architecture

This agent replaces the Lambda + SQS architecture with AgentCore's native async task management:

- **AgentCore Runtime**: Handles long-running proposal generation tasks
- **AppSync Integration**: Real-time status updates via GraphQL subscriptions
- **Knowledge Base**: Retrieves grant requirements and best practices
- **S3 Storage**: Stores generated proposals with presigned URLs

## Key Features

- Multi-section proposal generation (Abstract, Aims, Strategy, Budget)
- Real-time progress tracking
- Knowledge base integration for context
- User profile and document integration
- Async processing with immediate response

## Setup

```bash
# From bc/proposal-generation-agent directory
bash setup.sh
```

## Deployment

```bash
cd bc/proposal-generation-agent
agentcore configure
```

Follow the prompts:
- Agent name: `proposal_generation_agent`
- Use existing execution role: `arn:aws:iam::483272795794:role/AmazonBedrockAgentCoreSDKRuntime-us-east-2-c74d3dabdd`
- Memory: STM_AND_LTM (long-term memory)

After deployment:
```bash
bash ../../shell/add-proposal-v2-dynamodb-permissions.sh
```

## Environment Variables

Set in AgentCore configuration:
- `PROPOSALS_TABLE`: DynamoDB table for proposal status
- `KNOWLEDGE_BASE_ID`: Bedrock Knowledge Base ID
- `PROPOSALS_BUCKET`: S3 bucket for generated proposals
- `APPSYNC_ENDPOINT`: AppSync GraphQL endpoint
- `GRAPHQL_API_ID`: AppSync API ID

## Testing

```bash
# Test agent locally
bedrock-agentcore invoke '{
  "proposalId": "test-123",
  "grantId": "grant-456",
  "userId": "user-789"
}'
```

## Monitoring

```bash
# Watch agent logs
aws logs tail /aws/bedrock-agentcore/runtimes/proposal_generation_agent-xxxxx-DEFAULT --follow
```
