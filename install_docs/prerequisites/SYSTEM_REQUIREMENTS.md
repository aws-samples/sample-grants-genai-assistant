<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# System Requirements

Complete prerequisites for deploying GROW2 on macOS, Linux, or Windows.

---

## AWS Account Requirements

Before deploying, your AWS account must have:

- **AdministratorAccess** permission set via IAM Identity Center (required — deployment creates IAM roles, CloudFormation stacks, Bedrock agents, and networking resources)
- Access to the AWS access portal (e.g. `https://your-org.awsapps.com/start`)

**Preferred method for credentials:** Log into your Identity Center access portal, find your account, confirm it shows **AWSAdministratorAccess**, then click **"Access keys"** to get temporary environment variable credentials. See [AWS Credentials Setup](../deployment/AWS_CREDENTIALS.md) for the full walkthrough.

> **Note:** If you don't see AWSAdministratorAccess on your account, contact your AWS administrator before attempting deployment.

---

## Hardware Requirements

- **Disk Space:** 50GB+ free (for Docker images, npm packages, build artifacts)
- **RAM:** 8GB minimum, 16GB recommended
- **CPU:** Multi-core processor (deployment involves parallel builds)
- **Internet:** Stable broadband connection (downloading packages and Docker images)

---

## Software Requirements Summary

| Tool | Minimum Version | Recommended | Purpose |
|------|----------------|-------------|---------|
| **Docker Desktop** | Latest | Latest | AgentCore agent containers |
| **Node.js** | 20.x | 20.x LTS | Amplify Gen 2, React build |
| **npm** | 10.x | Latest | Package management |
| **Python** | 3.12 | 3.13 | Lambda functions, scripts |
| **AWS CLI** | 2.x | Latest | AWS resource management |
| **Git** | 2.x | Latest | Clone repository |

> **Note:** Node.js 18 reaches End of Life in April 2025. Use Node.js 20 or later.

---

## Operating System Specific Instructions

