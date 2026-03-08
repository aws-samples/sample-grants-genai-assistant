<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# First Login Guide

Complete guide for accessing the GROW2 application for the first time.

---

## Prerequisites

Before logging in, ensure:
- ✅ Deployment completed successfully
- ✅ Post-deployment seeder ran and completed
- ✅ You have the Amplify Hosting URL
- ✅ You have a smartphone with an authenticator app (or can install one)

---

## Step 1: Get the Application URL

The Amplify Hosting URL is created by the post-deployment seeder (CodeBuild project), not the initial CloudFormation deployment.

### Get URL from AWS Console

1. Go to **AWS Console** → **Amplify** → **All apps**
2. Click on your GROW2 application (name matches your stack)
3. Copy the **Domain** URL from the app overview

The URL will look like:
```
https://main.d1a2b3c4d5e6f7.amplifyapp.com
```

**Important:** If you don't see an Amplify app, verify the post-deployment seeder completed successfully.

---

## Step 2: Choose Your Login Method

You have two options for your first login:

### Option 1: Use Demo Account (Recommended for Testing)

The post-deployment seeder creates a demo account:

- **Username:** `test_user@example.com`
- **Password:** `Password123!`

This account is pre-configured with sample data and is ready to use immediately.

### Option 2: Create Your Own Account

1. Click **"Create account"** on the login page
2. Enter your email address
3. Create a strong password (minimum 8 characters)
4. Click **"Create Account"**
5. Check your email for a verification code
6. Enter the verification code to confirm your account

---

## Step 3: Set Up Multi-Factor Authentication (MFA)

⚠️ **IMPORTANT:** MFA setup is **required** for all users. You cannot access the application without completing this step.

### What You'll See

After entering your username and password, you'll see a **"Setup TOTP"** screen:

