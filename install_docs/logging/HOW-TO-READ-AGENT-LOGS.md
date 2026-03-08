# How to Read Agent Logs in CloudWatch

## Why It's Confusing

AgentCore agents don't have a single log stream. Every time the container
starts (cold start) or scales, it creates a **new log stream**. A single
proposal run may span multiple streams. All streams are named with the
prefix `[runtime-logs]` — there are no separate "app-logs" streams.

The log group names are:

| Agent | Log Group |
|-------|-----------|
| Proposal Generation | `/aws/bedrock-agentcore/runtimes/proposal_generation_agent-AJjrnVByTQ-DEFAULT` |
| EU Grants Search | `/aws/bedrock-agentcore/runtimes/eu_grants_search_agent_v2-PUQZkw8QHj-DEFAULT` |
| US Grants Search | `/aws/bedrock-agentcore/runtimes/grants_search_agent_v2-hb6j0UAd4R-DEFAULT` |
| PDF Converter | `/aws/bedrock-agentcore/runtimes/pdf_converter_agent-VDvTznA6Yn-DEFAULT` |
| Proposal Evaluator | `/aws/bedrock-agentcore/runtimes/proposal_evaluator_agent-mt4P8897XK-DEFAULT` |

---

## Option 1: AWS Console (Easiest)

1. Go to **CloudWatch → Log groups**
2. Search for `/aws/bedrock-agentcore/runtimes/proposal_generation_agent`
3. Click the log group
4. Click **"Search log group"** (top right) — this searches ALL streams at once
5. Enter a search term like `INVOKE` or `AGENCY` or `Claude` or `ERROR`
6. Set the time range to the last 30 minutes
7. Results show which stream the log came from

This is the easiest way — you don't need to pick a stream first.

---

## Option 2: CloudWatch Logs Insights (Best for Debugging)

1. Go to **CloudWatch → Logs Insights**
2. Select the log group `/aws/bedrock-agentcore/runtimes/proposal_generation_agent-AJjrnVByTQ-DEFAULT`
3. Set time range to last 1 hour
4. Run this query to see all proposal agent activity:

```
fields @timestamp, @message
| filter @message like /Proposal Agent/
| sort @timestamp asc
| limit 200
```

To find a specific proposal run:
```
fields @timestamp, @message
| filter @message like /INVOKE/ or @message like /AGENCY/ or @message like /Claude/ or @message like /ERROR/
| sort @timestamp asc
| limit 100
```

To find errors only:
```
fields @timestamp, @message
| filter @message like /ERROR/ or @message like /Exception/ or @message like /❌/
| sort @timestamp desc
| limit 50
```

---

## Option 3: AWS CLI — One Command to Find the Active Run

The agent creates 10+ startup streams that all look identical. The invoke
(actual proposal work) lands in exactly one of them. Use `filter-log-events`
to search ALL streams at once — no stream-picking needed.

### Step 1: Find which stream has the active invoke (last 30 min)

**Proposal agent** (uses `INVOKE FUNCTION CALLED`):
```bash
aws logs filter-log-events \
  --log-group-name "/aws/bedrock-agentcore/runtimes/proposal_generation_agent-AJjrnVByTQ-DEFAULT" \
  --region us-east-1 \
  --start-time $(python3 -c "import time; print(int((time.time()-1800)*1000))") \
  --filter-pattern "INVOKE FUNCTION CALLED" \
  --query 'events[*].{stream:logStreamName,msg:message}' \
  --output table
```

**Search agents** (use `Agent invoked with payload`):
```bash
# US Grants
aws logs filter-log-events \
  --log-group-name "/aws/bedrock-agentcore/runtimes/grants_search_agent_v2-hb6j0UAd4R-DEFAULT" \
  --region us-east-1 \
  --start-time $(python3 -c "import time; print(int((time.time()-1800)*1000))") \
  --filter-pattern "Agent invoked with payload" \
  --query 'events[*].{stream:logStreamName,msg:message}' \
  --output table

# EU Grants
aws logs filter-log-events \
  --log-group-name "/aws/bedrock-agentcore/runtimes/eu_grants_search_agent_v2-PUQZkw8QHj-DEFAULT" \
  --region us-east-1 \
  --start-time $(python3 -c "import time; print(int((time.time()-1800)*1000))") \
  --filter-pattern "Agent invoked with payload" \
  --query 'events[*].{stream:logStreamName,msg:message}' \
  --output table
```

