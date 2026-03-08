# EU Grants Search Agent V2 - AgentCore Native

This is the V2 implementation of the EU Grants Search agent using AWS Bedrock AgentCore Runtime's native async task management.

## Key Features

- **AgentCore Native**: Uses `app.add_async_task()` for background processing
- **S3 Cache Reading**: Reads from S3 cache updated nightly (NO API fallback per requirement)
- **Grant Details Fetching**: Fetches full details from Topic Details API
- **Bayesian Scoring**: Applies dual scoring (keyword + profile matching)
- **Direct DynamoDB Writes**: Writes directly to DynamoDB via AppSync
- **Real-time Updates**: Publishes progress events to AppSync
- **Long-running Support**: Supports up to 8-hour execution
- **Self-contained**: No external orchestration needed

## Architecture

```
UI → AppSync → Initiator Lambda → AgentCore Runtime
                                        ↓
                            Agent (background thread)
                                        ↓
                        S3 Cache (nightly updated)
                                        ↓
                        Topic Details API
                                        ↓
                        Bayesian Scoring
                                        ↓
                        DynamoDB + AppSync
```

## Differences from V1

| Feature | V1 | V2 |
|---------|----|----|
| Orchestration | SQS + Processor Lambda | AgentCore async tasks |
| Data Source | S3 cache with API fallback | S3 cache only (NO fallback) |
| Grant Details | Fetched in processor | Fetched in agent |
| DynamoDB Writes | Via processor Lambda | Direct via AppSync |
| AppSync Events | Via processor Lambda | Direct via AppSync |
| Execution Time | 15 min (Lambda limit) | 8 hours (AgentCore) |
| Complexity | 3 components | 2 components |

## Setup

```bash
# Run setup script
bash setup.sh

# This will:
# - Use shared venv from parent directory
# - Install agent-specific requirements
# - Copy Bayesian matcher from EU V1 processor
```

## Deployment

```bash
# Configure and deploy
agentcore configure

# When prompted:
# - Agent name: eu_grants_search_agent_v2
# - Use existing execution role ARN
# - Press Enter for other defaults

# After first deployment, add permissions:
bash ../../shell/add-eu-v2-dynamodb-permissions.sh

# Store agent ARN in SSM:
aws ssm put-parameter \
  --name /grants-platform/agents/eu-grants-v2-arn \
  --value 'arn:aws:bedrock:us-east-1:ACCOUNT:agent-runtime/AGENT_ID' \
  --type String \
  --overwrite
```

## Testing

```bash
# End-to-end test
python python/test_eu_grants_search_v2.py

# Check agent logs
python python/check_v2_agent_logs.py

# Check Lambda logs
python python/check_v2_lambda_logs.py
```

## Critical Implementation Notes

### 1. Import Timing
Set `USER_PROFILE_TABLE` environment variable BEFORE importing `bayesian_matcher`:
```python
os.environ['USER_PROFILE_TABLE'] = user_profile_table_name
from bayesian_matcher import apply_dual_scoring
```

### 2. S3 Cache Reading (NO API Fallback)
Per user requirement, if S3 fails, it's an infrastructure issue:
```python
try:
    # Read from S3 cache
    response = s3.get_object(Bucket=cache_bucket, Key='eu_grants_latest.json')
except Exception as e:
    # NO API FALLBACK - raise error
    raise Exception(f"S3 cache read failed - infrastructure issue: {str(e)}")
```

### 3. Grant Details Fetching
Fetch from Topic Details API for top matches:
```python
url = f"https://ec.europa.eu/info/funding-tenders/opportunities/data/topicDetails/{identifier_lower}.json"
```

### 4. Bayesian Scoring
Apply BEFORE creating database records:
```python
scored_grants = apply_dual_scoring(grants, cognito_user_id, query)
for grant in scored_grants:
    write_eu_grant_record(session_id, grant, table, cognito_user_id)
```

### 5. AppSync Dual Writes
Write to DynamoDB AND publish to AppSync:
```python
appsync_client.create_eu_grant_record(record)  # Writes to DDB + triggers subscription
```

### 6. Progress Events
Publish 4-step progress:
```python
# Step 1: Reading from S3
# Step 2: Applying Bayesian scoring
# Step 3: Writing to DynamoDB
# Step 4: Publishing completion
```

## Monitoring

```bash
# Watch agent logs
aws logs tail /aws/bedrock-agentcore/runtimes/eu_grants_search_agent_v2-xxxxx-DEFAULT --follow

# Watch Lambda logs
aws logs tail /aws/lambda/amplify-xxx-EuGrantsSearchV2Function-xxx --follow

# Filter for errors
aws logs tail /aws/bedrock-agentcore/runtimes/eu_grants_search_agent_v2-xxxxx-DEFAULT \
  --follow --filter-pattern 'ERROR'
```

## Troubleshooting

### Common Issues

1. **KeyError: USER_PROFILE_TABLE**
   - Cause: Import timing issue
   - Fix: Set env var BEFORE importing bayesian_matcher

2. **S3 cache read failed**
   - Cause: Cache bucket not configured or file missing
   - Fix: Check SSM parameter `/grants-platform/eu-grants-cache-bucket`
   - Note: NO API fallback - this is an infrastructure issue

3. **AccessDeniedException: dynamodb:Scan**
   - Cause: Missing DynamoDB permissions
   - Fix: Run `bash ../../shell/add-eu-v2-dynamodb-permissions.sh`

4. **You must specify a region** or **NoRegionError**
   - Cause: AWS_REGION environment variable not set by AgentCore Runtime
   - Expected: AgentCore Runtime should automatically set AWS_REGION
   - Fix: This should not happen - if it does, it's an AgentCore configuration issue
   - Workaround: Check agent execution role and AgentCore Runtime configuration
   - Note: The agent reads AWS_REGION from environment and passes it to all boto3 clients

## Files

- `agent.py` - Main agent with async task pattern
- `appsync_client.py` - AppSync GraphQL client
- `requirements.txt` - Python dependencies
- `Dockerfile` - Container definition
- `setup.sh` - Build and deploy script
- `quick-rebuild.sh` - Fast rebuild script
- `README.md` - This file
