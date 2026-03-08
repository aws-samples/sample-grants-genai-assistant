# PDF Converter Agent

A2A (Agent-to-Agent) protocol agent that converts HTML proposals to PDF format.

## What It Does

- Receives HTML content via A2A JSON-RPC 2.0 protocol
- Converts HTML to PDF using WeasyPrint
- Uploads PDF to S3
- Returns presigned URL for download

## A2A Protocol

This agent implements the A2A protocol specification:
- **Port**: 9000 (A2A standard)
- **Protocol**: JSON-RPC 2.0
- **Endpoints**:
  - `POST /` - Main message endpoint
  - `GET /.well-known/agent-card.json` - Agent discovery
  - `GET /ping` - Health check

## Build and Deploy

```bash
# Build and push to ECR
./setup.sh

# The script will output the image URI to use in AgentCore Runtime
```

## Environment Variables

- `PROPOSALS_BUCKET` - S3 bucket name for storing PDFs
- `AWS_REGION` - AWS region (default: us-east-1)

## Input Format

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [{
        "kind": "text",
        "text": "{\"html\": \"<html>...</html>\", \"proposalId\": \"proposal-123\", \"userId\": \"user-456\"}"
      }]
    }
  }
}
```

## Output Format

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "artifacts": [{
      "artifactId": "pdf-proposal-123",
      "name": "pdf_conversion_result",
      "parts": [{
        "kind": "text",
        "text": "{\"pdfUrl\": \"https://s3...\", \"s3Key\": \"user-456/proposal-123/proposal.pdf\", \"convertedAt\": \"2026-01-11T10:00:00Z\"}"
      }]
    }]
  }
}
```

## Testing Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PROPOSALS_BUCKET=your-bucket-name
export AWS_REGION=us-east-1

# Run agent
python agent.py

# Test health check
curl http://localhost:9000/ping

# Test agent card
curl http://localhost:9000/.well-known/agent-card.json
```

## IAM Permissions Required

The agent needs these S3 permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::your-bucket-name/*"
}
```

## Integration with Orchestrator

The proposal orchestrator agent will invoke this agent after proposal generation completes:

1. Orchestrator generates proposal HTML
2. Orchestrator discovers this agent via Agent Card
3. Orchestrator sends HTML via A2A protocol
4. This agent converts to PDF and uploads to S3
5. This agent returns PDF URL
6. Orchestrator updates DynamoDB with PDF URL
7. UI shows PDF download button

## Error Handling

- Returns JSON-RPC error codes:
  - `-32602`: Invalid params (missing required fields)
  - `-32603`: Internal error (conversion failed, S3 upload failed, etc.)

## Dependencies

- **WeasyPrint**: HTML to PDF conversion
- **Flask**: Web server for A2A endpoints
- **Boto3**: AWS S3 operations
