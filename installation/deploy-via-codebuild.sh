#!/bin/bash
#
# ============================================================================
# deploy-via-codebuild.sh - Deploy Grow2 via ARM64 CodeBuild
# ============================================================================
#
# PROBLEM: CloudShell runs on x86_64 but BedrockAgentCore requires ARM64
#          container images. CDK cannot cross-compile on CloudShell.
#
# SOLUTION: Run the ENTIRE deployment (npm ci + npx ampx sandbox) inside
#           a CodeBuild ARM64 instance. CodeBuild builds Docker images
#           natively on ARM64 (Graviton) — no cross-compilation needed.
#
# USAGE:
#   ./deploy-via-codebuild.sh <region> <account_id>
#
# CALLED BY:
#   deploy-grow2-bootstrap.sh (automatically, replaces local npx ampx sandbox)
#
# WHAT IT DOES:
#   1. Creates CodeBuild IAM role (if not exists)
#   2. Zips the repo and uploads to CDK bootstrap S3 bucket
#   3. Creates/updates CodeBuild project (ARM64, privileged, amazonlinux2-aarch64)
#   4. Starts the build: npm ci && npx ampx sandbox --once
#   5. Streams build logs to console
#   6. Downloads amplify_outputs.json from S3 after success
#
# ============================================================================

set -e

DEPLOY_REGION="${1}"
ACCOUNT_ID="${2}"

if [ -z "$DEPLOY_REGION" ] || [ -z "$ACCOUNT_ID" ]; then
  echo "Usage: $0 <region> <account_id>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Redirect stderr to log file only — keeps console clean
mkdir -p "$PROJECT_ROOT/logs"
DEBUG_LOG="$PROJECT_ROOT/logs/deploy-via-codebuild-$(date +%Y%m%d-%H%M%S).log"
exec 2>>"$DEBUG_LOG"

# CDK bootstrap bucket — always exists after cdk bootstrap
S3_BUCKET="cdk-hnb659fds-assets-${ACCOUNT_ID}-${DEPLOY_REGION}"
CB_PROJECT="grow2-arm64-deployer-${DEPLOY_REGION}"
CB_ROLE_NAME="grow2-codebuild-deployer-role"

echo "================================================"
echo "Deploying Grow2 via CodeBuild ARM64"
echo "================================================"
echo ""
echo "Region:  $DEPLOY_REGION"
echo "Account: $ACCOUNT_ID"
echo "Bucket:  $S3_BUCKET"
echo ""

export AWS_REGION=$DEPLOY_REGION
export AWS_DEFAULT_REGION=$DEPLOY_REGION

# ============================================================================
# Step 1: Create/update CodeBuild IAM role
# ============================================================================
echo "Step 1: Setting up CodeBuild IAM role..."

