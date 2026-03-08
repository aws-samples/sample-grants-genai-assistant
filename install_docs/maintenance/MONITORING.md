<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# Monitoring GROW2

Guide for monitoring the GROW2 application using CloudWatch logs and metrics.

---

## Overview

GROW2 uses Amazon CloudWatch for logging and monitoring. This guide helps you:
- Monitor application health
- Debug issues
- Track performance
- Understand system behavior

**Key Monitoring Tools:**
- CloudWatch Logs - Application and system logs
- CloudWatch Metrics - Performance metrics
- CloudWatch Alarms - Automated alerts
- AWS Console - Visual monitoring

---

## Quick Start Monitoring

### Access CloudWatch Logs

1. Go to **AWS Console** → **CloudWatch** → **Logs** → **Log groups**
2. Filter by your stack name (e.g., `amplify-grow2-hesct-sandbox`)
3. Select a log group to view logs
4. Use **Log Insights** for advanced queries

### Common Monitoring Tasks

**Check if a feature is working:**
```bash
# View recent logs for a specific feature
aws logs tail /aws/lambda/amplify-grow2-*-GrantsSearchV2Function* --follow
```

**Search for errors:**
```bash
# Search for errors in the last hour
aws logs filter-log-events \
  --log-group-name "/aws/lambda/amplify-grow2-*-GrantsSearchV2Function*" \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
```

**Monitor real-time activity:**
```bash
# Follow logs in real-time
aws logs tail /aws/lambda/amplify-grow2-*-ProposalGenerationAgentc* --follow
```

---

## CloudWatch Log Groups by Feature

All log groups follow the pattern: `/aws/[service]/amplify-grow2-[username]-sandbox-[hash]-[FunctionName]-[id]`

### User Profiles
**UI Location:** Left nav → "User Profiles"

No dedicated Lambda (uses AppSync direct DynamoDB access)

**Related logs:**
- AppSync API: `/aws/appsync/apis/[api-id]`

**What to monitor:**
- Profile creation/updates
- GraphQL mutations and queries

---

### Search (Grants Search)
**UI Location:** Left nav → "Search"

**US Grants Search:**
- Lambda: `*-GrantsSearchV2FunctionEA-*`
- AgentCore: `/aws/bedrock-agentcore/runtimes/grants_search_agent_v2-*`

**EU Grants Search:**
- Lambda: `*-EuGrantsSearchV2Function-*`
- AgentCore: `/aws/bedrock-agentcore/runtimes/eu_grants_search_agent_v2-*`
- Cache Downloader: `*-EuGrantsCacheDownloaderF-*` (nightly background job)

**What to monitor:**
- Search requests and results
- Grant matching scores
- API response times
- Cache download status (EU)

**Common log patterns:**
```
✅ Success: "Search completed successfully"
❌ Error: "ERROR" or "Failed to search"
⏱️ Performance: "Search took X ms"
```

**Example query:**
```bash
# Monitor US grants search
aws logs tail /aws/lambda/amplify-grow2-*-GrantsSearchV2Function* --follow

# Monitor EU grants search
aws logs tail /aws/lambda/amplify-grow2-*-EuGrantsSearchV2Function* --follow
```

---

### Proposals
**UI Location:** Left nav → "Proposals"

**Proposal Generation:**
- Lambda: `*-ProposalGenerationAgentc-*`
- AgentCore: `/aws/bedrock-agentcore/runtimes/proposal_generation_agent-*`

**Proposal Evaluation:**
- AgentCore: `/aws/bedrock-agentcore/runtimes/proposal_evaluator_agent-*`

**Proposal Query/List:**
- Lambda: `*-ProposalsQueryFunction38-*`

**Proposal Download:**
- Lambda: `*-ProposalDownloadFunction-*`

**What to monitor:**
- Proposal generation progress
- Evaluation scores
- Download requests
- Generation time (typically 2-5 minutes)

**Common log patterns:**
```
✅ Success: "Proposal generated successfully"
❌ Error: "ERROR" or "Generation failed"
📊 Progress: "Processing section X of Y"
⏱️ Performance: "Generation took X seconds"
```

