# Proposal Evaluator Agent

A2A (Agent-to-Agent) protocol agent that evaluates proposal quality against grant guidelines and source materials.

## What It Does

- Receives proposal content, prompt, and metadata via AgentCore invoke_agent_runtime
- Evaluates against 4 criteria:
  - **Content Quality (30%)**: Based on semantic search scores
  - **Guideline Adherence (40%)**: Uses Claude to analyze against prompt criteria
  - **Completeness (20%)**: Checks sections and word counts
  - **Source Utilization (10%)**: Analyzes chunk usage and diversity
- Returns structured evaluation with scores, strengths, weaknesses, and recommendations

## AgentCore Integration

This agent uses the `bedrock-agentcore` SDK with `@app.entrypoint` decorator:
- Called by orchestrator via `boto3.client('bedrock-agentcore').invoke_agent_runtime()`
- Receives JSON payload directly (not JSON-RPC)
- Returns JSON response directly
- ARN stored in SSM: `/agentcore/proposal-evaluator/arn`

## Build and Deploy

```bash
# Build and push to ECR
./setup.sh

# Quick rebuild after code changes
./quick-rebuild.sh
```

## Environment Variables

- `AWS_REGION` - AWS region (default: us-east-2)

## Input Format

```json
{
  "proposalId": "uuid",
  "userId": "user-id",
  "proposalContent": {
    "html": "<full HTML>",
    "sections": {
      "executive_summary": { "content": "...", "wordCount": 500 }
    }
  },
  "prompt": {
    "content": "Full prompt with guidelines...",
    "successCriteria": ["criterion 1", "criterion 2"]
  },
  "contentQuality": {
    "level": "MODERATE",
    "avgScore": 0.42,
    "color": "yellow",
    "totalChunks": 15
  },
  "grantInfo": {
    "grantId": "357210",
    "title": "AI Research Grant"
  }
}
```

## Output Format

```json
{
  "evaluationId": "uuid",
  "proposalId": "uuid",
  "evaluatedAt": "2026-01-11T20:30:00Z",
  "overallScore": 0.72,
  "overallGrade": "B",
  "confidence": "HIGH",
  "scores": {
    "contentQuality": { "score": 0.65, "weight": 0.30, "grade": "C+" },
    "guidelineAdherence": { "score": 0.85, "weight": 0.40, "grade": "B+" },
    "completeness": { "score": 0.70, "weight": 0.20, "grade": "C+" },
    "sourceUtilization": { "score": 0.75, "weight": 0.10, "grade": "B-" }
  },
  "strengths": ["Strong technical approach", "Good methodology"],
  "weaknesses": ["Missing budget section", "Brief executive summary"],
  "recommendations": ["Add budget justification", "Expand summary"],
  "redFlags": ["Budget section completely missing"]
}
```

## Testing Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export AWS_REGION=us-east-2

# Test with sample proposal
python ../python/test_proposal_evaluator_direct.py
```

## IAM Permissions Required

The agent needs these permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel"
  ],
  "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
}
```

## Integration with Orchestrator

The proposal orchestrator calls this agent at Step 5.7 (after PDF conversion):

1. Orchestrator generates proposal and converts to PDF
2. Orchestrator calls evaluator via `invoke_agent_runtime()`
3. Evaluator analyzes proposal against guidelines
4. Evaluator returns structured evaluation
5. Orchestrator stores evaluation in DynamoDB metadata
6. UI displays evaluation badge and details

## Evaluation Criteria Details

### Content Quality (30%)
Maps semantic search scores to evaluation scores:
- RED (0.0-0.25): 0.25 score - Major penalty
- ORANGE (0.26-0.35): 0.50 score - Moderate penalty
- YELLOW (0.36-0.50): 0.70 score - Minor penalty
- GREEN (0.51+): 0.90 score - Good quality

### Guideline Adherence (40%)
Uses Claude 3.5 Sonnet to analyze:
- Does proposal address each success criterion?
- Are required sections present and substantive?
- Does it follow grant-specific requirements?

### Completeness (20%)
Checks:
- Number of sections (expect ~5)
- Total word count (expect ~3000)
- Section-level word counts

### Source Utilization (10%)
Analyzes:
- Number of chunks used (expect ~20)
- Average semantic score quality
- Source diversity

## Error Handling

- Returns error if required parameters missing
- Falls back to heuristic scoring if Claude call fails
- Logs all errors for debugging

## Dependencies

- **bedrock-agentcore**: AgentCore SDK for A2A communication
- **anthropic**: Claude API for guideline analysis
- **boto3**: AWS SDK for Bedrock Runtime

## Deployment Checklist

- [ ] Run `./setup.sh` to build and push to ECR
- [ ] Create AgentCore Runtime in AWS Console
- [ ] Use image URI from setup.sh output
- [ ] Set AWS_REGION environment variable
- [ ] Note the Runtime ARN
- [ ] Store ARN in SSM: `/agentcore/proposal-evaluator/arn`
- [ ] Update orchestrator to call evaluator at Step 5.7
- [ ] Test with `python/test_proposal_evaluator_direct.py`
- [ ] Deploy sandbox with `npx ampx sandbox`
- [ ] Verify evaluation appears in proposal metadata

## Monitoring

Check agent logs:
```bash
aws logs tail /aws/bedrock-agentcore/runtimes/proposal_evaluator_agent --follow
```

## Future Enhancements

- Comparative analysis against successful past proposals
- Agency-specific evaluation rules (NSF vs NIH vs DOD)
- Iterative improvement suggestions
- Success prediction ML model
