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

## AgentCore Stack Fails to Delete — `NotStabilized` Timeout

**Error:**
```
DELETE_FAILED
Resource handler returned message: "Request timed out while deleting
AWS::BedrockAgentCore::Runtime" (RequestToken: ..., HandlerErrorCode: NotStabilized)
```
Seen on the AgentCore CloudFormation stack during deletion. Usually only 1-3 of the 5 runtimes hit this — CloudFormation stops processing the rest once the first one fails, so you may see a mix of runtimes still `READY` or stuck `Deleting` in the AgentCore console.

**Cause:** Deleting a `AWS::BedrockAgentCore::Runtime` resource can occasionally take longer than CloudFormation's internal timeout for the operation to report back as stabilized. This is a rare, timing-dependent issue on the AWS service side, not a code bug or something the delete script reliably triggers — the script has run successfully dozens of times without hitting it, and reproducing it live during testing required deploying/deleting repeatedly. `delete-grow2.sh` pre-deletes all runtimes via direct API before the CFN stack deletion runs, which gives CloudFormation a head start and should make this less likely, but it cannot fully prevent it since the timeout lives in the AgentCore/CloudFormation service integration, not in the script.

**Fix — manual console cleanup:**
1. Go to AWS Console → Amazon Bedrock → AgentCore → Runtime resources
2. For any runtime still showing `READY` (not already `Deleting`), select it and delete it manually
3. Wait for it to disappear from the list (usually 1-2 minutes)
4. Go to CloudFormation → find the AgentCore stack in `DELETE_FAILED` state
5. Select it and choose **Delete** → **Force delete** — this should now succeed since the runtimes are gone
6. Re-run the delete script to finish cleaning up the remaining stacks and resources:
   ```bash
   ./installation/delete-grow2.sh <region>
   ```

This is not elegant, but it's a reliable manual escape hatch if the delete script's built-in retry/poll logic doesn't clear the runtimes in time.

---

## AgentCore Stack Fails to Delete — `AccessDenied` on Already-Deleted Runtimes

**Error:**
```
DELETE_FAILED
The following resource(s) failed to delete: [ProposalGenerationRuntime...,
EuGrantsSearchV2Runtime..., UsGrantsSearchV2Runtime...].

Resource handler returned message: "Access denied for operation
'AWS::BedrockAgentCore::Runtime'." (HandlerErrorCode: AccessDenied)
```
Usually 1-3 of the 5 runtimes, not all of them.

**Cause — not a permissions problem, despite the message.** `delete-grow2.sh` Phase 0
deliberately deletes the AgentCore runtimes directly via `bedrock-agentcore-control`
before the CloudFormation teardown, because without that head start CFN's own deletion
can hit `NotStabilized` and strand runtimes *alive* outside its control (see the section
above). Two actors deleting the same resources is inherently racy, and this failure is
one outcome of that race.

**The precise trigger is not established.** What two observed teardowns in us-east-2 show:

| Phase 0 poll loop | CloudFormation outcome |
|-------------------|------------------------|
| Ran the full 3 min, runtime list never emptied | 3 of 5 runtimes `AccessDenied` → `DELETE_FAILED` |
| Exited early, runtime list emptied | All 5 deleted cleanly, no failure |

So the failure correlates with runtimes still being in `Deleting` state when
CloudFormation reaches them, rather than with them being fully absent. Phase 0's poll
loop is therefore the primary mitigation.

**Mechanism**, established by deliberately forcing the race (Phase 0 poll cut to one
iteration so CloudFormation reached the runtimes ~10s after the delete calls):

| Caller | Runtime state | Result |
|--------|---------------|--------|
| CloudFormation handler | still `Deleting` | **`AccessDenied`** |
| CloudFormation handler | fully absent | treated as already-deleted → success |
| Raw CLI `delete-agent-runtime` | fully absent | `AccessDenied` |

The CloudFormation handler and the raw API disagree about a missing runtime. **This makes
manually retrying a delete a misleading diagnostic** — it can report `AccessDenied` for a
runtime CloudFormation would have removed cleanly.

It also explains why the same 3 of 5 runtimes fail every time.
`ProposalGenerationRuntime` depends on the PDF converter and evaluator ARNs, so
CloudFormation deletes it in the *first* wave together with the two independent search
runtimes. Those three meet the runtimes mid-delete. `PdfConverter` and
`ProposalEvaluator` are deleted in a later wave, once the runtimes are fully gone, and
always succeed.

**Do not chase this as an IAM or SCP issue.** Two signals distinguish it from a
real denial, both worth checking before going down that road:
- `ListAgentRuntimes` still works while `DeleteAgentRuntime` is denied. A genuine
  SCP on this service would block both.
- The message has no `on resource: <arn>` clause and no explanation such as
  "with an explicit deny in a service control policy". Real IAM/SCP denials
  include one or both.