Choose your operating system:
- [macOS](#macos-installation)
- [Linux (Ubuntu/Debian)](#linux-ubuntudebian-installation)
- [Linux (Amazon Linux 2023)](#linux-amazon-linux-2023-installation)
- [Windows](#windows-installation)

---

## macOS Installation

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Docker Desktop

**Option A: Download from website (recommended)**
1. Go to [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Download and install Docker Desktop
3. Open Docker Desktop and complete setup
4. Verify Docker is running (whale icon in menu bar)

**Option B: Install via Homebrew**
```bash
brew install --cask docker
# Open Docker Desktop from Applications folder
```

**Verify Docker:**
```bash
docker --version
# Expected: Docker version 24.x or later

docker ps
# Expected: Empty list (no error)
```

### 3. Install Node.js 20

```bash
# Install Node.js 20 LTS
brew install node@20

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
node --version
# Expected: v20.x.x

npm --version
# Expected: 10.x.x
```

### 4. Install Python 3.12+

```bash
# Install Python 3.13 (latest)
brew install python@3.13

# Verify
python3 --version
# Expected: Python 3.13.x

# Create alias (optional, add to ~/.zshrc)
echo 'alias python=python3' >> ~/.zshrc
echo 'alias pip=pip3' >> ~/.zshrc
source ~/.zshrc
```

### 5. Install AWS CLI v2

```bash
# Download and install
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Verify
aws --version
# Expected: aws-cli/2.x.x
```

### 6. Install Git (usually pre-installed)

```bash
# Check if installed
git --version

# If not installed
brew install git
```

### 7. Verify All Tools

```bash
# Run verification script
docker --version && \
node --version && \
npm --version && \
python3 --version && \
aws --version && \
git --version

# All commands should succeed
```

---

## Linux (Ubuntu/Debian) Installation

### 1. Update Package Manager

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
# Or run: newgrp docker

# Verify
docker --version
docker ps
```

### 3. Install Node.js 20

```bash
# Install Node.js 20 from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
# Expected: v20.x.x

npm --version
# Expected: 10.x.x
```

### 4. Install Python 3.12+

```bash
# Ubuntu 24.04+ has Python 3.12 by default
python3 --version

# If older version, install Python 3.12
sudo apt install -y python3.12 python3.12-venv python3-pip

# Verify
python3 --version
# Expected: Python 3.12.x or 3.13.x
```

### 5. Install AWS CLI v2

```bash
# Download and install
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
# Expected: aws-cli/2.x.x
```

### 6. Install Git

```bash
sudo apt install -y git

# Verify
git --version
```

### 7. Verify All Tools

```bash
docker --version && \
node --version && \
npm --version && \
python3 --version && \
aws --version && \
git --version
```

---

## Linux (Amazon Linux 2023) Installation

### 1. Update System

```bash
sudo dnf update -y
```

### 2. Install Docker

```bash
# Install Docker
sudo dnf install -y docker

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Verify
docker --version
docker ps
```

### 3. Install Node.js 20

```bash
# Install Node.js 20 from NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify
node --version
npm --version
```

### 4. Install Python 3.12+

```bash
# Amazon Linux 2023 includes Python 3.9 by default
# Install Python 3.12
sudo dnf install -y python3.12 python3.12-pip

# Verify
python3.12 --version
```

### 5. Install AWS CLI v2

```bash
# Download and install
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
```

### 6. Install Git

```bash
sudo dnf install -y git

# Verify
git --version
```

---

## Windows Installation

### 1. Install WSL2 (Windows Subsystem for Linux) - Recommended

**Why WSL2?**
- Better compatibility with Linux-based tools
- Faster file system performance
- Native Docker integration

**Install WSL2:**
```powershell
# Open PowerShell as Administrator
wsl --install

# Restart computer when prompted
# After restart, set up Ubuntu username/password
```

**After WSL2 is installed, follow the [Linux (Ubuntu/Debian)](#linux-ubuntudebian-installation) instructions inside WSL2.**

### 2. Install Docker Desktop for Windows

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Run installer
3. During installation, ensure **"Use WSL 2 instead of Hyper-V"** is checked
4. Restart computer
5. Open Docker Desktop
6. Go to Settings → General → Ensure "Use the WSL 2 based engine" is checked
7. Go to Settings → Resources → WSL Integration → Enable for your Ubuntu distribution

**Verify Docker (in WSL2 terminal):**
```bash
docker --version
docker ps
```

### 3. Install Node.js 20 (in WSL2)

```bash
# Inside WSL2 Ubuntu terminal
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

### 4. Install Python 3.12+ (in WSL2)

```bash
# Inside WSL2 Ubuntu terminal
sudo apt install -y python3.12 python3.12-venv python3-pip

# Verify
python3 --version
```

### 5. Install AWS CLI v2 (in WSL2)

```bash
# Inside WSL2 Ubuntu terminal
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
```

### 6. Install Git (in WSL2)

```bash
sudo apt install -y git

# Verify
git --version
```

### Alternative: Native Windows Installation (Not Recommended)

If you cannot use WSL2, you can install tools natively on Windows:

- **Docker Desktop:** Same as above (uses Hyper-V instead of WSL2)
- **Node.js:** Download from [nodejs.org](https://nodejs.org/)
- **Python:** Download from [python.org](https://www.python.org/)
- **AWS CLI:** Download from [AWS CLI installer](https://awscli.amazonaws.com/AWSCLIV2.msi)
- **Git:** Download from [git-scm.com](https://git-scm.com/)

> **Note:** Native Windows installation may have compatibility issues with some scripts. WSL2 is strongly recommended.

---

## Post-Installation Verification

### Check All Tools

Run this verification script for your OS:

**macOS / Linux / WSL2:**
```bash
echo "=== System Requirements Check ==="
echo ""
echo "Docker:"
docker --version && docker ps > /dev/null 2>&1 && echo "✅ Docker is running" || echo "❌ Docker not running"
echo ""
echo "Node.js:"
node --version | grep -q "v20" && echo "✅ Node.js 20.x" || echo "❌ Wrong Node.js version"
echo ""
echo "npm:"
npm --version && echo "✅ npm installed"
echo ""
echo "Python:"
python3 --version | grep -qE "3\.(12|13)" && echo "✅ Python 3.12+" || echo "❌ Python version too old"
echo ""
echo "AWS CLI:"
aws --version | grep -q "aws-cli/2" && echo "✅ AWS CLI v2" || echo "❌ AWS CLI v1 or not installed"
echo ""
echo "Git:"
git --version && echo "✅ Git installed"
echo ""
echo "Disk Space:"
df -h . | tail -1 | awk '{print "Available: " $4}'
```

### Expected Output

```
=== System Requirements Check ===

Docker:
✅ Docker is running

Node.js:
✅ Node.js 20.x

npm:
✅ npm installed

Python:
✅ Python 3.12+

AWS CLI:
✅ AWS CLI v2

Git:
✅ Git installed

Disk Space:
Available: 120G
```

---

## Troubleshooting

### Docker Not Running

**macOS:**
- Open Docker Desktop from Applications
- Wait for whale icon to appear in menu bar
- Click icon → ensure "Docker Desktop is running"

**Linux:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

**Windows/WSL2:**
- Open Docker Desktop on Windows
- Ensure WSL2 integration is enabled in Settings

### Node.js Wrong Version

```bash
# Check current version
node --version

# If wrong version, reinstall Node.js 20 following OS-specific instructions above
```

### Python Version Too Old

```bash
# Check version
python3 --version

# Install Python 3.12+ following OS-specific instructions above
```

### AWS CLI v1 Instead of v2

```bash
# Uninstall v1
pip uninstall awscli

# Install v2 following OS-specific instructions above
```

### Permission Denied (Docker)

**Linux:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

---

## Next Steps

Once all tools are installed and verified:

1. ✅ All tools installed and verified
2. ✅ Docker is running
3. ✅ 50GB+ disk space available
4. → Need help with Identity Center accounts? See [AWS IAM Identity Center - Manage Your Accounts](https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-accounts.html)

---

**Last Updated:** February 4, 2026
