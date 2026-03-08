#!/bin/bash
#
# ============================================================================
# Grow2 Platform - Deletion Script
# ============================================================================
#
# DESCRIPTION:
#   Deletes ALL Grow2 Platform resources.
#   - Phase 0: Empty S3 buckets + delete OpenSearch/KB before stack deletion
#   - Phase 1: Delete stacks in dependency order:
#              AgentCore → data nested stack → root stack → BedrockPrompts
#   - Phase 2: Clean up retained/orphaned resources CloudFormation left behind
#
# WARNING: THIS WILL DELETE ALL DATA PERMANENTLY
#
# USAGE:
#   ./delete-grow2.sh <region>
#
# EXAMPLES:
#   ./delete-grow2.sh us-east-1
#   ./delete-grow2.sh us-west-2
#
# ============================================================================

set -e

# Disable AWS CLI pager globally — prevents [EOF]/q prompts on long output
export AWS_PAGER=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Checking prerequisites..."
"$SCRIPT_DIR/check-prerequisites.sh" || exit 1
echo ""

if [ -z "$1" ]; then
  echo "ERROR: Region parameter is required!"
  echo "Usage: $0 <region>"
  exit 1
fi

DELETE_REGION=$1
unset AWS_REGION
unset AWS_DEFAULT_REGION
export AWS_REGION=$DELETE_REGION
export AWS_DEFAULT_REGION=$DELETE_REGION

echo "WARNING: You are about to DELETE ALL Grow2 resources in $DELETE_REGION"
echo ""
echo "This will permanently delete:"
echo "  - All CloudFormation stacks"
echo "  - All S3 buckets and their contents"
echo "  - All DynamoDB tables and data"
echo "  - Amazon OpenSearch Serverless collections"
echo "  - Amazon Bedrock Knowledge Bases"
echo "  - AWS Lambda functions, AWS Step Functions, AWS CodeBuild, AWS Amplify Apps"
echo "  - ALL USER DATA"
echo ""
read -p "Are you ABSOLUTELY SURE? Type 'DELETE' to confirm: " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
  echo "Deletion cancelled"
  exit 0
fi

echo ""
echo "Starting deletion process..."
echo ""

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account: $ACCOUNT_ID"
echo "Region: $DELETE_REGION"
echo ""

empty_s3_buckets() {
  local BUCKETS
  BUCKETS=$(aws s3api list-buckets \
    --query 'Buckets[?contains(Name, `amplify-grow2`) || contains(Name, `amplifygrow2`)].Name' \
    --output text 2>/dev/null || echo "")
  if [ -n "$BUCKETS" ]; then
    for bucket in $BUCKETS; do
      BUCKET_REGION=$(aws s3api get-bucket-location --bucket "$bucket" \
        --query 'LocationConstraint' --output text 2>/dev/null || echo "us-east-1")
      [ "$BUCKET_REGION" = "None" ] && BUCKET_REGION="us-east-1"
      if [ "$BUCKET_REGION" = "$DELETE_REGION" ]; then
        echo "  - Emptying: $bucket"
        aws s3 rm "s3://$bucket" --recursive --region "$DELETE_REGION" 2>/dev/null || true
      fi
    done
  fi
}

# ============================================================================
# PHASE 0: Empty S3 buckets + delete OpenSearch/KB before stack deletion
# ============================================================================
echo "================================================"
echo "Phase 0: Pre-deletion Cleanup"
echo "================================================"
echo ""

echo "Emptying S3 buckets..."
empty_s3_buckets
echo "S3 buckets emptied"
echo ""

echo "Finding Amazon OpenSearch Serverless collections..."
COLLECTIONS=$(aws opensearchserverless list-collections \
  --region "$DELETE_REGION" \
  --query 'collectionSummaries[?contains(name, `grow2`) || contains(name, `amplify`)].id' \
  --output text 2>/dev/null || echo "")
if [ -n "$COLLECTIONS" ]; then
  for collection_id in $COLLECTIONS; do
    echo "  - Deleting collection: $collection_id"
    aws opensearchserverless delete-collection --id "$collection_id" --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "OpenSearch collections deleted"