Running `aws bedrock-agentcore-control delete-agent-runtime --agent-runtime-id <id>`
by hand can return the same `AccessDenied` even as an Organization admin, for a runtime
that no longer exists. Do not read that as proof of a permissions gap — verify with
`list-agent-runtimes` and the console first.

**Fix — verify, then retain.** `delete-grow2.sh` now does this automatically; these
are the manual steps if you hit it on an older revision or the script cannot proceed.

1. Confirm the runtimes are genuinely gone. Use `--output json`, because
   `--output table` prints nothing both for an empty list *and* for a failed call:
   ```bash
   aws bedrock-agentcore-control list-agent-runtimes --region <region> --output json
   ```
   You want `{"agentRuntimes": []}` with exit code 0. Cross-check in the console
   (Bedrock → AgentCore → Runtime resources) — it should read `(0)` / "No agents found".

2. **Only if step 1 confirms they are gone**, retry the stack delete retaining the
   failed resources. In the console, the "Retry deleting this stack?" dialog lists
   them: tick every box and choose **"Delete this stack but retain resources"**.
   Or from the CLI:
   ```bash
   aws cloudformation delete-stack --stack-name <agentcore-stack> --region <region> \
     --retain-resources <LogicalId1> <LogicalId2> <LogicalId3>
   ```

3. Re-run the delete script to finish the remaining stacks and orphaned resources:
   ```bash
   export AWS_PAGER=""
   ./installation/delete-grow2.sh <region>
   ```

> ⚠️ **Do not retain a runtime that still exists.** Retaining tells CloudFormation
> to forget the resource, so a live runtime survives with no stack record pointing
> at it — billable and much harder to find later. Verify step 1 first. Prefer
> `--retain-resources` over `--deletion-mode FORCE_DELETE_STACK`: it names the exact
> stale records rather than letting CloudFormation abandon anything it struggles with.

**Why this is still the better failure:** `NotStabilized` left live runtimes orphaned
outside CloudFormation's control. In the observed cases of *this* failure the runtimes
were genuinely deleted and only CloudFormation's bookkeeping was stale, which
`--retain-resources` clears cleanly — but verify that per step 1 rather than assuming
it, since the trigger is not fully understood.

> ℹ️ The automatic recovery in `delete-grow2.sh` is **untested against a live failure** —
> the race did not reproduce on the teardown where the fix was present. To exercise it
> deliberately, shorten the Phase 0 poll loop to 1-2 iterations so CloudFormation
> reaches the runtimes while they are still `Deleting`.

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

## Proposal Generation Fails — Marketplace Model Agreement Missing

**Error:**
```
An error occurred (AccessDeniedException) when calling the InvokeModelWithResponseStream
operation: Model access is denied due to IAM user or service role is not authorized to
perform the required AWS Marketplace actions (aws-marketplace:ViewSubscriptions,
aws-marketplace:Subscribe) to enable access to this model.
```

**Where it appears:** CloudWatch log group `/aws/bedrock-agentcore/runtimes/proposal_generation_agent-<id>-DEFAULT`. The proposal is marked `FAILED` in DynamoDB and the error text is surfaced in the UI. Deployment itself succeeds — this only shows up on the first proposal.

**Cause:** Claude Opus 4.6 is distributed through AWS Marketplace and needs a one-time model access agreement per account. `PROPOSAL_MODEL_TIER` in `amplify/backend.ts` defaults to `opus`, so a fresh account hits this on its first proposal. The message names IAM actions, which is misleading — the usual cause is the missing account-level agreement, not the agent's execution role.

**Diagnose:** Check all four access gates.

```bash
aws bedrock get-foundation-model-availability \
  --model-id anthropic.claude-opus-4-6-v1 --region <your-region>
```

| Field | Meaning if not available |
|-------|------------------------|
| `agreementAvailability` | Marketplace agreement missing — fix below |
| `authorizationStatus` | Account not authorized for Bedrock (new accounts may still be verifying) |
| `entitlementAvailability` | Account-level entitlement issue — needs AWS Support |
| `regionAvailability` | Model not offered in this region — deploy elsewhere |

