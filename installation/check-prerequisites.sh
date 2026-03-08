#!/bin/bash
#
# Grow2 Platform - Prerequisites Check
#
# This script validates that all required tools are installed and configured
# before attempting deployment.
#

set -e

echo "======================================"
echo "Grow2 Platform - Prerequisites Check"
echo "======================================"
echo ""

ERRORS=0

# Check AWS CLI
echo "Checking AWS CLI..."
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found"
    echo "   Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    echo "   macOS: brew install awscli"
    echo "   Linux: See AWS documentation"
    echo ""
    ERRORS=$((ERRORS + 1))
else
    AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1 | cut -d'/' -f2)
    echo "✅ AWS CLI found: $AWS_VERSION"
    
    # Check if version is 2.x or higher
    MAJOR_VERSION=$(echo $AWS_VERSION | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 2 ]; then
        echo "⚠️  AWS CLI version 2.x or higher recommended (you have $AWS_VERSION)"
    fi
fi
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    echo "   Install: https://nodejs.org/"
    echo "   macOS: brew install node"
    echo "   Linux: Use nvm or package manager"
    echo ""
    ERRORS=$((ERRORS + 1))
else
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
    
    # Check if version is 18.x or higher
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo "⚠️  Node.js 18.x or higher recommended (you have $NODE_VERSION)"
    fi
fi
echo ""

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found (should come with Node.js)"
    echo "   Reinstall Node.js from https://nodejs.org/"
    echo ""
    ERRORS=$((ERRORS + 1))
else
    NPM_VERSION=$(npm --version)
    echo "✅ npm found: $NPM_VERSION"
fi
echo ""

# Check npx
echo "Checking npx..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found (should come with npm)"
    echo "   Reinstall Node.js from https://nodejs.org/"
    echo ""
    ERRORS=$((ERRORS + 1))
else
    NPX_VERSION=$(npx --version)
    echo "✅ npx found: $NPX_VERSION"
fi
echo ""

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured or invalid"
    echo "   Run: aws configure"
    echo "   You need:"
    echo "     - AWS Access Key ID"
    echo "     - AWS Secret Access Key"
    echo "     - Default region (e.g., us-west-2)"
    echo ""
    ERRORS=$((ERRORS + 1))
else
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    echo "✅ AWS credentials configured"
    echo "   Account: $ACCOUNT_ID"
    echo "   Identity: $USER_ARN"
fi
echo ""

# Check zip (required by deploy-via-codebuild.sh to package repo)
echo "Checking zip..."
if ! command -v zip &> /dev/null; then
    echo "❌ zip not found"
    echo "   macOS: brew install zip"
    echo "   Linux: sudo yum install zip  OR  sudo apt-get install zip"
    echo ""
    ERRORS=$((ERRORS + 1))
else
    echo "✅ zip found"
fi
echo ""

# Check disk space
echo "Checking disk space..."
if command -v df &> /dev/null; then
    AVAILABLE_GB=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G.*//')
    if [ ! -z "$AVAILABLE_GB" ]; then
        echo "✅ Available disk space: ${AVAILABLE_GB}GB"
        if [ "$AVAILABLE_GB" -lt 50 ]; then
            echo "⚠️  Less than 50GB available - deployment may require more space"
        fi
    fi
else
    echo "⚠️  Could not check disk space"
fi
echo ""

# Summary
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All prerequisites met!"
    echo ""
    echo "You can now run:"
    echo "  ./deploy-grow2-bootstrap.sh <region>"
    echo ""
    echo "Example:"
    echo "  ./deploy-grow2-bootstrap.sh us-west-2"
    echo ""
    exit 0
else
    echo "❌ $ERRORS prerequisite(s) missing"
    echo ""
    echo "Please install missing tools and try again."
    echo ""
    echo "For detailed setup instructions, see:"
    echo "  docs/deployment/DEPLOYMENT_SCRIPTS.md"
    echo ""
    exit 1
fi

