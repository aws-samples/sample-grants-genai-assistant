# Running Agent Discovery Manually

The agent discovery step function runs automatically on a schedule, but you can trigger it manually at any time — useful for testing or forcing a fresh grant search.

## Step 1: Get your userId and configId

You need two values from DynamoDB:

**userId** — your Cognito user ID (not your email):
1. Go to **Cognito** → User Pools → select the Grow2 pool
2. Click **Users** → click your user (e.g. `test_user@example.com`)
3. Copy the **Username** value (a UUID like `d498b498-c031-7070-855a-ae1491d5a860`)

**configId** — your agent config record ID:
1. Go to **DynamoDB** → Tables → find the table named `AgentConfig-...`
2. Click **Explore table items**
3. Find the row where `userId` matches your Cognito username
4. Copy the `id` value (a UUID like `3ad540e4-5550-4695-9c69-a889ab94f6f7`)

Or use CloudShell to get both at once:

```bash
# Get your userId from Cognito
USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 --region us-east-1 \
  --query 'UserPools[?contains(Name,`grow2`)].Id' --output text)

USER_ID=$(aws cognito-idp list-users --user-pool-id $USER_POOL_ID --region us-east-1 \
  --query 'Users[?contains(Username,`test_user`)].Username' --output text)
echo "userId: $USER_ID"

# Get your configId from DynamoDB
CONFIG_TABLE=$(aws dynamodb list-tables --region us-east-1 \
  --query 'TableNames[?contains(@,`AgentConfig`)]' --output text)

aws dynamodb scan --table-name $CONFIG_TABLE --region us-east-1 \
  --query 'Items[0].id.S' --output text
```

## Step 2: Start the execution

1. Go to **Step Functions** in the AWS console
2. Find the state machine named `AgentDiscoveryWorkflowV2...`
3. Click **Start execution**
4. Paste this JSON, substituting your values:

```json
{
  "input": {
    "userId": "YOUR_USER_ID",
    "configId": "YOUR_CONFIG_ID",
    "forceRun": true
  }
}
```

`forceRun: true` bypasses the schedule check and runs immediately regardless of when it last ran.

## Step 3: Monitor progress

The execution has 4 states:

1. **CheckAgentConfig** (~5s) — validates config and builds search queries
2. **InvokeParallelSearches** (~10s) — fires 6 parallel searches (3 US + 3 EU)
3. **WaitForProcessors** (~2 min) — waits for all agents to write results to DynamoDB
4. **ConsolidateResults** (~10s) — ranks and surfaces top grants to your profile
5. **UpdateConfig** (~5s) — records lastRun timestamp

Total time: ~3-4 minutes.

## Step 4: Verify results

After the execution succeeds, refresh the Grants page in the app — new grants should appear ranked by relevance to your profile.

You can also check DynamoDB directly:
```bash
GRANT_TABLE=$(aws dynamodb list-tables --region us-east-1 \
  --query 'TableNames[?contains(@,`GrantRecord`)]' --output text)

aws dynamodb scan --table-name $GRANT_TABLE --region us-east-1 \
  --query 'Count'
```