**Fix (agreement missing):** See [Step 1b in the README](../../README.md#step-1b-enable-claude-model-access). In short:

```bash
OFFER=$(aws bedrock list-foundation-model-agreement-offers \
  --model-id anthropic.claude-opus-4-6-v1 --query 'offers[0].offerToken' --output text)

aws bedrock create-foundation-model-agreement \
  --model-id anthropic.claude-opus-4-6-v1 --offer-token "$OFFER"
```

Status goes `NOT_AVAILABLE` → `PENDING` → `AVAILABLE` over a few minutes. No redeploy is needed — this is an account-level change, not a stack change. Retry the proposal once it reads `AVAILABLE`.

**Both Claude models are Marketplace-gated — not just Opus.** Confirmed in a fresh
account (both reported `agreementAvailability: NOT_AVAILABLE`):

| Model | Used by |
|-------|---------|
| `anthropic.claude-opus-4-6-v1` | Proposal generation agent |
| `anthropic.claude-sonnet-4-5-20250929-v1:0` | Proposal evaluator, chat handler, `testPrompt` |
| `amazon.titan-embed-text-v2:0` | Knowledge Base — Amazon first-party, **not** gated |

Switching `PROPOSAL_MODEL_TIER` from `'opus'` to `'sonnet'` therefore does **not** avoid
this problem; it just moves it to a different model. Run the agreement commands for
both models (README Step 1b).

Watch for the Sonnet 4.5 failures being quieter than the Opus one:
- **Proposal evaluator** — `_evaluate_section_adherence` catches the exception per
  section and returns a flat `0.70`, so you get a plausible-looking C+ Quality grade
  with no error surfaced. A Guideline Adherence score of exactly 0.70/C+ is the
  fallback signature.
- **Chat assistant / `testPrompt`** — these surface the error to the UI directly.

**If the agreement is `AVAILABLE` and it still fails:** This is expected on any deployment predating the IAM fix below. Bedrock validates the subscription against the *calling* principal on every invoke, and that principal is the AgentCore execution role — not the Cognito user who clicked generate (identity does not propagate past AppSync) and not the admin who created the agreement. So the account agreement is necessary but not sufficient.

`createProposalGenerationRole` in `amplify/custom/agentcore-stack.ts` now grants:

```ts
role.addToPolicy(new iam.PolicyStatement({
    actions: ['aws-marketplace:ViewSubscriptions', 'aws-marketplace:Subscribe'],
    resources: ['*'],  // AWS limitation: no resource-level support for these actions
}));
```

with `'AWS Marketplace subscription actions (no resource-level permissions)'` added to the `suppressAgentRoleWildcards(proposalGenRole, 'ProposalGeneration', [...])` list so cdk-nag IAM5 still passes.

**This requires a redeploy** — IAM policy changes only reach the running agent through CloudFormation. Re-run the deploy script; the AgentCore runtime itself does not need to be recreated.

`ViewSubscriptions` lets Bedrock confirm an existing agreement. `Subscribe` lets it complete one on first use, so a fresh account no longer strictly needs the manual CLI steps — though running them up front (README Step 1b) avoids burning a failed first proposal while the subscription settles.

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

## Manually Deleting Stacks from the Console

`delete-grow2.sh` handles the vast majority of cleanup scenarios automatically, but CloudFormation stack deletion has enough failure modes (service-side timeouts, a stack left in a rollback state from an interrupted deploy, cross-stack export dependencies, etc.) that no script can guarantee a clean automatic path every time. If the script exits with stacks still listed under "Some stacks may still exist," or you just want to see and control exactly what's happening, the console walkthrough below always works as a fallback.

**1. Identify what's actually left**

Go to AWS Console → CloudFormation → Stacks, and switch the status filter to show all statuses (not just active ones — you need to see `DELETE_FAILED`, `UPDATE_ROLLBACK_COMPLETE`, etc. too). Look for anything starting with `amplify-grow2-` or containing `AgentCore` / `BedrockPrompts`.

**2. Delete in dependency order**

Cross-stack references mean deleting in the wrong order will fail. Delete in this order:
1. Any stack with `AgentCore` in the name (imports from the data stack)
2. Any stack with `-data` in the name (imports BedrockPrompts exports)
3. The root stack (`amplify-grow2-root-sandbox-<id>`, no other suffix)
4. The `BedrockPrompts` stack (everything else depends on it, delete last)

For each: select the stack → **Delete**. If a stack is in `DELETE_FAILED`, use **Delete** → **Force delete** instead (this skips resources CloudFormation couldn't clean up and just removes the stack record — see step 3 below for cleaning those up separately).

**3. Check for orphaned resources Force Delete left behind**

Force Delete removes the *stack*, not necessarily every resource in it. After using it, check for and manually delete:
- **AgentCore Runtimes**: Console → Amazon Bedrock → AgentCore → Runtime resources — delete any still listed
- **OpenSearch Serverless collections**: Console → Amazon OpenSearch Service → Serverless → Collections
- **S3 buckets**: Console → S3 — any bucket starting with `amplify-grow2-` or `kb-docs-`; buckets must be emptied before they can be deleted (Console → select bucket → Empty, then Delete)
- **DynamoDB tables**: Console → DynamoDB → Tables — anything referencing GROW2 model names (`Proposal`, `DocumentMetadata`, `GrantRecord`, etc.)

**4. Re-run the script to catch anything else**

Once the console-visible stacks are gone, run the delete script again — Phase 2 will still clean up SSM parameters, CloudWatch log groups, ECR repos, and CodeBuild projects that don't show up in the CloudFormation console at all:
```bash
./installation/delete-grow2.sh <region>
```

---