**Example query:**
```bash
# Monitor proposal generation
aws logs tail /aws/lambda/amplify-grow2-*-ProposalGenerationAgentc* --follow

# Check recent proposal queries
aws logs tail /aws/lambda/amplify-grow2-*-ProposalsQueryFunction* --since 1h
```

---

### Knowledge Base
**UI Location:** Left nav → "Knowledge Base"

**Document Upload:**
- Lambda: `*-KBDocumentUploadFunction-*`

**Document Processing:**
- Lambda: `*-KBDocumentProcessorFunct-*`

**Document Management:**
- Lambda: `*-KBDocumentManagerFunctio-*`

**Document Search:**
- Lambda: `*-KBSearchFunctionFA939F08-*`

**OpenSearch Indexing:**
- Lambda: `*-OpenSearchCollectionInde-*`

**What to monitor:**
- Document upload status
- Processing/sync status
- Search queries
- Index creation

**Common log patterns:**
```
✅ Success: "Document uploaded successfully"
📄 Processing: "Processing document X"
🔍 Indexing: "Creating index for document"
❌ Error: "Failed to process document"
```

**Example query:**
```bash
# Monitor document uploads
aws logs tail /aws/lambda/amplify-grow2-*-KBDocumentUploadFunction* --follow

# Check document processing
aws logs tail /aws/lambda/amplify-grow2-*-KBDocumentProcessorFunct* --follow

# Monitor search
aws logs tail /aws/lambda/amplify-grow2-*-KBSearchFunction* --follow
```

---

### Agent Config (Autonomous Discovery)
**UI Location:** Left nav → "Agent Config"

**Agent Scheduler:**
- Lambda: `*-AgentDiscoverySchedulerF-*`

**Agent Search Execution:**
- Lambda: `*-AgentDiscoverySearchFunc-*`

**Agent Results Update:**
- Lambda: `*-AgentDiscoveryUpdateFunc-*`

**Step Function Orchestration:**
- Step Function: `*-AgentDiscoveryWorkflowV2StepFunctionLogsV2*`

**What to monitor:**
- Scheduled agent runs
- Agent execution status
- Results storage
- Workflow progress

**Common log patterns:**
```
✅ Success: "Agent discovery completed"
🔄 Running: "Starting agent discovery"
📊 Results: "Found X grants"
❌ Error: "Agent discovery failed"
```

**Example query:**
```bash
# Monitor agent scheduler
aws logs tail /aws/lambda/amplify-grow2-*-AgentDiscoverySchedulerF* --follow

# Monitor agent execution
aws logs tail /aws/lambda/amplify-grow2-*-AgentDiscoverySearchFunc* --follow

# Check Step Function logs
aws logs tail amplify-grow2-*-AgentDiscoveryWorkflowV2StepFunctionLogsV2* --follow
```

---

### Agent Selected Grants
**UI Location:** Left nav → "Agent Selected Grants"

Uses the same logs as **Agent Config** above, plus:
- Agent Update Lambda for storing results

**What to monitor:**
- Agent-selected grants appearing in UI
- Match scores
- Result filtering

---

### Chat Assistant
**UI Location:** Bottom left → Chat button (💬)

**Chat Handler:**
- Lambda: `*-ChatHandlerFunctionE48F1-*`

**What to monitor:**
- Chat requests
- AI responses
- Response time

**Example query:**
```bash
# Monitor chat interactions
aws logs tail /aws/lambda/amplify-grow2-*-ChatHandlerFunction* --follow
```

---

### E2E Tests Documentation
**UI Location:** Left nav → "E2E Tests Documentation"

This is static content served from the React app. No dedicated logs.

---

## AgentCore Agents (Bedrock)

All AgentCore agents have dedicated log groups:

### Grant Search Agents
- **US Grants:** `/aws/bedrock-agentcore/runtimes/grants_search_agent_v2-*`
- **EU Grants:** `/aws/bedrock-agentcore/runtimes/eu_grants_search_agent_v2-*`

### Proposal Agents
- **Generation:** `/aws/bedrock-agentcore/runtimes/proposal_generation_agent-*`
- **Evaluation:** `/aws/bedrock-agentcore/runtimes/proposal_evaluator_agent-*`

