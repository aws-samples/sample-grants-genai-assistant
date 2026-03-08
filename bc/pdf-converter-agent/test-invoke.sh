#!/bin/bash

# Test PDF Converter Agent with agentcore invoke

echo "=========================================="
echo "Testing PDF Converter Agent"
echo "=========================================="
echo ""

# Simple HTML test content
HTML_CONTENT='<html><head><title>Test Proposal</title><style>body { font-family: Arial, sans-serif; margin: 40px; } h1 { color: #2c3e50; } p { line-height: 1.6; }</style></head><body><h1>Test Grant Proposal</h1><p>This is a test proposal to verify PDF conversion is working correctly.</p><p><strong>Grant Title:</strong> AI Research Initiative</p><p><strong>Amount:</strong> $500,000</p><p><strong>Duration:</strong> 24 months</p></body></html>'

# Create test payload
TEST_PAYLOAD=$(cat <<EOF
{
  "html": "$HTML_CONTENT",
  "proposalId": "test-$(date +%s)",
  "userId": "test-user"
}
EOF
)

echo "Test Payload:"
echo "$TEST_PAYLOAD"
echo ""
echo "Invoking agent..."
echo ""

# Invoke the agent
cd "$(dirname "$0")"
agentcore invoke "$TEST_PAYLOAD"

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
