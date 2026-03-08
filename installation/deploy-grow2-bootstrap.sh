#!/bin/bash
#
# ============================================================================
# Grow2 Platform - Deployment Script
# ============================================================================
#
# DESCRIPTION:
#   Deploys the complete Grow2 Grant Platform including:
#   - Backend infrastructure (Cognito, AppSync, DynamoDB, Lambda, etc.)
#   - AgentCore agents (US Grants, EU Grants, Proposals, PDF, Evaluator)
#   - Knowledge Base (OpenSearch + Bedrock)
#   - Agent Discovery (Step Functions)
#   - React application (Amplify Hosting)
#   - Demo data seeding (automatic)
#
# PREREQUISITES (automatically checked by script):
#   - AWS CLI v2+ installed and configured
#   - Node.js 18+ and npm installed
#   - AWS credentials configured with admin access
#   - ~50GB free disk space
#   - Internet connection for npm packages
#
# NOTE: The script automatically runs ./check-prerequisites.sh first
#       and will exit if any prerequisites are missing.
#
# USAGE:
#   ./deploy-grow2-bootstrap.sh <region> [OPTIONS]
#
# PARAMETERS:
#   region              - AWS region to deploy to (REQUIRED, no default)
#                         Examples: us-west-2, us-east-1
#
# OPTIONS:
#   (none — deployment is fully automated via CodeBuild)
#
# EXAMPLES:
#   ./deploy-grow2-bootstrap.sh us-east-1
#   ./deploy-grow2-bootstrap.sh us-west-2
#
# WHAT THIS SCRIPT DOES:
#   1. Validates region parameter (fails if missing)
#   2. Checks if region is CDK bootstrapped
#   3. Bootstraps region if needed (one-time setup, ~5 minutes)
#   4. Deploys full Grow2 stack (~35-50 minutes)
#   5. Triggers automatic data seeding via CodeBuild (~8-10 minutes)
#   6. Builds and deploys React app to Amplify Hosting (~3-5 minutes)
#
# EXPECTED TIME:
#   - First deployment: 45-60 minutes (includes bootstrap)
#   - Subsequent deployments: 35-50 minutes
#   - Post-deployment seeding: 8-10 minutes (automatic)
#
# WHAT GETS DEPLOYED:
#   Backend:
#     - Cognito User Pool for authentication
#     - AppSync GraphQL API
#     - DynamoDB tables for data storage
#     - Lambda functions for business logic
#     - Step Functions for agent discovery
#     - S3 buckets for storage
#     - OpenSearch collection for vector search
#     - Bedrock Knowledge Base
#   
#   Frontend:
#     - Amplify Hosting App
#     - React application (built and deployed)
#   
#   Demo Data (automatic):
#     - Test user: test_user@example.com / Password123!
#     - User profile with AI/ML research keywords
#     - Agent configuration
#     - Agent discovery run (so test_user has grants populated on first login)
#
# AFTER DEPLOYMENT:
#   1. Check CloudFormation outputs for Amplify URL
#   2. Wait for CodeBuild seeding to complete (~8-10 minutes)
#   3. Access Amplify URL in browser
#   4. Login with: test_user@example.com / Password123!
#   5. Verify grants are populated
#
# MONITORING:
#   - CloudFormation: Check stack status in AWS Console
#   - CodeBuild: Monitor seeding progress in CodeBuild console
#   - Logs: Saved to deployment-YYYYMMDD-HHMMSS.log
#
# TROUBLESHOOTING:
#   - If deployment fails, check CloudFormation console for errors
#   - Review log file for detailed error messages
#   - Common issues:
#     * AWS credentials expired or invalid
#     * Insufficient IAM permissions
#     * Resource limits hit (Lambda, DynamoDB, etc.)
#     * Network connectivity issues
#   - To clean up failed deployment: ./delete-grow2.sh <region>
#
# CLEANUP:
#   To delete all resources:
#     ./delete-grow2.sh <region>
#
# MORE INFORMATION:
#   - docs/deployment/DEPLOYMENT_SCRIPTS.md - Complete guide
#   - docs/deployment/QUICK_TEST_PLAN.md - Testing guide
#   - docs/deployment/AMPLIFY_HOSTING_DEPLOYMENT.md - Amplify details
#   - docs/deployment/AUTOMATED_SEEDING.md - Seeding details
#
# ============================================================================

set -e  # Exit on error

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check prerequisites first
echo "Checking prerequisites..."
"$SCRIPT_DIR/check-prerequisites.sh" || exit 1
echo ""

# Free up local Docker disk space (harmless if Docker not available)
# Note: AgentCore images are built in CodeBuild ARM64, not locally
docker system prune -af --volumes 2>/dev/null || true

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
cd "$PROJECT_ROOT"
npm install
echo "✅ Dependencies installed"
echo ""

