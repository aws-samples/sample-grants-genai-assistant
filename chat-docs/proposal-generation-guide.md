<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

# Proposal Generation Guide

## Overview

The platform generates AI-powered grant proposals by combining your knowledge base documents with the grant's requirements. You can start from a grant found via **Grant Search** or from **Agent Selected Grants** — the flow is the same either way.

---

## How to Generate a Proposal

### Step 1: Select a Grant

1. Go to **Grant Search** or **Agent Selected Grants**
2. Find a grant you want to apply for
3. Click **Generate Proposal** on the grant card

The grant detail panel opens showing available information: Opportunity Title, Agency, Deadline, Source, Opportunity ID, and any available Award Ceiling/Floor. Some fields may show "Not Available (requires detailed fetch)" — this is normal for grants where full details haven't been retrieved yet.

### Step 2: Choose How to Select Documents

A **Select Knowledge Base Documents** dialog appears with two options:

**Manual Selection**
- Search and select specific documents for content and guidelines
- Gives you full control over source material
- Lets you mix documents from different agencies
- Best when you know exactly which documents are most relevant

**Automatic Search**
- Automatically finds relevant documents based on the grant's agency
- Quick and convenient for standard proposals
- Agency-matched and comprehensive

### Step 3: Select Documents (Manual Selection path)

If you chose Manual Selection, the document picker opens showing:

- **Token Usage bar**: Shows how many tokens your selected documents will use (e.g., 7,000 / 168,000). Keep this in the green "within safe limits" zone
- **Tabs**: All Documents, Content, Guidelines — filter by document type
- **Search**: Find documents by name or content (e.g., "NSF proposal guidelines")
- **Agency filter**: Narrow to a specific agency
- **Select button**: Click to add a document to your selection
- **Continue with X documents**: Proceed once you've selected what you need

You can continue with 0 documents selected if you want the AI to work from the grant description alone, but results will be better with relevant documents.

### Step 4: Wait for Generation

After confirming document selection, the **Proposal Generation Progress** panel shows:

- A progress bar
- Status messages (e.g., "Initializing proposal generation...")
- **Status: QUEUED → PROCESSING → COMPLETE**
- **Real-time updates: 🟢 Connected** — confirms the live connection is active

Generation typically takes 2-5 minutes. Stay in the browser tab until complete.

### Step 5: View and Download

1. Go to **Proposals** section
2. Find your proposal in the list
3. View the quality score and evaluation breakdown
4. Download as HTML or PDF

---

## Supported Agencies

The system uses agency-specific AI prompts tailored to each funder's requirements and style. There are 10 prompts covering each agency's key proposal sections:

| Agency | Prompt Sections |
|--------|----------------|
| NIH | Approach, Significance & Innovation, Environment & Resources |
| NSF | Intellectual Merit, Broader Impacts, Implementation |
| DOD | Technical Approach, Military Relevance, Execution Plan |
| European Commission | Implementation (Horizon Europe) |

For grants from other agencies, the system uses a general proposal prompt.

The prompts are visible in the **Prompts** tab of the Proposals section and can be edited via **Edit in AWS Console** if you want to customize the writing style or emphasis.

---

## How Prompts Work

Each prompt uses three variables filled in automatically at generation time:

- **`{{content}}`** — your knowledge base documents (selected manually or automatically)
- **`{{guidelines}}`** — any Grant Guidelines documents you uploaded to the KB for that agency
- **`{{grant_info}}`** — the grant's title, agency, deadline, description, and other attributes from the search result

**The prompts already contain agency-specific proposal writing guidelines built in** — you don't need to upload general agency guidelines to get a well-structured proposal. However, uploading the specific grant's RFP or solicitation document to the **Grant Guidelines** tab in Knowledge Base will further improve the **Guideline Adherence** evaluation score by giving the evaluator structured requirements to check against.

---

## Understanding Proposal Status

| Status | Meaning |
|--------|---------|
| QUEUED | Waiting to start |
| PROCESSING | AI is generating the proposal |
| COMPLETE | Ready to view and download |
| FAILED | Generation encountered an error |

---

## Understanding Quality Scores

Every proposal is automatically evaluated across 4 dimensions:

- **Content Quality (30%)**: How well your KB documents matched the grant
- **Guideline Adherence (40%)**: How well the proposal follows grant requirements
- **Completeness (20%)**: Whether all expected sections are present
- **Source Utilization (10%)**: How diverse your source documents were

**Grades:** A (90-100%), B (80-89%), C (70-79%), D (60-69%), F (<60%)

See the [Evaluation Metrics Guide](evaluation-metrics-guide.md) for full details.

---

## Tips for Better Proposals

- Upload the specific grant's RFP or solicitation to the **Grant Guidelines** tab in Knowledge Base before generating — biggest single improvement for quality scores
- Tag your documents with the correct agency so Automatic Search retrieves the right content
- Use Manual Selection when you have specific documents that must be included
- Watch the Token Usage bar — staying well under the limit ensures all selected documents are used

---

## Troubleshooting

### "No documents found"
- Upload documents to Knowledge Base first and wait for **Ready** status
- Check documents are tagged with the correct agency

### "Generation failed"
- Ensure the grant has a description
- Try Automatic Search if Manual Selection returned no documents
- Retry — transient errors occasionally occur

### "PDF download link expired"
- Links expire after 7 days — click the **Refresh** button to generate a new URL

### Low quality scores
- Upload more relevant documents to your knowledge base
- Upload the specific grant RFP to the Grant Guidelines tab
- See the [Evaluation Metrics Guide](evaluation-metrics-guide.md) for dimension-specific tips

---

## Related Features

- **Knowledge Base**: Upload and manage your research documents
- **Evaluation Metrics**: Understand your proposal quality scores
- **Agent Discovery**: Find relevant grants automatically
- **Grant Search**: Search for grants to generate proposals for
