<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# Developing with Kiro AI Assistant

## What is Kiro?

Kiro is an AI-powered coding assistant that helps you understand, modify, and improve code. Think of it as having an expert developer pair-programming with you, available 24/7.

**Why use Kiro for GROW2 development?**
- Understand complex AWS infrastructure code quickly
- Get help debugging Lambda functions and GraphQL resolvers
- Learn Amplify Gen 2 patterns by example
- Refactor code safely with AI guidance
- Generate boilerplate code faster

## Getting Started with Kiro

### Installation

1. **Download Kiro:**
   - Visit [kiro.ai](https://kiro.ai) (or your organization's Kiro distribution)
   - Download for your operating system (Mac, Windows, Linux)
   - Install the application

2. **Sign in:**
   - Open Kiro
   - Sign in with your account
   - Grant necessary permissions

3. **Open GROW2 workspace:**
   ```bash
   # From terminal
   cd /path/to/GROW2
   kiro .
   
   # Or use File > Open Folder in Kiro
   ```

### First Steps

Once Kiro opens your GROW2 workspace:

1. **Let Kiro index the codebase** (takes 1-2 minutes)
2. **Try your first question:**
   - "Explain how the grants search works"
   - "Show me where user profiles are stored"
   - "How do I add a new Lambda function?"

## Using Kiro with GROW2

### Understanding the Architecture

**Ask Kiro to explain components:**

```
"Explain how the AgentCore stack works"
"What does the agent-discovery-stepfunction do?"
"Show me the flow from UI search to Lambda to DynamoDB"
```

**Kiro will:**
- Read relevant files
- Explain the architecture
- Show you code examples
- Draw connections between components

### Reviewing Code

**Before making changes, ask Kiro to review:**

```
"Review the grants-search-v2 Lambda function"
"Are there any security issues in the S3 bucket configuration?"
"Check if this function handles errors properly"
```

**Kiro can:**
- Identify potential bugs
- Suggest improvements
- Point out security concerns
- Recommend best practices

### Making Changes

**Let Kiro help you modify code:**

```
"Add a new field 'institution' to the UserProfile model"
"Create a Lambda function to send email notifications"
"Update the GraphQL schema to include proposal comments"
```

**Kiro will:**
1. Understand your request
2. Identify files to modify
3. Show you the changes
4. Explain why each change is needed
5. Update multiple files if necessary

**Example workflow:**

```
You: "I need to add a 'favoriteGrants' field to UserProfile that stores an array of grant IDs"

Kiro: "I'll help you add that field. This requires changes to:
1. amplify/data/resource.ts - Add the field to UserProfile model
2. react-aws/src/graphql/API.ts - Will be regenerated with new types

Let me make those changes..."

[Kiro modifies the files]

Kiro: "Done! Now run these commands to deploy:
1. ./installation/deploy-grow2-bootstrap.sh us-east-1
2. npx ampx generate graphql-client-code --out react-aws/src/graphql
3. cp amplify_outputs.json react-aws/amplify_outputs.json"
```

### Debugging Issues

**When something breaks, ask Kiro:**

```
"Why is my Lambda function timing out?"
"The GraphQL mutation is returning null, help me debug"
"I'm getting a 403 error when uploading to S3, what's wrong?"
```

**Kiro can:**
- Read CloudWatch logs
- Check IAM permissions
- Trace the execution flow
- Suggest fixes

**Example debugging session:**

```
You: "My proposal generation is failing with 'Agent not found' error"

Kiro: "Let me check the proposal-generation-agentcore Lambda...
[Reads handler code]

I see the issue. The Lambda is looking for AGENT_ID in environment variables,
but it's not set in backend.ts. Let me add it..."

[Kiro fixes the environment variable configuration]

Kiro: "Fixed! The AGENT_ID is now passed from the AgentCore stack."
```

### Adding Features

**Describe what you want to build:**

```
"Add a feature to let users save grant searches"
"Create an API endpoint to export proposals as PDF"
"Implement email notifications when agent discovery finds new grants"
```

**Kiro will:**
1. Break down the feature into steps
2. Identify required components (Lambda, DynamoDB, GraphQL, etc.)
3. Generate the code
4. Explain how to test it

### Learning Patterns

**Ask Kiro to teach you:**

```
"How do I connect a Lambda function to GraphQL?"
"Show me how to add IAM permissions to a Lambda"
"What's the pattern for creating custom CDK stacks?"
"How does Amplify Gen 2 handle authentication?"
```

**Kiro becomes your tutor:**
- Explains concepts clearly
- Shows real examples from GROW2
- Teaches best practices
- Answers follow-up questions

## Kiro Best Practices

### 1. Be Specific

❌ **Vague:** "Fix the search"
✅ **Specific:** "The EU grants search Lambda is returning empty results. Check the handler.py file and the AppSync resolver."

### 2. Provide Context

❌ **No context:** "Add a field"
✅ **With context:** "Add a 'lastLoginDate' field to UserProfile model. It should be a datetime and automatically update on each login."

### 3. Ask for Explanations

```
"Explain why you made that change"
"What are the security implications?"
"Are there any edge cases I should test?"
```

### 4. Review Before Applying

- Always review Kiro's suggested changes
- Understand what each change does
- Test thoroughly after applying changes

### 5. Use Kiro for Documentation

```
"Document this Lambda function"
"Add comments explaining the Bayesian matching algorithm"
"Create a README for the custom CDK stacks"
```

## Common GROW2 Tasks with Kiro

### Task 1: Add a New GraphQL Query

```
You: "Create a GraphQL query to get all proposals for a specific grant ID"

Kiro: [Modifies amplify/data/resource.ts]
      [Creates/updates Lambda function]
      [Explains how to test]
```

### Task 2: Debug CloudWatch Logs

```
You: "Show me the latest errors from the grants-search-v2 Lambda"

Kiro: [Reads CloudWatch logs]
      [Identifies the error]
      [Suggests a fix]
```

### Task 3: Update IAM Permissions

```
You: "The KB upload Lambda needs S3 PutObject permission"

Kiro: [Finds the Lambda in backend.ts]
      [Adds the IAM policy statement]
      [Explains the change]
```

### Task 4: Refactor Code

```
You: "This function is too long. Help me refactor it into smaller functions"

Kiro: [Analyzes the code]
      [Suggests a refactoring plan]
      [Implements the changes]
      [Ensures tests still pass]
```

### Task 5: Understand Error Messages

```
You: "I'm getting 'ValidationException: 1 validation error detected' from DynamoDB"

Kiro: [Reads the error context]
      [Checks the DynamoDB schema]
      [Identifies the missing required field]
      [Shows you how to fix it]
```

## Advanced Kiro Features

### Multi-File Edits

Kiro can modify multiple files simultaneously:

```
You: "Add a 'tags' feature to proposals - users should be able to add/remove tags"

Kiro: "This requires changes to:
1. amplify/data/resource.ts - Add tags field to Proposal model
2. amplify/functions/proposals-query/handler.ts - Add tag filtering
3. react-aws/src/components/ProposalCard.tsx - Display tags
4. react-aws/src/components/ProposalEditor.tsx - Edit tags

Making changes..."
```

### Code Generation

Generate boilerplate code quickly:

```
"Generate a Lambda function that sends SNS notifications"
"Create a DynamoDB table for storing user preferences"
"Generate TypeScript types for the EU grants API response"
```

### Testing Assistance

```
"Write unit tests for the Bayesian matching algorithm"
"Create integration tests for the proposal generation flow"
"Generate test data for user profiles"
```

### Security Reviews

```
"Review all Lambda functions for security issues"
"Check if S3 buckets have proper encryption"
"Audit IAM policies for overly permissive wildcards"
```

## Tips for Maximum Productivity

### 1. Use Kiro for Onboarding

New to GROW2? Start with:
```
"Give me an overview of the GROW2 architecture"
"Explain the main components and how they interact"
"What are the key files I should understand first?"
```

### 2. Keep Kiro in the Loop

When working on a feature:
```
"I'm about to add email notifications. What do I need to consider?"
[Kiro suggests: SES setup, Lambda function, DynamoDB table, error handling]

"Okay, let's start with the Lambda function"
[Kiro creates the function]

"Now add the DynamoDB table"
[Kiro adds the table]
```

### 3. Use Kiro for Code Reviews

Before committing:
```
"Review my changes to the grants search Lambda"
"Check if I'm following GROW2 coding standards"
"Are there any potential bugs in this code?"
```

### 4. Learn by Doing

```
"I want to learn how Step Functions work. Show me the agent-discovery-stepfunction and explain it"
"Teach me how to use Bedrock AgentCore by walking through an example"
```

### 5. Automate Repetitive Tasks

```
"Create a script to deploy and test my changes"
"Generate a changelog from my recent commits"
"Update all Lambda function timeouts to 15 minutes"
```

## Troubleshooting Kiro

### Kiro doesn't understand my question

- Be more specific
- Provide file names or component names
- Break complex questions into smaller parts

### Kiro's suggestions don't work

- Review the changes carefully
- Check if Kiro has the latest code
- Ask Kiro to explain the reasoning
- Provide error messages for debugging

### Kiro is slow

- Large codebases take time to index
- Complex questions require more processing
- Break down requests into smaller tasks

## Getting Help

### Within Kiro

```
"How do I use Kiro to debug Lambda functions?"
"What Kiro commands are available?"
"Show me Kiro best practices"
```

### GROW2-Specific Help

```
"Where is the documentation for the grants search API?"
"How do I run the deployment script?"
"What's the process for updating the GraphQL schema?"
```

### Community Resources

- Kiro documentation: [kiro.ai/docs](https://kiro.ai/docs)
- GROW2 documentation: See `install_docs/` directory
- Ask your team members who use Kiro

## Why Teams Love Kiro

### Faster Onboarding

New developers understand GROW2 in hours, not weeks.

### Consistent Code Quality

Kiro helps maintain coding standards across the team.

### Reduced Context Switching

Get answers without leaving your editor.

### Knowledge Sharing

Kiro learns from your codebase and shares that knowledge with everyone.

### Less Time Debugging

Kiro helps identify issues faster with AI-powered analysis.

## Start Using Kiro Today

1. **Install Kiro** - Download from [kiro.ai](https://kiro.ai)
2. **Open GROW2** - Let Kiro index the codebase
3. **Ask your first question** - "Explain the GROW2 architecture"
4. **Start building** - Use Kiro for your next feature

**Remember:** Kiro is a tool to enhance your productivity, not replace your expertise. Always review and understand the code Kiro generates.

---

**Last Updated:** February 4, 2026

**Questions?** Ask Kiro: "How can I get better at using Kiro with GROW2?"
