# GROW2 Installation Scripts

Essential scripts for deploying and managing the GROW2 platform.

## Scripts

### deploy-grow2-bootstrap.sh
Deploys the GROW2 platform to a specified region.

Usage: ./deploy-grow2-bootstrap.sh <region>

### delete-grow2.sh  
Deletes ALL GROW2 resources from a specified region.

Usage: ./delete-grow2.sh <region>

⚠️ WARNING: This will delete ALL resources!

### check-prerequisites.sh
Checks required tools (automatically run by deploy script).

## Quick Start

1. Deploy: ./deploy-grow2-bootstrap.sh us-east-2
2. Delete: ./delete-grow2.sh us-east-2
