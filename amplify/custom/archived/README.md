# Archived Stacks

This directory contains CDK stacks that were created outside of the main Amplify deployment but are kept for reference.

## Files

### opensearch-stack-standalone.ts
- **Status**: Archived - Not in use
- **Purpose**: Standalone OpenSearch + Knowledge Base stack with automated index creation via Lambda Layer
- **Why Archived**: This was an alternative implementation that used a published Lambda Layer (ARN: arn:aws:lambda:us-east-1:483272795794:layer:opensearch-dependencies:2). The functionality has been integrated into `opensearch-collection-stack.ts` which is part of the main Amplify deployment.
- **Can be deleted**: Yes, once confirmed the integrated version works

## Cleanup

These files can be safely deleted once:
1. The integrated Amplify deployment is working correctly
2. All functionality has been verified
3. No reference to these files exists in the codebase
