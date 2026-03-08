# CloudShell Fire-and-Forget Deployment

## Problem with Current Approach

CloudShell sessions have a **20-minute idle timeout** and a hard session limit.
The current `deploy-grow2-bootstrap.sh` script runs `npx ampx sandbox --once`
directly in CloudShell, which takes 35-55 minutes. Users who lose their session
mid-deploy end up with a partially deployed stack and no easy recovery path.

Additionally, the seeder CodeBuild project is triggered after the deploy completes,
adding another 8-10 minutes of CloudShell occupancy.

---

## Proposed Architecture: CloudShell < 5 Minutes

The goal is to get the user out of CloudShell in under 5 minutes. Everything
else runs in the cloud and the user checks the AWS console for completion.

### What CloudShell Does (< 5 min)

1. Validate prerequisites (AWS CLI, credentials, region)
2. CDK bootstrap check — run `cdk bootstrap` if needed (~2 min, only first time)
3. Create/verify the CodeBuild IAM role (`grow2-codebuild-deployer-role`)
4. Zip the repo and upload to the CDK bootstrap S3 bucket
5. Create/update the CodeBuild ARM64 project (`grow2-arm64-deployer-<region>`)
6. Start the build
7. Print the CodeBuild console URL
8. **Exit** — CloudShell session ends, user is done

### What CodeBuild Does (35-55 min, fully in cloud)

Single CodeBuild job with three phases:

```
install:
  - Install Node.js 20

pre_build:
  - npm ci

build:
  - npx ampx sandbox --once --outputs-out-dir /tmp

post_build:
  - Upload /tmp/amplify_outputs.json to S3
  - Upload react-aws source to S3
  - Upload bedrock-prompts to S3
  - Upload import scripts to S3
  - Trigger the seeder CodeBuild project (start-build, don't wait)
  - Print completion summary
```

Key point: `post_build` only runs if `build` succeeded
(`CODEBUILD_BUILD_SUCCEEDING=1`), so the seeder is never triggered on a
failed deploy. This is the timing guarantee — no race condition.

### What the Seeder CodeBuild Does (8-10 min, triggered by above)

Same as today — creates test user, profile, agent config, runs agent discovery.
Already has idempotency check (skips if already SUCCEEDED).

---

## Script Changes Required

### `deploy-grow2-bootstrap.sh`

Remove everything after "Starting ARM64 deployment via CodeBuild..." that
currently waits for the build to complete. Replace with:

```bash
# Start build
BUILD_ID=$(aws codebuild start-build \
  --project-name "$CB_PROJECT" \
  --region "$DEPLOY_REGION" \
  --query 'build.id' --output text)

echo ""
echo "✅ Deployment started in CodeBuild — you can close CloudShell now."
echo ""
echo "Monitor progress:"
echo "  https://${DEPLOY_REGION}.console.aws.amazon.com/codesuite/codebuild/projects/${CB_PROJECT}/build/${BUILD_ID}/log"
echo ""
echo "Expected time: 35-55 minutes for full deployment + 8-10 min seeding"
echo ""
echo "When complete, the Amplify app URL will appear in CloudFormation outputs:"
echo "  https://${DEPLOY_REGION}.console.aws.amazon.com/cloudformation"
echo ""
exit 0
```

Remove the `amplify_outputs.json` download step from `deploy-grow2-bootstrap.sh`
entirely — it's no longer needed since the user isn't waiting.

### `deploy-via-codebuild.sh` buildspec `post_build`

Add seeder trigger at the end of `post_build`:

```yaml
post_build:
  commands:
    - echo "Build status $CODEBUILD_BUILD_SUCCEEDING"
    - test "$CODEBUILD_BUILD_SUCCEEDING" = "1" || (echo "ERROR Build failed" && exit 1)
    - test -f /tmp/amplify_outputs.json || (echo "ERROR outputs not found" && exit 1)
    - aws s3 cp /tmp/amplify_outputs.json s3://BUCKET/codebuild-deploy/amplify_outputs.json
    - aws s3 sync /tmp/react-aws-source/ s3://BUCKET/react-aws-source/ --delete
    - aws s3 sync /tmp/bedrock-prompts/ s3://BUCKET/bedrock-prompts/
    - aws s3 cp /tmp/import_bedrock_prompts.py s3://BUCKET/scripts/
    - echo "Triggering seeder..."
    - |
      SEEDER_PROJECT=$(aws codebuild list-projects --region $AWS_REGION \
        --query 'projects[?contains(@, `grow2-seeder`) || contains(@, `PostDeployment`)]' \
        --output text | head -n1)
      if [ -n "$SEEDER_PROJECT" ]; then
        LATEST=$(aws codebuild list-builds-for-project --project-name "$SEEDER_PROJECT" \
          --sort-order DESCENDING --query 'ids[0]' --output text 2>/dev/null || echo "")
        LATEST_STATUS=""
        if [ -n "$LATEST" ] && [ "$LATEST" != "None" ]; then
          LATEST_STATUS=$(aws codebuild batch-get-builds --ids "$LATEST" \
            --query 'builds[0].buildStatus' --output text 2>/dev/null || echo "")
        fi
        if [ "$LATEST_STATUS" = "SUCCEEDED" ]; then
          echo "Seeder already succeeded — skipping"
        elif [ "$LATEST_STATUS" = "IN_PROGRESS" ]; then
          echo "Seeder already running — skipping"
        else
          aws codebuild start-build --project-name "$SEEDER_PROJECT" --region $AWS_REGION
          echo "Seeder triggered"
        fi
      else
        echo "WARNING: Seeder project not found — trigger manually"
      fi
    - echo "SUCCESS deployment complete"
```

Note: The seeder project name discovery needs to match whatever CDK names it.
Check `amplify/custom/post-deployment-seeder.ts` for the actual project name
pattern and hardcode or use a CloudFormation output instead of the list approach.

---

## What the User Sees

```
$ ./installation/deploy-grow2-bootstrap.sh us-east-1

Checking prerequisites... ✅
CDK bootstrap: ✅ exists
Creating CodeBuild role... ✅
Packaging repo (zip)... ✅  (42 MB)
Uploading to S3... ✅
Creating CodeBuild project... ✅
Starting build...

✅ Deployment started in CodeBuild — you can close CloudShell now.

Monitor progress:
  https://us-east-1.console.aws.amazon.com/codesuite/codebuild/projects/grow2-arm64-deployer-us-east-1/build/grow2-arm64-deployer-us-east-1:abc123/log

Expected time: 35-55 minutes for full deployment + 8-10 min seeding

When complete, the Amplify app URL will appear in CloudFormation outputs:
  https://us-east-1.console.aws.amazon.com/cloudformation
```

Total CloudShell time: **3-5 minutes**.

---

## Considerations / Open Questions

### Seeder project name discovery
The seeder CodeBuild project is created by `PostDeploymentSeeder` CDK construct.
Its physical name is auto-generated by CDK. The `post_build` step needs a reliable
way to find it. Options:
- Export the project name as a CloudFormation output in `post-deployment-seeder.ts`
  and read it with `aws cloudformation describe-stacks` in `post_build`
- Use a fixed name prefix in the CDK construct (e.g., `grow2-seeder-<region>`)

### amplify_outputs.json no longer downloaded to local machine
Currently `deploy-grow2-bootstrap.sh` downloads `amplify_outputs.json` after
CodeBuild completes. In the fire-and-forget model this doesn't happen.
The file is still uploaded to S3 by `post_build` for the seeder to use.
The React app build (also in CodeBuild) reads it from S3.
No local copy is needed.

### CDK bootstrap still requires CloudShell
First-time deploys need `cdk bootstrap` which takes ~2 minutes. This is fine —
it's a one-time operation and fits within the 5-minute window.

### Re-deploy (code change only)
Same flow — zip, upload, start build, exit. CodeBuild detects what changed via
CDK diff and only updates affected stacks. Seeder idempotency check skips it
if already SUCCEEDED.

### Delete still uses CloudShell
`delete-grow2.sh` runs in CloudShell and takes ~15-20 minutes. This is a
separate problem — could also be moved to CodeBuild but lower priority.

---

## Files to Modify When Implementing

- `installation/deploy-grow2-bootstrap.sh` — remove wait loop, add fire-and-forget exit
- `installation/deploy-via-codebuild.sh` — add artifact upload + seeder trigger to `post_build`
- `amplify/custom/post-deployment-seeder.ts` — optionally add fixed name prefix or CfnOutput
- `README.md` — update deployment instructions to reflect new flow
- `install_docs/usage/FIRST_LOGIN.md` — update with new "check CodeBuild console" step