CB_ROLE_ARN=$(aws iam get-role --role-name "$CB_ROLE_NAME" \
  --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$CB_ROLE_ARN" ] || [ "$CB_ROLE_ARN" = "None" ]; then
  echo "  Creating IAM role $CB_ROLE_NAME..."

  CB_ROLE_ARN=$(aws iam create-role \
    --role-name "$CB_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "codebuild.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' \
    --query 'Role.Arn' --output text)

  # Full admin access — CodeBuild is deploying the entire stack
  aws iam attach-role-policy \
    --role-name "$CB_ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"

  echo "  ✅ Role created: $CB_ROLE_ARN"
  echo "  Waiting for role to propagate..."
  sleep 15
else
  echo "  ✅ Role exists: $CB_ROLE_ARN"
  # Ensure AdministratorAccess is attached (may be missing if stacks were manually deleted)
  aws iam attach-role-policy \
    --role-name "$CB_ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess" 2>/dev/null || true
fi
echo ""

# ============================================================================
# Step 2: Zip repo and upload to S3
# ============================================================================
echo "Step 2: Packaging repo and uploading to S3..."

TIMESTAMP=$(date +%s)
ZIP_KEY="codebuild-deploy/source-${TIMESTAMP}.zip"
TEMP_ZIP="/tmp/grow2-source-${TIMESTAMP}.zip"
rm -f "$TEMP_ZIP"

cd "$PROJECT_ROOT"

echo "  Creating zip (excluding node_modules, .git, build artifacts)..."
zip -r "$TEMP_ZIP" . \
  -x "*/.git/*" \
  -x ".git/*" \
  -x "*/node_modules/*" \
  -x "*/.amplify/artifacts/*" \
  -x "*/react-aws/build/*" \
  -x "*.log" \
  -x "*/.DS_Store" \
  -x "*/__pycache__/*" \
  -x "*.pyc"

ZIP_SIZE=$(du -sh "$TEMP_ZIP" | cut -f1)
echo "  Zip size: $ZIP_SIZE"

echo "  Uploading to s3://$S3_BUCKET/$ZIP_KEY ..."
aws s3 cp "$TEMP_ZIP" "s3://$S3_BUCKET/$ZIP_KEY" --region "$DEPLOY_REGION"
rm -f "$TEMP_ZIP"
echo "  ✅ Source uploaded"
echo ""

# ============================================================================
# Step 3: Build the buildspec inline
# ============================================================================
# The buildspec runs inside CodeBuild ARM64 and:
#   - Installs Node.js 20 (amazonlinux2-aarch64 has older node)
#   - Runs npm ci
#   - Runs npx ampx sandbox --once (builds ARM64 Docker images natively)
#   - Uploads amplify_outputs.json to S3 for retrieval

BUILDSPEC=$(cat <<'SPEC_TEMPLATE'
version: 0.2
env:
  variables:
    AWS_REGION: "PLACEHOLDER_REGION"
    AWS_DEFAULT_REGION: "PLACEHOLDER_REGION"
phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - node --version
      - npm --version
      - docker --version
  pre_build:
    commands:
      - echo "Installing npm dependencies..."
      - npm ci
  build:
    commands:
      - echo "Deploying Grow2 stack (ARM64 native build)..."
      - npx ampx sandbox --once --outputs-out-dir /tmp
  post_build:
    commands:
      - echo "Build status $CODEBUILD_BUILD_SUCCEEDING"
      - if [ "$CODEBUILD_BUILD_SUCCEEDING" != "1" ]; then echo "ERROR Build failed not uploading outputs"; exit 1; fi
      - if [ ! -f /tmp/amplify_outputs.json ]; then echo "ERROR amplify_outputs.json not found"; exit 1; fi
      - FILE_SIZE=$(wc -c < /tmp/amplify_outputs.json | tr -d ' ') && echo "amplify_outputs.json size $FILE_SIZE bytes"
      - if [ "$FILE_SIZE" -le 100 ]; then echo "ERROR amplify_outputs.json too small ($FILE_SIZE bytes) — CDK deploy likely failed"; exit 1; fi
      - |
        APP_BUCKET=$(aws cloudformation list-exports --region PLACEHOLDER_REGION \
          --query 'Exports[?ends_with(Name,`-DeploymentAssetsBucket`)].Value' \
          --output text 2>/dev/null | head -n1 || echo "")
        if [ -z "$APP_BUCKET" ] || [ "$APP_BUCKET" = "None" ]; then
          echo "ERROR app deployment bucket not found in CloudFormation exports — cannot upload artifacts"
          exit 1
        fi
        echo "App bucket: $APP_BUCKET"
        echo "Uploading amplify_outputs.json to app bucket..."
        aws s3 cp /tmp/amplify_outputs.json s3://$APP_BUCKET/codebuild-deploy/amplify_outputs.json --region PLACEHOLDER_REGION
        echo "SUCCESS amplify_outputs.json uploaded"
        echo "Uploading react-aws source to app bucket..."
        aws s3 sync react-aws/ s3://$APP_BUCKET/react-aws-source/ --region PLACEHOLDER_REGION --exclude "node_modules/*" --exclude "build/*" --exclude ".amplify/*" --exclude "*.log"
        echo "SUCCESS react-aws source uploaded"
        echo "Uploading bedrock prompts to app bucket..."
        aws s3 sync config/bedrock-prompts/ s3://$APP_BUCKET/bedrock-prompts/ --region PLACEHOLDER_REGION
        echo "SUCCESS bedrock prompts uploaded"
        echo "Uploading import script to app bucket..."
        aws s3 cp python/import_bedrock_prompts.py s3://$APP_BUCKET/scripts/import_bedrock_prompts.py --region PLACEHOLDER_REGION || true
        echo "SUCCESS all artifacts uploaded to app bucket: $APP_BUCKET"
      - echo "Triggering seeder..."
      - |
        SEEDER_PROJECT="grow2-seeder-PLACEHOLDER_ACCOUNT-PLACEHOLDER_REGION"
        echo "Seeder project: $SEEDER_PROJECT"
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
          aws codebuild start-build --project-name "$SEEDER_PROJECT" --region PLACEHOLDER_REGION
          echo "Seeder triggered: $SEEDER_PROJECT"
        fi
      - echo "SUCCESS deployment complete"
SPEC_TEMPLATE
)
# Substitute placeholders with actual values (safe - no shell expansion issues)
BUILDSPEC="${BUILDSPEC//PLACEHOLDER_REGION/$DEPLOY_REGION}"
BUILDSPEC="${BUILDSPEC//PLACEHOLDER_ACCOUNT/$ACCOUNT_ID}"

# ============================================================================
# Step 4: Create/update CodeBuild project
# ============================================================================
echo "Step 3: Creating/updating CodeBuild project..."

PROJECT_EXISTS=$(aws codebuild batch-get-projects \
  --names "$CB_PROJECT" \
  --region "$DEPLOY_REGION" \
  --query 'projects[0].name' \
  --output text 2>/dev/null || echo "")

SOURCE_JSON="{
  \"type\": \"S3\",
  \"location\": \"${S3_BUCKET}/${ZIP_KEY}\",
  \"buildspec\": $(echo "$BUILDSPEC" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
}"

ENV_JSON='{
  "type": "ARM_CONTAINER",
  "image": "aws/codebuild/amazonlinux-aarch64-standard:3.0",
  "computeType": "BUILD_GENERAL1_LARGE",
  "privilegedMode": true
}'

