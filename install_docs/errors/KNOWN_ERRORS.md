<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../README.md)

# Known Errors & Fixes

---

## CloudShell Session Times Out During Deployment

**What happens:** CloudShell has a 20-minute inactivity timeout based on keyboard input — output printing to the terminal does not reset it. Since the deployment takes ~60 minutes and the script spends most of that time in a polling loop, CloudShell will kill the session before the script finishes.

**The deployment is not affected.** All the real work runs inside CodeBuild, not CloudShell. CloudShell dying does not stop or interrupt the deployment.

**How to prevent it:** Per [AWS CloudShell documentation](https://docs.aws.amazon.com/cloudshell/latest/userguide/limits.html), the session stays alive only with keyboard or pointer (mouse/trackpad) interaction — running processes do not count. Stay in the CloudShell browser tab running the deployment and press Enter or click inside the terminal area every 5-10 minutes. Either works. Automated tools like `watch -n 60 df -h` or `top` do not prevent timeout.

**How to know when the deployment is fully done:** Watch for both CodeBuild projects to complete successfully in the AWS Console:
1. Go to AWS Console → CodeBuild → Build projects
2. Look for two projects:
   - `grow2-arm64-deployer-<region>` — the main stack deployment (runs `npx ampx sandbox --once`)
   - `<stack-name>-PostDeploymentSeeder` — seeds data, builds and deploys the React app
3. When both show **Succeeded**, the deployment is complete and the app is ready

---

## Delete Script Pauses at `(END)` — AWS CLI Pager

**What happens:** Mid-way through the delete script, the terminal prints a JSON blob and then shows `(END)` and stops responding. The script appears frozen.

**Cause:** The AWS CLI is opening `less` (a pager) to display long output. It's waiting for you to scroll or quit before continuing.

**Immediate fix:** Press `q` to exit the pager. The script will resume from where it left off.

**Permanent fix:** Set this before running the delete script:
```bash
export AWS_PAGER=""
```

This tells the AWS CLI to never use a pager and stream output directly to the terminal. You can also add it to your shell profile to make it permanent:
```bash
echo 'export AWS_PAGER=""' >> ~/.bashrc && source ~/.bashrc
```

---

## AgentCore Stack Fails to Delete — CFN Internal Handler Error

**Error:**
```
Resource handler returned message: "Internal error occurred in the handler."
(RequestToken: ..., HandlerErrorCode: HandlerInternalFailure)
```
Seen on the AgentCore CloudFormation stack during deletion.

**Cause:** The CloudFormation resource provider for AgentCore runtimes throws an internal error when it tries to delete a runtime that is in a certain state. This is a transient service-side issue, not a code bug.

**Fix:**
1. Go to AWS Console → Amazon Bedrock → AgentCore → Runtimes
2. Manually delete all GROW2 runtimes listed there
3. Go to CloudFormation → find the AgentCore stack in `DELETE_FAILED` state
4. Use **Force delete** to remove it
5. If the root stack is still in `CREATE_COMPLETE` (not deleting), trigger it manually from CloudShell:
   ```bash
   export AWS_PAGER=""
   aws cloudformation delete-stack \
     --stack-name amplify-grow2-root-sandbox-<your-id> \
     --region us-east-1
   ```
   Replace `<your-id>` with your actual stack name from the CloudFormation console.
6. Re-run the delete script to clean up the rest:
   ```bash
   ./installation/delete-grow2.sh us-east-1
   ```

**Note:** The delete script was updated to pre-delete AgentCore runtimes via direct API before touching the CFN stack, which prevents this from happening on fresh installs going forward.

---

## AgentCore Internal Failure

**Error:**
```
Resource handler returned message: "Internal error occurred in the handler."
(HandlerErrorCode: HandlerInternalFailure)
```

**Cause:** Most commonly Bedrock model access is not enabled in your account, or a transient AgentCore service error.

**Fix:**
1. Go to AWS Console → Bedrock → Model access and confirm the required models are enabled
2. If the stack is stuck in `DELETE_FAILED`, use **Force delete** in CloudFormation
3. Run the delete script to clean up any orphaned resources (ECR repos, DynamoDB tables, AppSync APIs)
4. Re-run the deploy script

---

## Stack Deletion Fails — S3 Bucket Not Empty

**Error:**
```
Resource handler returned message: "The bucket you tried to delete is not empty"
(Service: S3, Status Code: 409, HandlerErrorCode: GeneralServiceException)
```

**Cause:** CloudFormation cannot delete S3 buckets that still contain objects. The access logs bucket (`AccessLogsBucket*`) is a common culprit as it gets populated by S3 server access logging and is not always emptied before stack deletion.

**Fix:** Run the delete script — it empties all GROW2-related S3 buckets (including access logs buckets) before triggering stack deletion:
```bash
./installation/delete-grow2.sh us-east-1
```
If the stack is already stuck in `DELETE_FAILED`, use **Force delete** in CloudFormation, then run the delete script to clean up remaining resources.

---

## Deployment Fails — SCP Blocks Access to Required Region

**Error:**
```
AccessDeniedException: User: arn:aws:sts::123456789012:assumed-role/... is not authorized
to perform: cloudformation:CreateStack in region us-east-2
```
or any permission denied error during `deploy-grow2-bootstrap.sh` that references a specific region.

**Cause:** Your AWS Organization has **Service Control Policies (SCPs)** that deny access to one or more of the four supported deployment regions (`us-east-1`, `us-east-2`, `us-west-2`, `eu-west-1`). GROW2 must be deployed entirely within a single supported region — if that region is blocked by an SCP, the deployment will fail immediately.

**Fix:**
1. Work with your AWS administrator to confirm your account has full access to the region you intend to deploy to
2. Test access before deploying:
   ```bash
   aws cloudformation list-stacks --region us-east-1
   ```
   If this returns an `AccessDeniedException`, the region is blocked by an SCP
3. Try a different supported region that is not restricted in your account
4. If no supported region is accessible, your administrator must update the SCP to allow the required region

**Note:** Even if the deployment region is allowed, Bedrock cross-region inference profiles may still route to adjacent regions (see section below). Both the deployment region and the Bedrock routing pool must be accessible.

---

## Proposal Generation Fails — Bedrock Cross-Region Inference Blocked by SCP

**Error:**
```
AccessDeniedException: User is not authorized to perform: bedrock:InvokeModelWithResponseStream
on resource: arn:aws:bedrock:eu-north-1::foundation-model/anthropic.claude-sonnet-4-5-...
```

**Cause:** GROW2 uses Bedrock cross-region inference profiles (`us.*` for US regions, `eu.*` for EU regions). These profiles automatically route requests to available capacity across multiple regions — for example, a deployment in `eu-west-1` may route to `eu-north-1`, `eu-central-1`, or other EU regions. If your AWS account has **Service Control Policies (SCPs)** that restrict access to certain regions, Bedrock's cross-region routing may attempt to call a blocked region and fail with AccessDeniedException.

**Fix options:**
1. Work with your AWS administrator to allow Bedrock access in all regions within the routing pool:
   - US pool: `us-east-1`, `us-east-2`, `us-west-2`
   - EU pool: `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-central-1`, `eu-north-1`
2. If SCPs cannot be changed, consider deploying only to `us-east-1` or `us-east-2` where cross-region routing is less likely to hit restricted regions.

---

## AgentCore Runtime Already Exists

**Error:**
```
Resource handler returned message: "Resource of type 'AWS::BedrockAgentCore::Runtime' 
with identifier 'pdf_converter_agent' already exists."
(HandlerErrorCode: AlreadyExists)
```

**Cause:** A previous failed deployment left AgentCore Runtime resources behind. CloudFormation can't create them again because they already exist in the account.

**Fix:**
1. Go to AWS Console → Amazon Bedrock → AgentCore → Runtimes
2. Delete all GROW2 runtimes (`pdf_converter_agent`, `grants_search_agent_v2`, `eu_grants_search_agent_v2`, `proposal_generation_agent`, `proposal_evaluator_agent`)
3. Redeploy

The delete script now handles this automatically — run it before redeploying to ensure all runtimes are cleaned up.

---

## Proposal Generation Fails — Bedrock internalServerException (Transient)

**Error:**
```
An error occurred (internalServerException) when calling the InvokeModelWithResponseStream 
operation: The system encountered an unexpected error during processing. Try your request again.
```

**Where it appears:** CloudWatch log group `/aws/bedrock-agentcore/runtimes/proposal_generation_agent-<id>-DEFAULT` in us-east-1. The error surfaces mid-generation, typically while generating a specific section (e.g. "Implementation"), and the proposal is marked `FAILED` in DynamoDB.

**Cause:** This is a transient, service-side error from Bedrock — not a code bug. Common underlying causes include:

- Bedrock capacity pressure: the model is under high load and the request is dropped internally before a response can be streamed
- Cross-region inference routing hiccup: the `us.*` inference profile routed to a region that was momentarily degraded
- Stream interruption: the response stream opened successfully but Bedrock threw an internal error mid-stream (visible in the traceback at `eventstream.py` → `_parse_event`)
- Rare: the request payload was too large for the model's context window at that moment (less likely with Claude Sonnet at 32k max_tokens)

**Fix:** The agent now retries automatically up to 3 times with exponential backoff (5s, 10s, 20s) on this error class. In CloudWatch you will see:
```
⏳ Retry 1/2 for 'Implementation' after 5s...
```
If all 3 retries fail, the proposal will still be marked `FAILED`. In that case:

1. Simply retry the proposal from the UI — the error is transient and usually resolves within seconds to minutes
2. Check the [AWS Service Health Dashboard](https://health.aws.amazon.com/health/status) for any active Bedrock incidents in `us-east-1`
3. If failures are sustained (more than 15-20 minutes), check Bedrock model access is still enabled: AWS Console → Bedrock → Model access

**Note:** This error can also appear for other agents (`proposal_evaluator_agent`, `grants_search_agent_v2`, etc.) — the same retry logic applies. If you see it consistently across all agents, it is more likely a regional Bedrock degradation than an isolated issue.

---
