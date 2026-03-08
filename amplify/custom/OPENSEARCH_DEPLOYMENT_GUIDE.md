# OpenSearch Serverless Deployment Guide

## Overview

This guide walks you through deploying the OpenSearch Serverless collection for the Knowledge Base. Due to OpenSearch Serverless security requirements, this is a **two-phase deployment** with a manual step in between.

## Why Manual Steps Are Required

OpenSearch Serverless requires that principals (users/roles) be added to the data access policy **before** they can create indices. Since:
- The collection is created in Phase 1
- The index must exist before deploying the Knowledge Base (Phase 2)
- Your AWS credentials need to be added to the policy to create the index

This creates a chicken-and-egg problem that requires a manual step.

## Prerequisites

- AWS CLI configured with administrator access
- Python 3.8+ with boto3 and requests-aws4auth installed
- Amplify Gen 2 CLI (`npm install -g @aws-amplify/cli`)

## Deployment Steps

### Phase 1: Deploy OpenSearch Collection

1. **Deploy the collection stack:**
   ```bash
   npx ampx sandbox
   ```

2. **Wait for deployment to complete** (5-10 minutes)
   - The OpenSearch collection will be created
   - All three security policies will be configured (encryption, network, data access)
   - The collection will be in ACTIVE status

### Phase 2: Add Your Credentials to Data Access Policy

3. **Get your AWS identity:**
   ```bash
   aws sts get-caller-identity
   ```
   
   Copy the ARN from the output. It will look like one of these:
   - IAM User: `arn:aws:iam::123456789012:user/your-username`
   - SSO Role: `arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_*/your-email@domain.com`

4. **Add your identity to the OpenSearch data access policy:**
   ```bash
   python3 python/add_sso_to_opensearch_policy.py
   ```
   
   This script will:
   - Detect your current AWS identity
   - Find the OpenSearch data access policy
   - Add your identity to the policy's Principal list
   - Update the policy

5. **Wait for policy propagation** (2-5 minutes)
   
   OpenSearch Serverless policies take time to propagate. You can verify access with:
   ```bash
   python3 python/test_opensearch_access.py
   ```
   
   Wait until you see: `✓ ACCESS GRANTED!`

### Phase 3: Create the Vector Index

6. **Create the vector index manually:**
   ```bash
   python3 python/create_index_manually.py
   ```
   
   This creates the index with the exact schema Bedrock Knowledge Base expects:
   - 1536-dimensional vectors (for Titan Embeddings)
   - HNSW algorithm with FAISS engine
   - Proper field mappings for Bedrock

7. **Verify the index was created:**
   ```bash
   python3 python/check_opensearch_indexes.py
   ```
   
   You should see: `bedrock-knowledge-base-default-index`

### Phase 4: Deploy Knowledge Base (Future)

8. **Uncomment the Knowledge Base resources** in `amplify/custom/knowledge-base-stack.ts`

9. **Deploy again:**
   ```bash
   npx ampx sandbox
   ```

The Knowledge Base will now deploy successfully because:
- The collection exists
- The index exists
- All permissions are configured

## Troubleshooting

### 403 Forbidden When Creating Index

**Symptom:** `python/create_index_manually.py` returns 403 Forbidden

**Cause:** Your identity isn't in the data access policy yet, or the policy hasn't propagated

**Solution:**
1. Verify your identity was added: `python3 python/add_sso_to_opensearch_policy.py`
2. Wait 5 more minutes for propagation
3. Test access: `python3 python/test_opensearch_access.py`
4. Try creating the index again

### Collection Not Found

**Symptom:** Scripts can't find `kb-collection`

**Cause:** Phase 1 deployment hasn't completed or failed

**Solution:**
1. Check CloudFormation stack status in AWS Console
2. Look for stack: `amplify-*-sandbox-*`
3. Check for any failed resources
4. Redeploy if needed: `npx ampx sandbox`

### Index Already Exists

**Symptom:** `resource_already_exists_exception` when creating index

**Cause:** Index was already created (this is fine!)

**Solution:** No action needed. Proceed to Phase 4.

## For New AWS Accounts

When deploying to a new AWS account, the deployer must:

1. Have AWS administrator access (or equivalent OpenSearch permissions)
2. Run through all phases above
3. Their AWS identity will be added to the policy
4. They can then create the index

**Important:** Each AWS account requires this one-time setup. The index only needs to be created once per account.

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `python/add_sso_to_opensearch_policy.py` | Adds your AWS identity to data access policy |
| `python/test_opensearch_access.py` | Tests if you can access OpenSearch |
| `python/create_index_manually.py` | Creates the vector index |
| `python/check_opensearch_indexes.py` | Lists all indices in the collection |

## Architecture Notes

### Why Not Use a Custom Resource Lambda?

We tried! The problem is:
- Lambda role is created during deployment
- Data access policy needs the Lambda role ARN
- But the policy is created before the Lambda exists
- Circular dependency

### Why Not Use Account Root?

The data access policy includes `arn:aws:iam::ACCOUNT:root`, which theoretically grants access to all principals in the account. However:
- OpenSearch Serverless has additional internal permissions
- The `root` principal doesn't automatically grant index creation rights
- Explicit principal ARNs are required for write operations

This is a known OpenSearch Serverless behavior, not a bug in our configuration.

## Next Steps

After completing this deployment:
- The OpenSearch collection is ready
- The vector index exists
- You can proceed with Knowledge Base deployment
- Or use the collection for other vector search needs

## Support

If you encounter issues not covered here:
1. Check CloudWatch Logs for the collection
2. Verify all three security policies exist (encryption, network, data access)
3. Confirm collection status is ACTIVE
4. Review AWS OpenSearch Serverless documentation
