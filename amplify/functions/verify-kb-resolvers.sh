#!/bin/bash

# Knowledge Base GraphQL Resolvers Verification Script
# This script verifies that all KB resolvers are properly configured

echo "🔍 Verifying Knowledge Base GraphQL Resolvers Configuration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if files exist
echo "📁 Checking file existence..."

files=(
  "amplify/data/resource.ts"
  "amplify/backend.ts"
  "amplify/functions/kb-document-upload/handler.py"
  "amplify/functions/kb-document-upload/resource.ts"
  "amplify/functions/kb-search/handler.py"
  "amplify/functions/kb-search/resource.ts"
  "amplify/functions/kb-document-manager/handler.py"
  "amplify/functions/kb-document-manager/resource.ts"
  "amplify/custom/knowledge-base-stack.ts"
)

all_files_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (missing)"
    all_files_exist=false
  fi
done

echo ""

# Check GraphQL schema has KB operations
echo "📋 Checking GraphQL schema..."

kb_operations=(
  "uploadDocument"
  "searchDocuments"
  "listDocuments"
  "getDocument"
  "deleteDocument"
)

schema_file="amplify/data/resource.ts"
schema_ok=true

for operation in "${kb_operations[@]}"; do
  if grep -q "$operation" "$schema_file"; then
    echo -e "${GREEN}✓${NC} $operation defined"
  else
    echo -e "${RED}✗${NC} $operation missing"
    schema_ok=false
  fi
done

echo ""

# Check Lambda imports in data resource
echo "🔗 Checking Lambda function imports..."

lambda_imports=(
  "kbDocumentUpload"
  "kbSearch"
  "kbDocumentManager"
)

imports_ok=true
for import in "${lambda_imports[@]}"; do
  if grep -q "import.*$import.*from.*resource" "$schema_file"; then
    echo -e "${GREEN}✓${NC} $import imported"
  else
    echo -e "${RED}✗${NC} $import not imported"
    imports_ok=false
  fi
done

echo ""

# Check backend configuration
echo "⚙️  Checking backend configuration..."

backend_file="amplify/backend.ts"
backend_ok=true

# Check Lambda functions are in defineBackend
for lambda in "${lambda_imports[@]}"; do
  if grep -q "$lambda" "$backend_file"; then
    echo -e "${GREEN}✓${NC} $lambda in backend"
  else
    echo -e "${RED}✗${NC} $lambda missing from backend"
    backend_ok=false
  fi
done

echo ""

# Check environment variables are configured
echo "🌍 Checking environment variables..."

env_checks=(
  "kbDocumentUpload.addEnvironment.*DOCUMENT_BUCKET"
  "kbDocumentUpload.addEnvironment.*DOCUMENT_TABLE"
  "kbSearch.addEnvironment.*KNOWLEDGE_BASE_ID"
  "kbSearch.addEnvironment.*DOCUMENT_TABLE"
  "kbDocumentManager.addEnvironment.*DOCUMENT_BUCKET"
  "kbDocumentManager.addEnvironment.*DOCUMENT_TABLE"
  "kbDocumentManager.addEnvironment.*KNOWLEDGE_BASE_ID"
)

env_ok=true
for check in "${env_checks[@]}"; do
  if grep -q "$check" "$backend_file"; then
    echo -e "${GREEN}✓${NC} ${check//.*/ configured}"
  else
    echo -e "${RED}✗${NC} ${check//.*/ missing}"
    env_ok=false
  fi
done

echo ""

# Check IAM permissions
echo "🔐 Checking IAM permissions..."

permission_checks=(
  "grantDocumentUpload"
  "grantKnowledgeBaseQuery"
  "grantKnowledgeBaseSync"
  "grantReadWriteData"
)

permissions_ok=true
for check in "${permission_checks[@]}"; do
  if grep -q "$check" "$backend_file"; then
    echo -e "${GREEN}✓${NC} $check configured"
  else
    echo -e "${YELLOW}⚠${NC} $check not found (may be optional)"
  fi
done

echo ""

# Check custom types
echo "📦 Checking custom types..."

custom_types=(
  "UploadDocumentInput"
  "UploadDocumentResponse"
  "SearchFilters"
  "SearchResult"
  "SearchResponse"
  "DateRangeInput"
)

types_ok=true
for type in "${custom_types[@]}"; do
  if grep -q "$type.*customType" "$schema_file"; then
    echo -e "${GREEN}✓${NC} $type defined"
  else
    echo -e "${RED}✗${NC} $type missing"
    types_ok=false
  fi
done

echo ""

# Check authorization
echo "🔒 Checking authorization..."

if grep -q "authorization.*allow.authenticated()" "$schema_file"; then
  echo -e "${GREEN}✓${NC} Cognito authentication configured"
else
  echo -e "${RED}✗${NC} Cognito authentication missing"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$all_files_exist" = true ] && [ "$schema_ok" = true ] && [ "$imports_ok" = true ] && [ "$backend_ok" = true ] && [ "$env_ok" = true ] && [ "$types_ok" = true ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo "The Knowledge Base GraphQL resolvers are properly configured."
  echo ""
  echo "Next steps:"
  echo "1. Deploy the backend: npx ampx sandbox"
  echo "2. Test the GraphQL API using the queries in kb-test-graphql.md"
  echo "3. Implement React UI components (Tasks 11-13)"
  exit 0
else
  echo -e "${RED}✗ Some checks failed${NC}"
  echo ""
  echo "Please review the errors above and fix the configuration."
  exit 1
fi
