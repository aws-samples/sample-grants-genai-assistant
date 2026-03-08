<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../README.md)

# GROW2 Installation Guide

Complete guide for deploying the GROW2 Grant Matchmaking platform on AWS.

## Quick Links

### Getting Started
- [System Requirements](prerequisites/SYSTEM_REQUIREMENTS.md) - OS-specific tool installation (Docker, Node.js, Python, AWS CLI)

### Deployment
- [AWS Credentials Setup](deployment/AWS_CREDENTIALS.md) - Get temporary credentials from Identity Center

### Using the System
- [First Login](usage/FIRST_LOGIN.md) - Accessing the web interface, MFA setup, and getting started

### Maintenance
- [Updating the Stack](maintenance/UPDATING.md) - Deploy updates to backend or UI
- [Monitoring](maintenance/MONITORING.md) - CloudWatch logs and metrics (coming soon)

### Cleanup
- [Troubleshooting](cleanup/TROUBLESHOOTING.md) - Common issues and solutions (coming soon)

---

## Overview

GROW2 is an AWS-based grant matchmaking platform that uses:
- **Amazon Bedrock AgentCore** - AI agents for grant search and proposal generation
- **AWS Amplify Gen 2** - Backend infrastructure and authentication
- **OpenSearch Serverless** - Vector search for knowledge base
- **React** - Modern web interface

**Deployment Time:** 45-60 minutes  
**Cost:** ~$50-100/month (varies by usage)  
**Regions:** us-east-1, us-west-2 (Bedrock model availability)

---

## Prerequisites Summary

Before deploying, ensure you have:

✅ **AWS Account** with AdministratorAccess via Identity Center  
✅ **Local Machine** with 50GB+ free disk space  
✅ **Docker Desktop** installed and running  
✅ **Node.js 20+** installed  
✅ **Python 3.12+** installed  
✅ **AWS CLI v2+** installed  

See [System Requirements](prerequisites/SYSTEM_REQUIREMENTS.md) for detailed OS-specific instructions.

---

## Quick Start (5 Steps)

1. **Get AWS Credentials** - [Follow this guide](deployment/AWS_CREDENTIALS.md)
   ```bash
   # Copy credentials from Identity Center and paste in terminal
   export AWS_ACCESS_KEY_ID="..."
   export AWS_SECRET_ACCESS_KEY="..."
   export AWS_SESSION_TOKEN="..."
   ```

2. **Verify Credentials**
   ```bash
   aws sts get-caller-identity
   ```

3. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd GROW2
   ```

4. **Run Deployment Script**
   ```bash
   ./installation/deploy-grow2-bootstrap.sh us-east-1
   ```

5. **Access Application**
   - URL will be displayed at end of deployment
   - Create your first user account
   - Set up your researcher profile

---

## What Gets Deployed

### Backend Infrastructure
- **Authentication:** Cognito User Pool with email/password
- **API:** AppSync GraphQL API for real-time data
- **Database:** DynamoDB tables for profiles, grants, proposals
- **Storage:** S3 buckets for documents, EU cache, proposals
- **Search:** OpenSearch Serverless collection for vector search
- **Knowledge Base:** Bedrock Knowledge Base for document retrieval

### AI Agents (Bedrock AgentCore)
- **US Grants Search Agent** - Searches grants.gov
- **EU Grants Search Agent** - Searches EU funding opportunities
- **Proposal Generation Agent** - Creates grant proposals
- **PDF Converter Agent** - Converts documents to text
- **Proposal Evaluator Agent** - Scores proposal quality

### Automation
- **Agent Discovery Workflow** - Step Functions for nightly grant searches
- **EU Cache Downloader** - EventBridge schedule for EU data sync
- **Post-Deployment Seeder** - CodeBuild project for demo data

### Frontend
- **React Application** - Hosted on Amplify Hosting
- **Real-time Updates** - AppSync subscriptions for live data

---

## Support

- **Issues:** Use GitHub Issues for bugs and feature requests
- **Documentation:** See individual guides in this directory
- **AWS Support:** Contact your AWS Solutions Architect for deployment assistance

---

## Security Notes

⚠️ **This is sample code for non-production usage**
- Deploy in a dedicated AWS account with no other resources
- Review with your security and legal teams before production use
- All resources will incur AWS costs
- Deletion script removes all resources (data loss is permanent)

---

## Next Steps

1. Review [System Requirements](prerequisites/SYSTEM_REQUIREMENTS.md)
2. Set up [AWS Credentials](deployment/AWS_CREDENTIALS.md)
3. Run [Quick Start Deployment](../../README.md#quick-start-deployment)

---

**Last Updated:** February 4, 2026  
**Version:** 2.0