### Step 2: Tail that stream for the full run
```bash
aws logs get-log-events \
  --log-group-name "/aws/bedrock-agentcore/runtimes/proposal_generation_agent-AJjrnVByTQ-DEFAULT" \
  --log-stream-name "PASTE_STREAM_NAME_HERE" \
  --region us-east-1 \
  --start-from-head \
  --output json | python3 -c "
import json,sys
for e in json.load(sys.stdin)['events']:
    m = e['message'].strip()
    if any(k in m for k in ['INVOKE','STEP','AGENCY','Model','Claude','section','word','✅','❌','ERROR','token','trimm','COMPLETE','FAILED','Traceback']):
        print(m)
"
```

### One-liner: search all streams for any keyword
```bash
aws logs filter-log-events \
  --log-group-name "/aws/bedrock-agentcore/runtimes/proposal_generation_agent-AJjrnVByTQ-DEFAULT" \
  --region us-east-1 \
  --start-time $(python3 -c "import time; print(int((time.time()-1800)*1000))") \
  --filter-pattern "KEYWORD_HERE" \
  --query 'events[*].message' \
  --output text
```

Replace `KEYWORD_HERE` with:
- `"INVOKE"` — find the active run stream
- `"AGENCY DETECTED"` — confirm agency detection
- `"Claude returned"` — see word counts per section
- `"ERROR"` — find failures
- `"COMPLETE"` — confirm proposal finished
- `"token"` — check token budget / trimming
- `"Traceback"` — find Python exceptions

---

## What to Look For in a Search Run

A successful search produces these key log lines:

```
[V2] Agent invoked with payload: {...}           ← invoke received
[V2] ========== STEP 1: SEARCHING GRANTS.GOV ==========
[V2] API returned 25 grants (total: 169)
[V2] ========== STEP 2: APPLYING BAYESIAN SCORING ==========
[V2] 🧠 Applying Bayesian scoring for user <id>
[V2] ✅ Bayesian scoring complete
[V2] ========== STEP 3: WRITING TO DYNAMODB VIA APPSYNC ==========
[V2] 📊 SEARCH SUMMARY: 25 grants, score range 0.42–0.91   ← quick quality check
[V2]   #1 [0.91] Advancing AI in Agricultural Systems (USDA)
[V2]   #2 [0.87] Machine Learning for Crop Prediction (NSF)
...
[V2] ========== STEP 4: PUBLISHING COMPLETION EVENT ==========
[V2] ========== BACKGROUND SEARCH COMPLETE ==========
```

The `📊 SEARCH SUMMARY` line is the fastest way to see if results are relevant
without scrolling through 25 individual grant lines.

---

## What to Look For in a Proposal Run

A successful run produces these log lines in order:

```
CODE VERSION: 2026-03-05-v4 — Opus 4.6 ...     ← confirms new image is running
✅ CLAUDE_MODEL_ID: us.anthropic.claude-opus-4-6-v1  ← confirms model
🎯 INVOKE FUNCTION CALLED!                       ← proposal request received
🤖 Model: us.anthropic.claude-opus-4-6-v1 (tier=opus)  ← model re-confirmed
🧵 Background thread started for proposal ...   ← async work begins
========== STEP 1: INITIALIZING ==========
========== STEP 2: RETRIEVING CONTEXT ==========
🔍 AGENCY DETECTED: 'European-Commission-Prompt'  ← agency detection
========== STEP 3: PREPARING PROMPTS ==========
🔍 PROMPTS FOUND: 3 for agency 'European-Commission-Prompt'
========== STEP 4: GENERATING SECTIONS ==========
🤖 Calling Claude for section 1/3: Excellence   ← LLM call starting
🤖 invoke_model_with_response_stream → us.anthropic.claude-opus-4-6-v1
✅ Claude returned 6842 words for 'Excellence'  ← LLM call done
🤖 Calling Claude for section 2/3: Impact
...
========== STEP 5: ASSEMBLING & UPLOADING ==========
========== STEP 5.5: CONVERTING TO PDF ==========
========== STEP 5.7: EVALUATING PROPOSAL QUALITY ==========
========== STEP 6: COMPLETE ==========
✅ Proposal generation complete: <proposal-id>
```

If you see `❌` or `ERROR` anywhere in that sequence, that's where it failed.

---

## Common Issues

**No streams at all after submitting a proposal**
- Container is cold starting — wait 2-3 minutes and check again
- The log group name may have changed — check AgentCore console for the current runtime ARN

**Logs stop after "Calling app.run()" with no INVOKE**
- Container started but the invoke hasn't arrived yet — wait and refresh
- Or the invoke failed before reaching the agent — check the Lambda log group:
  `/aws/lambda/amplify-grow2-root-sandbo-proposalGenerationAgentcore-*`

**"prompt is too long" error**
- Token budget exceeded — check the `✂️ Trimming content` log line to see how much was trimmed
- If trimming didn't fire, the `CHARS_PER_TOKEN` estimate was off

**Logs show INVOKE but then nothing**
- Background thread may have crashed silently — search for `Exception` or `Traceback`
