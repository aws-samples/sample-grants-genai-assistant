# US Grants Search Agent V2 - AgentCore Native

This is the V2 implementation of the US grants search agent, designed to run natively on Amazon Bedrock AgentCore Runtime with async task management.

## Key Differences from V1

| Feature | V1 (Legacy) | V2 (AgentCore Native) |
|---------|-------------|----------------------|
| **Architecture** | Initiator → SQS → Processor → Agent | Initiator → Agent |
| **Orchestration** | Processor Lambda | Agent itself |
| **Async Pattern** | SQS queue | AgentCore async tasks |
| **Max Duration** | 15 minutes (Lambda) | 8 hours (AgentCore) |
| **DDB Writes** | Processor Lambda | Agent |
| **Bayesian Scoring** | Processor Lambda | Agent |
| **Components** | 4 | 2 |

## How It Works

1. **Initiator Lambda** calls AgentCore Runtime
2. **Agent entrypoint** returns immediately with "STARTED" status
3. **Background thread** spawns for long-running work:
   - Calls grants.gov API
   - Fetches grant details
   - Applies Bayesian scoring
   - Writes GrantRecords to DynamoDB
   - Publishes SearchEvents to AppSync
4. **UI** subscribes to DynamoDB changes for real-time updates

## Async Task Management

The agent uses AgentCore's built-in async task tracking:

```python
@app.entrypoint
def invoke(payload):
    # Start async task
    task_id = app.add_async_task("grant_search", {...})
    
    # Spawn background thread
    def background_work():
        try:
            # Long-running work
            search_grants()
            apply_scoring()
            write_to_dynamodb()
        finally:
            app.complete_async_task(task_id)
    
    threading.Thread(target=background_work, daemon=True).start()
    
    # Return immediately
    return {"status": "STARTED"}
```

## Dependencies

- `bedrock-agentcore`: AgentCore Runtime SDK
- `boto3`: AWS SDK for DynamoDB/AppSync
- `spacy`: NLP for query parsing
- `httpx`: HTTP client for grants.gov API
- `bayesian_matcher.py`: Shared scoring logic from V1

## Deployment

### 1. Build Docker Image

```bash
cd bc/grants-search-agent-v2

# Copy Bayesian matcher from V1
cp ../../amplify/functions/grants-search-processor/bayesian_matcher.py .

# Build image
docker build -t grants-search-agent-v2 .
```

### 2. Deploy to AgentCore Runtime

```bash
# Using AgentCore Starter Toolkit
python deploy_v2.py
```

### 3. Store Agent ARN in SSM

```bash
aws ssm put-parameter \
  --name /grants-platform/agents/us-grants-v2-arn \
  --value "arn:aws:bedrock-agentcore:us-east-1:123456789012:agent-runtime/..." \
  --type String
```

### 4. Deploy Initiator Lambda

```bash
npx ampx sandbox
```

## Testing

### Local Testing

```bash
# Run agent locally
python agent.py

# Test with curl
curl -X POST http://localhost:8080/invocations \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "test_123",
    "query": "artificial intelligence",
    "cognitoUserId": "user_123"
  }'
```

### Production Testing

```bash
# Call V2 mutation from UI
mutation {
  startGrantSearchV2(input: {
    sessionId: "search_123"
    query: "machine learning"
  })
}

# Subscribe to updates
subscription {
  onSearchEventUpdate(sessionId: "search_123") {
    eventType
    data
  }
}
```

## Monitoring

### CloudWatch Logs

- Log Group: `/aws/bedrock-agentcore/runtimes/grants-search-v2`
- Look for: `[V2]` prefix in all log messages

### X-Ray Tracing

AgentCore automatically instruments the agent with X-Ray for distributed tracing.

### Metrics

- **Latency**: Time from request to first grant displayed
- **Error Rate**: % of searches that fail
- **Task Duration**: How long background tasks take
- **DDB Write Rate**: Grants written per second

## Troubleshooting

### Agent Not Starting

Check:
- Docker image built correctly
- Agent ARN in SSM Parameter Store
- Execution role has DynamoDB permissions

### Background Task Fails

Check:
- CloudWatch Logs for error messages
- grants.gov API availability
- DynamoDB table permissions

### No Grants Appearing in UI

Check:
- SearchEvent records being written
- GrantRecord records being written
- UI subscription is active
- Session ID matches

## Rollback to V1

If V2 has issues, simply use `startGrantSearch` mutation instead of `startGrantSearchV2`. V1 remains fully functional.

## Future Enhancements

- Streaming results (yield grants as found)
- Multi-agent orchestration (research → critique → synthesis)
- AgentCore Memory integration
- MCP server integration for external tools
