<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# Updating the GROW2 Stack

How to deploy code changes to an existing GROW2 installation.

---

## Overview

Updates use the same fire-and-forget flow as the initial install. You run the bootstrap script from CloudShell, it exits in ~5 minutes, and CodeBuild handles the rest.

**What's preserved during updates:**
- User accounts and profiles (Cognito)
- Grant records (DynamoDB)
- Uploaded documents (S3)
- Proposals (DynamoDB + S3)
- Agent configurations (DynamoDB)
- Application URL (Amplify Hosting)

---

## How Updates Work

When you run the deploy script against an existing stack:

1. The source zip is re-uploaded to S3 with your latest changes
2. The `grow2-arm64-deployer-{region}` CodeBuild project is updated and a new build starts
3. Inside CodeBuild, `npx ampx sandbox --once` runs a CDK diff — only changed resources are updated
4. If agent code changed (e.g. `bc/proposal-generation-agent/agent.py`), CDK rebuilds and pushes only that Docker image
5. If the React UI changed (`react-aws/`), the new source is uploaded to S3 and the seeder rebuilds and redeploys to Amplify Hosting
6. The seeder (`grow2-seeder-{account}-{region}`) checks its last build status — if it previously **Succeeded**, it skips re-seeding (idempotency). This is intentional: you don't want to overwrite real user data on every update.

---

## Running an Update

Open CloudShell in the same region as your deployment:

```bash
sudo -s
cd /home/install/sample-grants-genai-assistant
git pull
./installation/deploy-grow2-bootstrap.sh us-east-1
```

Replace `us-east-1` with your region. CloudShell exits in ~5 minutes with a CodeBuild link. You can close it.

**Expected times:**
- Backend-only changes (Lambda, CDK): ~15-25 min in CodeBuild
- Agent code changes (Docker rebuild): ~35-55 min in CodeBuild
- UI-only changes: ~15-20 min in CodeBuild + seeder

> If you don't have the repo in `/home/install/` anymore (CloudShell doesn't persist between sessions), re-clone first:
> ```bash
> sudo -s
> mkdir -p /home/install && cd /home/install
> git clone https://github.com/aws-samples/sample-grants-genai-assistant.git
> cd sample-grants-genai-assistant
> git pull
> ./installation/deploy-grow2-bootstrap.sh us-east-1
> ```

---

## Verify the Update

Go to [CodeBuild → Build projects](https://console.aws.amazon.com/codesuite/codebuild/projects) and confirm both show **Succeeded**:

| Project | What it does |
|---------|-------------|
| `grow2-arm64-deployer-{region}` | Deploys CDK stack changes |
| `grow2-seeder-{account}-{region}` | Rebuilds and redeploys React app (if UI changed) |

If either shows **Failed**, check its build logs. See [Known Errors](../errors/KNOWN_ERRORS.md) for common issues.

---

## When the Seeder Needs to Re-Run

The seeder is skipped on updates if its last build already **Succeeded**. This is correct for most updates — you don't want to re-seed data on top of real user data.

However, there are cases where you need the seeder to run again:

- You added new Bedrock prompts and want them imported
- You changed the React UI and need it rebuilt and redeployed to Amplify Hosting
- You changed seed data (test user profile, agent config, etc.)

**To manually trigger the seeder:**

1. Go to AWS Console → **CodeBuild** → **Build projects**
2. Find `grow2-seeder-{account}-{region}` (e.g. `grow2-seeder-483272795794-us-east-1`)
3. Click **Start build**
4. Wait for **Succeeded** (~8-10 min)

Or via CLI from CloudShell:

```bash
REGION=us-east-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
aws codebuild start-build \
  --project-name "grow2-seeder-${ACCOUNT}-${REGION}" \
  --region $REGION
```

> Note: Bedrock prompts are deployed by CDK (`BedrockPromptsStack`) — they update automatically when you run the deploy script. You only need to manually trigger the seeder if you need the React app rebuilt.

---

## What Each Change Type Requires

| Change type | Run deploy script? | Manually trigger seeder? |
|-------------|-------------------|--------------------------|
| Lambda function code | ✅ Yes | No |
| CDK infrastructure (IAM, DynamoDB, etc.) | ✅ Yes | No |
| AgentCore agent code (`bc/`) | ✅ Yes (Docker rebuild) | No |
| Bedrock prompts (`config/bedrock-prompts/`) | ✅ Yes | No |
| React UI (`react-aws/`) | ✅ Yes | ✅ Yes (seeder rebuilds UI) |
| GraphQL schema (`amplify/data/`) | ✅ Yes | No |

---

## Rollback

To roll back to a previous version:

```bash
sudo -s
cd /home/install/sample-grants-genai-assistant
git log --oneline        # find the commit you want
git checkout <commit>    # check out that version
./installation/deploy-grow2-bootstrap.sh us-east-1
git checkout main        # return to main when done
```

---

**Last Updated:** March 2026