The screen displays:
- A QR code
- A long text code (backup if QR code doesn't work)
- A "Code" input field
- A "Confirm" button

### What is TOTP?

TOTP (Time-based One-Time Password) is a security method that generates temporary 6-digit codes on your smartphone. These codes change every 30 seconds and are required for login.

---

## Step 4: Install an Authenticator App

If you don't already have an authenticator app on your smartphone, install one:

### Recommended: Google Authenticator

**iOS (iPhone/iPad):**
1. Open the **App Store**
2. Search for **"Google Authenticator"**
3. Install the app by Google LLC

**Android:**
1. Open the **Google Play Store**
2. Search for **"Google Authenticator"**
3. Install the app by Google LLC

### Alternative Authenticator Apps

Any TOTP-compatible authenticator app will work:

- **Microsoft Authenticator** - Works with iOS and Android
- **Authy** - Cross-platform with cloud backup
- **1Password** - If you use 1Password password manager
- **Duo Mobile** - Enterprise-focused option
- **FreeOTP** - Open-source option

All of these apps work the same way with GROW2.

---

## Step 5: Scan the QR Code

### Using Google Authenticator:

1. Open **Google Authenticator** on your smartphone

2. Tap the **"+"** button (bottom right on iOS, top right on Android)

3. Select **"Scan a QR code"**

4. Point your camera at the QR code on the GROW2 screen

5. The app will automatically add GROW2 to your accounts

6. You'll see a 6-digit code that changes every 30 seconds

### If QR Code Doesn't Work:

1. In Google Authenticator, tap **"+"** → **"Enter a setup key"**

2. Enter an account name: `GROW2` (or any name you prefer)

3. Copy the long text code from the GROW2 screen (below the QR code)

4. Paste it into the **"Your key"** field

5. Ensure **"Time based"** is selected

6. Tap **"Add"**

---

## Step 6: Enter the Verification Code

1. Look at your authenticator app

2. Find the 6-digit code for GROW2

3. Type the code into the **"Code"** field on the GROW2 screen

4. Click **"Confirm"**

**Important:** The code changes every 30 seconds. If it doesn't work:
- Wait for a new code to appear
- Try the new code
- Make sure you're typing all 6 digits correctly

---

## Step 7: Access the Application

After confirming your MFA code, you'll be logged into GROW2!

### What You'll See:

**If using the demo account (`test_user@example.com`):**
- Pre-configured researcher profile
- Sample grant searches
- Demo data ready to explore

**If you created a new account:**
- Welcome screen
- Prompt to complete your researcher profile
- Empty dashboard (no searches yet)

---

## Step 8: Complete Your Researcher Profile (New Accounts Only)

If you created a new account, you'll need to set up your researcher profile:

1. Click **"Profile"** or **"Get Started"**

2. Fill in your information:
   - **Name** - Your full name
   - **Institution** - Your university or organization
   - **Research Interests** - Keywords describing your research
   - **Expertise Areas** - Your fields of study
   - **Career Stage** - Graduate student, postdoc, faculty, etc.

3. Click **"Save Profile"**

Your profile helps the AI agents find relevant grants for you.

---

## Future Logins

For all future logins, you'll need:

1. **Username** - Your email address
2. **Password** - Your account password
3. **MFA Code** - 6-digit code from your authenticator app

**Workflow:**
1. Open GROW2 URL
2. Enter username and password
3. Open authenticator app on your phone
4. Enter the current 6-digit code
5. Access granted!

---

## Troubleshooting

### "Invalid code" Error

**Cause:** Code expired or typed incorrectly

**Solution:**
- Wait for a new code to appear in your authenticator app
- Carefully type all 6 digits
- Don't include spaces
- Try again immediately (codes expire every 30 seconds)

### Lost Access to Authenticator App

**Cause:** Lost phone, deleted app, or switched devices

**Solution:**
1. Contact your AWS administrator
2. They can reset MFA in Amazon Cognito console
3. You'll need to set up MFA again with a new QR code

### Can't Scan QR Code

**Cause:** Camera issues or screen glare

**Solution:**
- Use the manual setup key (text code below QR code)
- Follow "If QR Code Doesn't Work" instructions above
- Ensure good lighting and steady camera

### Demo Account Not Working

**Cause:** Seeder didn't complete successfully

**Solution:**
1. Verify the post-deployment seeder completed
2. Check CodeBuild logs for errors
3. Re-run the seeder if needed
4. Or create a new account instead

### Application URL Not Loading

**Cause:** Deployment incomplete or DNS propagation

**Solution:**
1. Verify deployment completed successfully
2. Check Amplify console for app status
3. Wait 5-10 minutes for DNS propagation
4. Try a different browser or incognito mode
5. Clear browser cache

---

## Security Best Practices

### Protect Your MFA Device

- Keep your smartphone secure with a PIN/password
- Don't share your authenticator app
- Back up your phone regularly
- Consider using an authenticator app with cloud backup (like Authy)

### Password Security

- Use a unique password for GROW2
- Don't reuse passwords from other sites
- Consider using a password manager
- Change password if you suspect compromise

### Account Security

- Log out when using shared computers
- Don't share your credentials
- Report suspicious activity to your administrator
- Keep your email account secure (used for password reset)

---

## Next Steps: Getting Started with GROW2

Once logged in, here's how to get started:

### 1. Review the E2E Tests Documentation

The best way to learn GROW2 is through the **End-to-End User Workflow Tests**:

1. Look at the **left navigation panel** (blue sidebar)
2. Scroll down to **"E2E Tests Documentation"** (at the bottom)
3. Click to open the documentation

**What you'll find:**
- **Discovery → Profile Creation → Agent Setup** (Beginner) - Complete workflow for new users
- **Agent Discovery → Knowledge Base → Proposal Generation** (Intermediate) - Full automation workflow
- **Manual Search → Direct Proposal** (Beginner) - Quick response workflow
- **Profile Cloning → Multi-Region Agent Discovery** (Advanced) - Multiple projects workflow

Each workflow includes:
- Step-by-step instructions
- Expected time to complete
- Testing tips
- Real-world usage patterns

**💡 Tip:** Start with the "Discovery → Profile Creation → Agent Setup" workflow if you're new to GROW2.

### 2. Use the AI Chat Assistant

Have questions? Use the built-in AI chat assistant:

1. Look at the **bottom left corner** of the screen
2. Click the **blue chat button** (💬 icon)
3. Type your question and press Enter

**Example questions:**
- "How do I search for grants?"
- "How do I upload documents to the knowledge base?"
- "What's the difference between US and EU grants?"
- "How do I generate a proposal?"
- "How does agent discovery work?"

The chat assistant has access to all GROW2 documentation and can guide you through any feature.

### 3. Explore the Main Features

**Left Navigation Panel:**
- **User Profiles** - Manage researcher profiles
- **Search** - Natural language grant search
- **Proposals** - View and manage proposals
- **Knowledge Base** - Document library & search
- **Agent Config** - Autonomous agent configuration
- **Agent Selected Grants** - View discovery results

### 4. Try Your First Grant Search

1. Click **"Search"** in the left navigation
2. Enter a natural language query:
   - Example: "AI and machine learning grants for computer science"
   - Example: "Climate change research funding for postdocs"
3. Click **"Search"**
4. Review the results

### 5. Upload Documents to Knowledge Base

1. Click **"Knowledge Base"** in the left navigation
2. Click **"Upload Document"**
3. Select a PDF (research paper, CV, previous proposal)
4. The system will process and index the document
5. Documents are used to improve proposal generation

---

## Additional Resources

- [System Requirements](../prerequisites/SYSTEM_REQUIREMENTS.md) - Tool installation guide
- [AWS Credentials Setup](../deployment/AWS_CREDENTIALS.md) - Identity Center credentials
- [Updating the Stack](../maintenance/UPDATING.md) - Deploy updates
- [Troubleshooting Guide](../cleanup/TROUBLESHOOTING.md) - Common issues (coming soon)

---

**Last Updated:** February 4, 2026