# Check if region parameter is provided
if [ -z "$1" ]; then
  echo "❌ ERROR: Region parameter is required!"
  echo ""
  echo "Usage: $0 <region> [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  (none — deployment is fully automated via CodeBuild)"
  echo ""
  echo "Supported regions (tested and verified):"
  echo "  - us-east-1 (US East - N. Virginia) - RECOMMENDED"
  echo "  - us-east-2 (US East - Ohio)"
  echo "  - us-west-2 (US West - Oregon)"
  echo "  - eu-west-1 (Europe - Ireland) - TESTING"
  echo ""
  echo "Examples:"
  echo "  $0 us-east-1"
  echo "  $0 us-west-2"
  echo ""
  exit 1
fi

DEPLOY_REGION=$(echo "$1" | tr -d '[:space:],')

# Region validation - only allow tested and verified regions
ALLOWED_REGIONS="us-east-1 us-east-2 us-west-2 eu-west-1"

if ! echo "$ALLOWED_REGIONS" | grep -qw "$DEPLOY_REGION"; then
  echo "❌ ERROR: Region '$DEPLOY_REGION' is not supported"
  echo ""
  echo "   Only the following regions are supported:"
  echo "     ✅ us-east-1 (US East - N. Virginia) - RECOMMENDED"
  echo "     ✅ us-east-2 (US East - Ohio)"
  echo "     ✅ us-west-2 (US West - Oregon)"
  echo "     ⚠️  eu-west-1 (Europe - Ireland) - TESTING"
  echo ""
  echo "   Why these regions?"
  echo "     - Bedrock AgentCore Runtime (including Evaluations)"
  echo "     - OpenSearch Serverless fully available"
  echo "     - Extensively tested and verified"
  echo ""
  echo "   Blocked regions:"
  echo "     ❌ eu-central-1 - OpenSearch Serverless issues"
  echo "     ❌ Other regions - Not tested/verified"
  echo ""
  exit 1
fi

echo "⚠️  Deploying to: $DEPLOY_REGION"
echo ""
echo "Supported regions (tested and verified):"
echo "  ✅ us-east-1 (US East - N. Virginia) - RECOMMENDED"
echo "  ✅ us-east-2 (US East - Ohio)"
echo "  ✅ us-west-2 (US West - Oregon)"
echo "  ⚠️  eu-west-1 (Europe - Ireland) - TESTING"
echo ""

if [ "$DEPLOY_REGION" = "eu-west-1" ]; then
  echo "⚠️  WARNING: eu-west-1 is in TESTING mode"
  echo ""
  echo "   Known limitations:"
  echo "     - AgentCore Evaluations may not be available"
  echo "     - Proposal Evaluator Agent may not work"
  echo "     - Other features should work normally"
  echo ""
  echo "   This deployment is for testing purposes. Continuing..."
  echo ""
fi

# Create log file in logs directory
mkdir -p "$PROJECT_ROOT/logs"
LOG_FILE="$PROJECT_ROOT/logs/deployment-$(date +%Y%m%d-%H%M%S).log"

# Function to log to both console and file
log() {
  echo "$@" | tee -a "$LOG_FILE"
}

log "🚀 Deploying Grow2 Grant Platform to $DEPLOY_REGION..."
log ""
log "📝 Logging to: $LOG_FILE"
log ""

# CRITICAL: Unset any existing AWS_REGION environment variable first
unset AWS_REGION
unset AWS_DEFAULT_REGION

export AWS_REGION=$DEPLOY_REGION
export AWS_DEFAULT_REGION=$DEPLOY_REGION

log "Deploying to: $AWS_REGION"
log "   (Cleared any existing AWS_REGION environment variables)"
log ""

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log "AWS Account: $ACCOUNT_ID"
log ""

# ============================================================================
# CDK Bootstrap Check
# ============================================================================
# 
# COMMON ISSUES:
# - npx ampx sandbox internally calls CDK bootstrap
# - Amplify's internal call creates changeset but DOESN'T execute it
# - This leaves CDKToolkit stuck in REVIEW_IN_PROGRESS state
# - Old/corrupted CDK infrastructure from previous deployments can cause:
#   * "Role arn:aws:iam::xxx:role/cdk-xxx is invalid or cannot be assumed"
#   * AWS::EarlyValidation::ResourceExistenceCheck failures
# - Do not run from incognito or private browser
#
# SOLUTION:
# - Detect ANY problematic CDK state (REVIEW_IN_PROGRESS, old roles, etc.)
# - Clean up ALL CDK infrastructure automatically
# - Let npx ampx sandbox bootstrap fresh on clean slate
# - DO NOT manually bootstrap - let Amplify do it
#
# ============================================================================

# Check if region has CDKToolkit or old CDK infrastructure
log "Checking CDK Bootstrap status in $DEPLOY_REGION..."
BOOTSTRAP_STACK=$(aws cloudformation describe-stacks \
  --region $DEPLOY_REGION \
  --stack-name CDKToolkit \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "NOT_FOUND")

