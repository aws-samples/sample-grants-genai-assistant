#!/bin/bash
# watch-proposal-logs.sh
# Find and tail the active proposal generation run in CloudWatch.
#
# Usage:
#   ./watch-proposal-logs.sh                    # last 30 min, us-east-1
#   ./watch-proposal-logs.sh 60                 # last 60 min
#   ./watch-proposal-logs.sh 30 us-west-2       # different region

MINUTES=${1:-30}
REGION=${2:-us-east-1}
LOG_GROUP="/aws/bedrock-agentcore/runtimes/proposal_generation_agent-AJjrnVByTQ-DEFAULT"
START_MS=$(python3 -c "import time; print(int((time.time() - $MINUTES * 60) * 1000))")

echo "=== Searching for active proposal run (last ${MINUTES} min, ${REGION}) ==="
echo ""

# Step 1: find the stream that has the INVOKE
STREAM=$(aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --region "$REGION" \
  --start-time "$START_MS" \
  --filter-pattern "INVOKE FUNCTION CALLED" \
  --output json 2>/dev/null | python3 -c "
import json,sys
data=json.load(sys.stdin)
events=data.get('events',[])
if events:
    print(events[0]['logStreamName'])
" 2>/dev/null)

if [ -z "$STREAM" ] || [ "$STREAM" = "None" ]; then
  echo "❌ No active invoke found in the last ${MINUTES} minutes."
  echo ""
  echo "Try:"
  echo "  1. Trigger a proposal from the UI first"
  echo "  2. Increase the time window: ./watch-proposal-logs.sh 60"
  echo "  3. Check the Lambda initiator logs:"
  echo "     aws logs tail /aws/lambda/amplify-grow2-root-sandbo-ProposalGenerationAgentc-mAixNu9t0x9X --since ${MINUTES}m --region $REGION"
  exit 1
fi

echo "✅ Found invoke in stream: $STREAM"
echo ""
echo "=== Key events from this run ==="
echo ""

aws logs get-log-events \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$STREAM" \
  --region "$REGION" \
  --start-from-head \
  --output json | python3 -c "
import json, sys, base64

data = json.load(sys.stdin)
events = data.get('events', [])

KEYWORDS = [
    'INVOKE', 'STEP', 'AGENCY', 'Model:', 'Claude returned', 'Calling Claude',
    'invoke_model_with_response_stream', 'section', 'word', 'token', 'trimm',
    'Prepared prompt', 'Retrieved', 'Detected', 'PROCESSING', 'COMPLETE',
    'FAILED', 'Traceback', 'ERROR', '✅', '❌', '🎯', '🧵', '🤖', '✂️',
    'CODE VERSION', 'Background thread', 'GENERATING', 'ASSEMBLING',
    'CONVERTING', 'EVALUATING', 'PDF', 'S3', 'upload'
]

for e in events:
    msg = e['message'].strip()
    if any(k in msg for k in KEYWORDS):
        # Skip botocore debug noise
        if 'botocore' in msg or 'urllib3' in msg or 'Response body' in msg or 'Response headers' in msg:
            continue
        print(msg)
"

echo ""
echo "=== Full stream: $STREAM ==="
echo "To see raw stream: aws logs get-log-events --log-group-name \"$LOG_GROUP\" --log-stream-name \"$STREAM\" --region $REGION --start-from-head --output text"