if [ -z "$PROJECT_EXISTS" ] || [ "$PROJECT_EXISTS" = "None" ]; then
  echo "  Creating project $CB_PROJECT..."
  aws codebuild create-project \
    --name "$CB_PROJECT" \
    --region "$DEPLOY_REGION" \
    --source "$SOURCE_JSON" \
    --artifacts '{"type": "NO_ARTIFACTS"}' \
    --environment "$ENV_JSON" \
    --service-role "$CB_ROLE_ARN" \
    --timeout-in-minutes 90 \
    > /dev/null
  echo "  ✅ Project created"
else
  echo "  Updating project $CB_PROJECT..."
  aws codebuild update-project \
    --name "$CB_PROJECT" \
    --region "$DEPLOY_REGION" \
    --source "$SOURCE_JSON" \
    --environment "$ENV_JSON" \
    > /dev/null
  echo "  ✅ Project updated"
fi
echo ""

# ============================================================================
# Step 5: Start build
# ============================================================================
echo "Step 4: Starting CodeBuild ARM64 deployment..."
echo ""

BUILD_ID=$(aws codebuild start-build \
  --project-name "$CB_PROJECT" \
  --region "$DEPLOY_REGION" \
  --query 'build.id' \
  --output text)

echo "  Build ID: $BUILD_ID"
echo ""
echo "================================================"
echo "✅ Deployment started — you can close CloudShell now."
echo "================================================"
echo ""
echo "Monitor progress:"
echo "  https://${DEPLOY_REGION}.console.aws.amazon.com/codesuite/codebuild/projects/${CB_PROJECT}/build/${BUILD_ID}/log"
echo ""
echo "Expected time: 35-55 min deployment + 8-10 min seeding (fully automated)"
echo ""
echo "When complete, the Amplify app URL will appear in CloudFormation outputs:"
echo "  https://${DEPLOY_REGION}.console.aws.amazon.com/cloudformation"
echo ""

exit 0