### Utility Agents
- **PDF Converter:** `/aws/bedrock-agentcore/runtimes/pdf_converter_agent-*`

**What to monitor:**
- Agent invocations
- AI model responses
- Processing time
- Errors and retries

**Example query:**
```bash
# Monitor proposal generation agent
aws logs tail /aws/bedrock-agentcore/runtimes/proposal_generation_agent-* --follow

# Monitor US grants search agent
aws logs tail /aws/bedrock-agentcore/runtimes/grants_search_agent_v2-* --follow
```

---

## AppSync GraphQL API

**Log Group:** `/aws/appsync/apis/[api-id]`

**What to monitor:**
- GraphQL queries and mutations
- Real-time subscriptions
- API errors
- Authentication issues

**Common operations:**
- `createUserProfile`, `updateUserProfile`
- `createProposal`, `updateProposal`
- `createGrantRecord`, `updateGrantRecord`
- Subscriptions: `onCreateProposal`, `onUpdateProposal`

**Example query:**
```bash
# Monitor AppSync API
aws logs tail /aws/appsync/apis/* --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name "/aws/appsync/apis/*" \
  --filter-pattern "ERROR"
```

---

## Post-Deployment Seeder

**Log Group:** `/aws/codebuild/amplify-grow2-*-PostDeploymentSeeder`

**What to monitor:**
- Seeder execution status
- Demo data creation
- React app deployment
- Build errors

**Example query:**
```bash
# Monitor seeder execution
aws logs tail /aws/codebuild/amplify-grow2-*-PostDeploymentSeeder --follow
```

---

## CloudWatch Insights Queries

### Find Errors Across All Lambdas

```sql
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

### Monitor Proposal Generation Performance

```sql
fields @timestamp, @message
| filter @message like /Generation took/
| parse @message "Generation took * seconds" as duration
| stats avg(duration), max(duration), min(duration)
```

### Track Grant Search Results

```sql
fields @timestamp, @message
| filter @message like /Found * grants/
| parse @message "Found * grants" as count
| stats avg(count), max(count), min(count) by bin(5m)
```

### Monitor Agent Discovery Runs

```sql
fields @timestamp, @message
| filter @message like /Agent discovery/
| sort @timestamp desc
| limit 50
```

---

## Setting Up CloudWatch Alarms

### High Error Rate Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "GROW2-High-Error-Rate" \
  --alarm-description "Alert when error rate exceeds threshold" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### Slow Proposal Generation

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "GROW2-Slow-Proposal-Generation" \
  --alarm-description "Alert when proposal generation is slow" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=*ProposalGenerationAgentc* \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 300000 \
  --comparison-operator GreaterThanThreshold
```

---

## Performance Benchmarks

### Expected Performance

| Feature | Expected Time | Threshold |
|---------|--------------|-----------|
| Grant Search (US) | < 30 seconds | 60 seconds |
| Grant Search (EU) | < 30 seconds | 60 seconds |
| Proposal Generation | 2-5 minutes | 10 minutes |
| Document Upload | < 10 seconds | 30 seconds |
| Document Processing | < 2 minutes | 5 minutes |
| Agent Discovery | < 3 minutes | 10 minutes |
| Chat Response | < 5 seconds | 15 seconds |

### Monitoring Performance

```bash
# Check Lambda duration metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=amplify-grow2-*-GrantsSearchV2Function* \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

---

## Troubleshooting with Logs

### Feature Not Working

1. **Identify the feature** (use table above)
2. **Find the log group** for that feature
3. **Check recent logs** for errors
4. **Look for common patterns** (see feature sections)

### Slow Performance

1. **Check CloudWatch metrics** for duration
2. **Review logs** for bottlenecks
3. **Compare to benchmarks** (see table above)
4. **Check for errors** that might cause retries

### No Results Appearing

1. **Check AppSync logs** for GraphQL errors
2. **Check Lambda logs** for processing errors
3. **Verify subscriptions** are working (real-time updates)
4. **Check DynamoDB** for data presence

---

## Additional Resources

- [Amazon CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [Updating Guide](UPDATING.md) - Deploy updates
- [Troubleshooting Guide](../cleanup/TROUBLESHOOTING.md) - Common issues

---

**Last Updated:** February 4, 2026