# Also check for old CDK roles that might be invalid
CDK_ROLE_NAME="cdk-hnb659fds-cfn-exec-role-${ACCOUNT_ID}-${DEPLOY_REGION}"
OLD_CDK_ROLE=$(aws iam get-role --role-name "$CDK_ROLE_NAME" 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND")

NEEDS_CLEANUP=false

if [ "$BOOTSTRAP_STACK" = "REVIEW_IN_PROGRESS" ]; then
  log "❌ CDKToolkit stuck in REVIEW_IN_PROGRESS"
  log ""
  log "   ROOT CAUSE: Amplify's internal CDK bootstrap creates changeset without executing it"
  log "   This is a known AWS CDK bug that affects fresh regions"
  log ""
  NEEDS_CLEANUP=true
elif [ "$BOOTSTRAP_STACK" != "NOT_FOUND" ] && [ "$BOOTSTRAP_STACK" != "CREATE_COMPLETE" ] && [ "$BOOTSTRAP_STACK" != "UPDATE_COMPLETE" ]; then
  log "❌ CDKToolkit in unexpected state: $BOOTSTRAP_STACK"
  log ""
  log "   This may indicate a failed or incomplete previous deployment"
  log ""
  NEEDS_CLEANUP=true
elif [ "$OLD_CDK_ROLE" = "EXISTS" ] && [ "$BOOTSTRAP_STACK" = "NOT_FOUND" ]; then
  log "❌ Found orphaned CDK role without CDKToolkit stack"
  log ""
  log "   ROOT CAUSE: Previous deployment left behind CDK infrastructure"
  log "   This causes 'Role is invalid or cannot be assumed' errors"
  log ""
  NEEDS_CLEANUP=true
fi

if [ "$NEEDS_CLEANUP" = true ]; then
  log "   AUTOMATIC FIX: Cleaning up old CDK infrastructure..."
  log ""
  
  "$SCRIPT_DIR/fix-stuck-deployment.sh" "$DEPLOY_REGION" 2>&1 | tee -a "$LOG_FILE"
  
  CLEANUP_CHECK=$(aws cloudformation describe-stacks \
    --region $DEPLOY_REGION \
    --stack-name CDKToolkit \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")
  
  ROLE_CHECK=$(aws iam get-role --role-name "$CDK_ROLE_NAME" 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND")
  
  if [ "$CLEANUP_CHECK" != "NOT_FOUND" ] || [ "$ROLE_CHECK" = "EXISTS" ]; then
    log ""
    log "❌ Cleanup incomplete:"
    log "   CDKToolkit: $CLEANUP_CHECK"
    log "   CDK Role: $ROLE_CHECK"
    log "   Manual intervention may be required"
    log ""
    exit 1
  fi
  
  log ""
  log "✅ Cleanup complete - region is ready for fresh bootstrap"
  log ""
else
  if [ "$BOOTSTRAP_STACK" = "NOT_FOUND" ]; then
    log "⚠️  CDKToolkit not found - bootstrapping now..."
    log "   Running: npx --yes cdk bootstrap aws://$ACCOUNT_ID/$DEPLOY_REGION"
    log ""
    npx --yes cdk bootstrap aws://$ACCOUNT_ID/$DEPLOY_REGION 2>&1 | tee -a "$LOG_FILE"
    BOOTSTRAP_EXIT=${PIPESTATUS[0]}
    if [ $BOOTSTRAP_EXIT -ne 0 ]; then
      log ""
      log "❌ CDK bootstrap failed (exit code: $BOOTSTRAP_EXIT)"
      log "   Check the output above for details"
      log ""
      exit 1
    fi
    log ""
    log "✅ CDK bootstrap complete"
    log ""
  else
    log "✅ CDKToolkit exists in state: $BOOTSTRAP_STACK"
    log "   Will be reused by deployment"
    log ""
  fi
fi

log "================================================"
log "Deploying Full Stack with ALL AgentCore Agents"
log "================================================"
log ""
log "Components being deployed:"
log "  - Amplify Gen2 Backend (Auth, Data, Functions)"
log "  - AgentCore Agents (US Grants, EU Grants, Proposals, PDF, Evaluator)"
log "  - Knowledge Base (OpenSearch + Bedrock)"
log "  - Agent Discovery (Step Functions)"
log "  - Post-Deployment Seeding (CodeBuild)"
log ""
log "Expected time:"
log "  - First deployment: 35-55 minutes"
log "  - Subsequent: 5-10 minutes"
log ""

# Change to project root for deployment
cd "$PROJECT_ROOT"

log "Running deployment via CodeBuild ARM64..."
log ""
log "   Target region: $DEPLOY_REGION"
log "   Method: CodeBuild ARM64 (required for BedrockAgentCore images)"
log "   Artifacts uploaded and seeder triggered automatically by CodeBuild post_build"
log ""
log "Starting ARM64 deployment via CodeBuild..."
log ""

# CRITICAL: Use CodeBuild ARM64 for deployment.
# CloudShell runs on x86_64 — it cannot build ARM64 Docker images for BedrockAgentCore.
# CodeBuild with ARM_CONTAINER builds natively on Graviton (ARM64).
# post_build uploads artifacts and triggers seeder automatically — no waiting needed.
"$SCRIPT_DIR/deploy-via-codebuild.sh" "$DEPLOY_REGION" "$ACCOUNT_ID"

# deploy-via-codebuild.sh exits 0 immediately after starting the build (fire-and-forget).
# The user is done — CodeBuild handles the rest.
exit 0