else
  echo "  No OpenSearch collections found"
fi
echo ""

echo "Finding Amazon Bedrock Knowledge Bases..."
KBS=$(aws bedrock-agent list-knowledge-bases \
  --region "$DELETE_REGION" \
  --query 'knowledgeBaseSummaries[?contains(name, `grow2`) || contains(name, `amplify`)].knowledgeBaseId' \
  --output text 2>/dev/null || echo "")
if [ -n "$KBS" ]; then
  for kb in $KBS; do
    echo "  - Deleting: $kb"
    aws bedrock-agent delete-knowledge-base --knowledge-base-id "$kb" --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "Knowledge Bases deleted"
else
  echo "  No Knowledge Bases found"
fi
echo ""

echo "Phase 0 Complete"
echo ""

# ============================================================================
# PHASE 1: Delete CloudFormation stacks in dependency order
# ============================================================================
echo "================================================"
echo "Phase 1: Deleting CloudFormation Stacks"
echo "================================================"
echo ""

ROOT_STACK=$(aws cloudformation list-stacks \
  --region "$DELETE_REGION" \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE DELETE_FAILED \
  --query 'StackSummaries[?starts_with(StackName, `amplify-grow2-`)].StackName' \
  --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$' | \
  awk '{ print length, $0 }' | sort -n | head -1 | awk '{print $2}')

if [ -z "$ROOT_STACK" ]; then
  echo "  No root stack found (may already be deleted)"
else
  echo "Found root stack: $ROOT_STACK"
  echo ""

  # 1. Delete AgentCore first — imports from data stack
  AGENTCORE_STACK=$(aws cloudformation list-stacks \
    --region "$DELETE_REGION" \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE DELETE_FAILED \
    --query 'StackSummaries[?contains(StackName, `AgentCore`) && contains(StackName, `grow2`)].StackName' \
    --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$' | head -1)

  if [ -n "$AGENTCORE_STACK" ]; then
    echo "Deleting AgentCore first (imports from data stack)..."
    aws cloudformation delete-stack --stack-name "$AGENTCORE_STACK" --region "$DELETE_REGION" 2>/dev/null || true
    aws cloudformation wait stack-delete-complete \
      --stack-name "$AGENTCORE_STACK" --region "$DELETE_REGION" 2>/dev/null \
      && echo "  Deleted: $AGENTCORE_STACK" \
      || echo "  May have failed: $AGENTCORE_STACK — continuing"
    echo ""
  fi

  # 2. Delete data nested stack — imports BedrockPrompts exports
  DATA_STACK=$(aws cloudformation list-stacks \
    --region "$DELETE_REGION" \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE DELETE_FAILED \
    --query 'StackSummaries[?contains(StackName, `-data`) && contains(StackName, `grow2`)].StackName' \
    --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$' | head -1)

  if [ -n "$DATA_STACK" ]; then
    echo "Deleting data nested stack (imports BedrockPrompts exports)..."
    aws cloudformation delete-stack --stack-name "$DATA_STACK" --region "$DELETE_REGION" 2>/dev/null || true
    aws cloudformation wait stack-delete-complete \
      --stack-name "$DATA_STACK" --region "$DELETE_REGION" 2>/dev/null \
      && echo "  Deleted: $DATA_STACK" \
      || echo "  May have failed: $DATA_STACK — continuing"
    echo ""
  fi

  # 3. Delete root stack
  echo "Deleting root stack..."
  aws cloudformation delete-stack --stack-name "$ROOT_STACK" --region "$DELETE_REGION"
  echo ""
  echo "Waiting for stack deletion to complete (this may take up to 30 minutes)..."
  aws cloudformation wait stack-delete-complete \
    --stack-name "$ROOT_STACK" \
    --region "$DELETE_REGION" 2>/dev/null || {
    echo ""
    echo "  Stack deletion encountered failures — re-emptying S3 and retrying..."

    # Re-empty S3 (access logging writes new objects during deletion)
    empty_s3_buckets

    # Retry any DELETE_FAILED stacks
    FAILED_STACKS=$(aws cloudformation list-stacks \
      --region "$DELETE_REGION" \
      --stack-status-filter DELETE_FAILED \
      --query 'StackSummaries[?contains(StackName, `grow2`)].StackName' \
      --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$')
    if [ -n "$FAILED_STACKS" ]; then
      for failed_stack in $FAILED_STACKS; do
        echo "  - Retrying delete: $failed_stack"
        aws cloudformation delete-stack --stack-name "$failed_stack" --region "$DELETE_REGION" 2>/dev/null || true
      done
      echo "  Waiting for retry deletions (up to 15 minutes)..."
      for failed_stack in $FAILED_STACKS; do
        aws cloudformation wait stack-delete-complete \
          --stack-name "$failed_stack" --region "$DELETE_REGION" 2>/dev/null || true
      done
    fi
  }
  echo "Stack deletion complete"

  # 4. Delete BedrockPrompts last — data stack is now gone, exports are free
  BEDROCK_PROMPTS_STACK=$(aws cloudformation list-stacks \
    --region "$DELETE_REGION" \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE DELETE_FAILED \
    --query 'StackSummaries[?contains(StackName, `BedrockPrompts`) && contains(StackName, `grow2`)].StackName' \
    --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$' | head -1)

  if [ -n "$BEDROCK_PROMPTS_STACK" ]; then
    echo ""
    echo "Deleting BedrockPrompts stack (data stack now gone)..."
    aws cloudformation delete-stack --stack-name "$BEDROCK_PROMPTS_STACK" --region "$DELETE_REGION" 2>/dev/null || true
    aws cloudformation wait stack-delete-complete \
      --stack-name "$BEDROCK_PROMPTS_STACK" --region "$DELETE_REGION" 2>/dev/null \
      && echo "  Deleted: $BEDROCK_PROMPTS_STACK" \
      || echo "  May have failed: $BEDROCK_PROMPTS_STACK"
  fi
fi
echo ""

# ============================================================================
# PHASE 2: Clean up retained/orphaned resources
# ============================================================================
echo "================================================"
echo "Phase 2: Cleaning Up Retained Resources"
echo "================================================"
echo ""

echo "Deleting remaining S3 buckets..."
BUCKETS_REMAINING=$(aws s3api list-buckets \
  --query 'Buckets[?contains(Name, `amplify-grow2`) || contains(Name, `amplifygrow2`)].Name' \
  --output text 2>/dev/null || echo "")
if [ -n "$BUCKETS_REMAINING" ]; then
  for bucket in $BUCKETS_REMAINING; do
    BUCKET_REGION=$(aws s3api get-bucket-location --bucket "$bucket" \
      --query 'LocationConstraint' --output text 2>/dev/null || echo "us-east-1")
    [ "$BUCKET_REGION" = "None" ] && BUCKET_REGION="us-east-1"
    if [ "$BUCKET_REGION" = "$DELETE_REGION" ]; then
      echo "  - Emptying and deleting: $bucket"
      aws s3 rm "s3://$bucket" --recursive --region "$DELETE_REGION" 2>/dev/null || true
      aws s3api delete-bucket --bucket "$bucket" --region "$DELETE_REGION" 2>/dev/null || true
    fi
  done
  echo "Remaining S3 buckets deleted"
else
  echo "  No remaining S3 buckets"
fi
echo ""

echo "Deleting retained DynamoDB tables..."
TABLES=$(aws dynamodb list-tables \
  --region "$DELETE_REGION" \
  --query 'TableNames[?contains(@, `GrantRecord`) || contains(@, `EuGrantRecord`) || contains(@, `SearchEvent`) || contains(@, `UserProfile`) || contains(@, `Proposal`) || contains(@, `AgentConfig`) || contains(@, `DocumentMetadata`) || contains(@, `ProposalVersion`) || contains(@, `ProposalContent`)]' \
  --output text 2>/dev/null || echo "")
if [ -n "$TABLES" ]; then
  for table in $TABLES; do
    echo "  - Deleting: $table"
    aws dynamodb delete-table --table-name "$table" --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "DynamoDB tables deleted"
else
  echo "  No retained DynamoDB tables found"
fi
echo ""

echo "Deleting retained AppSync API..."
APPSYNC_APIS=$(aws appsync list-graphql-apis \
  --region "$DELETE_REGION" \
  --query 'graphqlApis[?contains(name, `amplifyData`) || contains(name, `grow2`)].apiId' \
  --output text 2>/dev/null || echo "")
if [ -n "$APPSYNC_APIS" ]; then
  for api_id in $APPSYNC_APIS; do
    echo "  - Deleting: $api_id"
    aws appsync delete-graphql-api --api-id "$api_id" --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "AppSync APIs deleted"
else
  echo "  No retained AppSync APIs found"
fi
echo ""

echo "Deleting Amazon Bedrock Prompts..."
PROMPTS=$(aws bedrock-agent list-prompts \
  --region "$DELETE_REGION" \
  --max-results 100 \
  --query 'promptSummaries[?contains(name, `NSF-Prompt`) || contains(name, `NIH-Prompt`) || contains(name, `DOD-Prompt`) || contains(name, `European-Commission-Prompt`)].id' \
  --output text 2>/dev/null || echo "")
if [ -n "$PROMPTS" ]; then
  for prompt_id in $PROMPTS; do
    echo "  - Deleting: $prompt_id"
    aws bedrock-agent delete-prompt --prompt-identifier "$prompt_id" --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "Bedrock Prompts deleted"
else
  echo "  No Bedrock Prompts found"
fi
echo ""

echo "Deleting AWS Amplify Apps..."
APPS=$(aws amplify list-apps \
  --region "$DELETE_REGION" \
  --query 'apps[?contains(name, `grow2`)].appId' \
  --output text 2>/dev/null || echo "")
if [ -n "$APPS" ]; then
  for app in $APPS; do
    echo "  - Deleting: $app"
    aws amplify delete-app --app-id "$app" --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "Amplify Apps deleted"
else
  echo "  No Amplify Apps found"
fi
echo ""

echo "Deleting Amazon Bedrock AgentCore Runtimes..."
AGENT_RUNTIMES=$(aws bedrock-agentcore list-agent-runtimes \
  --region "$DELETE_REGION" \
  --query 'agentRuntimes[].{Name:agentRuntimeName,ID:agentRuntimeId}' \
  --output text 2>/dev/null || echo "")
if [ -n "$AGENT_RUNTIMES" ]; then
  echo "$AGENT_RUNTIMES" | while read -r name runtime_id; do
    echo "  - Deleting: $name"
    aws bedrock-agentcore delete-agent-runtime --agent-runtime-id "$runtime_id" --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "AgentCore Runtimes deleted"
else
  echo "  No AgentCore Runtimes found"
fi
echo ""

echo "Deleting ECR repositories..."
ECR_REPOS=$(aws ecr describe-repositories \
  --region "$DELETE_REGION" \
  --query 'repositories[?starts_with(repositoryName, `bedrock-agentcore-`) || repositoryName==`pdf-converter-agent`].repositoryName' \
  --output text 2>/dev/null || echo "")
if [ -n "$ECR_REPOS" ]; then
  for repo in $ECR_REPOS; do
    echo "  - Deleting: $repo"
    aws ecr delete-repository --repository-name "$repo" --force --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "ECR repositories deleted"
else
  echo "  No ECR repositories found"
fi
echo ""

# Delete CDK bootstrap ECR images (repo persists across stack deletions)
# These cached images must be cleared so next deploy builds fresh architecture-correct images
CDK_ECR_REPO="cdk-hnb659fds-container-assets-${ACCOUNT_ID}-${DELETE_REGION}"
echo "Clearing CDK bootstrap ECR images from $CDK_ECR_REPO..."
CDK_IMAGES=$(aws ecr list-images \
  --repository-name "$CDK_ECR_REPO" \
  --region "$DELETE_REGION" \
  --query 'imageIds[*]' \
  --output json 2>/dev/null || echo "[]")

if [ "$CDK_IMAGES" != "[]" ] && [ -n "$CDK_IMAGES" ]; then
  IMAGE_COUNT=$(echo "$CDK_IMAGES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  if [ "$IMAGE_COUNT" -gt 0 ]; then
    aws ecr batch-delete-image \
      --repository-name "$CDK_ECR_REPO" \
      --region "$DELETE_REGION" \
      --image-ids "$CDK_IMAGES" 2>/dev/null || true
    echo "  ✅ Cleared $IMAGE_COUNT cached images from CDK ECR repo"
  else
    echo "  No images found in CDK ECR repo"
  fi
else
  echo "  No images found in CDK ECR repo"
fi
echo ""

echo "Deleting ARM64 deployer CodeBuild project and role..."
CB_PROJECT="grow2-arm64-deployer-${DELETE_REGION}"
CB_ROLE_NAME="grow2-codebuild-deployer-role"

aws codebuild delete-project --name "$CB_PROJECT" --region "$DELETE_REGION" 2>/dev/null \
  && echo "  ✅ Deleted CodeBuild project: $CB_PROJECT" \
  || echo "  No CodeBuild project found: $CB_PROJECT"

# Detach policies before deleting role
aws iam detach-role-policy \
  --role-name "$CB_ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess" 2>/dev/null || true
aws iam delete-role --role-name "$CB_ROLE_NAME" 2>/dev/null \
  && echo "  ✅ Deleted IAM role: $CB_ROLE_NAME" \
  || echo "  No IAM role found: $CB_ROLE_NAME"
echo ""

echo "Deleting SSM parameters..."
PARAMS=$(aws ssm describe-parameters \
  --region "$DELETE_REGION" \
  --query 'Parameters[?contains(Name, `/amplify/`) || contains(Name, `/grow2/`)].Name' \
  --output text 2>/dev/null || echo "")
if [ -n "$PARAMS" ]; then
  for param in $PARAMS; do
    echo "  - Deleting: $param"
    aws ssm delete-parameter --name "$param" --region "$DELETE_REGION" 2>/dev/null || true
  done
  echo "SSM parameters deleted"
else
  echo "  No SSM parameters found"
fi
echo ""

echo "Deleting Amazon CloudWatch Log Groups..."
LOG_GROUPS=$(aws logs describe-log-groups \
  --region "$DELETE_REGION" \
  --query 'logGroups[?contains(logGroupName, `/aws/lambda/amplify-grow2`) || contains(logGroupName, `/aws/appsync/apis/`) || contains(logGroupName, `/aws/codebuild/amplify-grow2`) || contains(logGroupName, `/aws/bedrock-agentcore/`)].logGroupName' \
  --output text 2>/dev/null || echo "")
if [ -n "$LOG_GROUPS" ]; then
  LOG_COUNT=0
  for log_group in $LOG_GROUPS; do
    echo "  - Deleting: $log_group"
    aws logs delete-log-group --log-group-name "$log_group" --region "$DELETE_REGION" 2>/dev/null || true
    LOG_COUNT=$((LOG_COUNT + 1))
  done
  echo "Deleted $LOG_COUNT CloudWatch Log Groups"
else
  echo "  No CloudWatch Log Groups found"
fi
echo ""

echo "Phase 2 Complete"
echo ""

# ============================================================================
# Verification
# ============================================================================
echo "================================================"
echo "Verification"
echo "================================================"
echo ""

REMAINING=$(aws cloudformation list-stacks \
  --region "$DELETE_REGION" \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE DELETE_FAILED \
  --query 'StackSummaries[?contains(StackName, `grow2`)].StackName' \
  --output text 2>/dev/null || echo "")
if [ -z "$REMAINING" ]; then
  echo "SUCCESS: All Grow2 stacks deleted from $DELETE_REGION"
else
  echo "WARNING: Some stacks may still exist:"
  for stack in $REMAINING; do
    STATUS=$(aws cloudformation describe-stacks --stack-name "$stack" --region "$DELETE_REGION" \
      --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "UNKNOWN")
    echo "  - $stack ($STATUS)"
  done
  echo ""
  echo "For DELETE_FAILED stacks: use Force Delete in the CloudFormation console,"
  echo "then run this script again."
fi
echo ""

echo "================================================"
echo "Deletion Complete"
echo "================================================"
echo ""
echo "Time: $(date)"
echo ""
