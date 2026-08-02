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
- Status messages (e.g., "Initializing proposal generation...", "Generating Implementation...")
- **Status: QUEUED → PROCESSING → COMPLETE**
- **Real-time updates: 🟢 Connected** — confirms the live connection is active

Generation writes each section separately (retrieving section-specific content from your knowledge base, generating with Claude, then scoring how well the section is backed by your documents), converts the result to PDF, and runs a full quality evaluation — so a 3-section proposal typically takes 5-10 minutes end to end. Stay in the browser tab until complete.

### Step 5: View and Download

1. Go to **Proposals** section
2. Find your proposal in the list
3. View the Semantic Search, Grounded, and Quality badges (see below)
4. Download as HTML or PDF

---

## Supported Agencies

The system uses agency-specific AI prompts tailored to each funder's requirements and style. There are 21 prompts across 7 agencies, each covering that agency's key proposal sections:

| Agency | Prompt Sections |
|--------|----------------|
| NSF | Intellectual Merit, Broader Impacts, Implementation |
| NIH | Significance & Innovation, Approach, Environment & Resources |
| DOD | Technical Approach, Military Relevance, Execution Plan |
| DOE | Scientific Objectives, Technical Approach, Impact & Outcomes |
| NASA | Scientific/Technical Plan, NASA Relevance, Work Plan |
| DOT | Project Narrative, Merit Criteria, Project Readiness |
| European Commission | Excellence, Impact, Implementation (Horizon Europe) |

For grants from other agencies, generation will fail with a message naming the supported agencies above — there's no generic fallback prompt.

The prompts are visible (and testable) in the **Prompts** tab of the Proposals section. Actual editing of prompt text happens in the AWS Bedrock console — see the [Prompt Management Guide](prompt-management-guide.md) for details on adding or updating a prompt.

---

## How Prompts Work

Each prompt uses two variables filled in automatically at generation time:

- **`{{content}}`** — content retrieved from your knowledge base for that specific section (not the same block reused for every section — Implementation gets different excerpts than Broader Impacts, for example)
- **`{{grant_info}}`** — the grant's title, agency, deadline, description, and other attributes from the search result

**The prompts already contain agency-specific proposal writing guidelines built in** — you don't need to upload general agency guidelines to get a well-structured proposal. However, uploading the specific grant's RFP or solicitation document to the **Grant Guidelines** tab in Knowledge Base will further improve the **Guideline Adherence** evaluation score by giving the evaluator more to check the proposal against.

Every prompt also instructs the AI to mark any sentence, figure, or claim that isn't drawn from your documents with **`[Not sourced from your documents]`** — common in budget figures, timelines, or illustrative statistics that a real proposal needs but that your source material doesn't supply. This is what the **Grounded** badge (see below) measures.

---

## Understanding Proposal Status

| Status | Meaning |
|--------|---------|
| QUEUED | Waiting to start |
| PROCESSING | AI is generating the proposal |
| COMPLETE | Ready to view and download |
| FAILED | Generation encountered an error |

---

## Understanding the Proposal Badges

Each completed proposal shows up to three badges:

- **⚡ Semantic: [level]** — how relevant your knowledge base documents were to this grant, based on retrieval scores (e.g., MODERATE, GOOD, EXCELLENT)
- **❓ Grounded: [%]** — what share of the generated text is actually backed by your documents rather than generic/illustrative filler tagged `[Not sourced from your documents]`. Sections like Implementation legitimately score lower here since budget, timeline, and personnel details often aren't in your source material by design — this isn't necessarily a problem to fix.
- **📊 Quality: [grade] ([%])** — the full 4-dimension evaluation grade (see below). Click it to open the detailed breakdown.

If the Quality badge is missing after a proposal completes, the evaluation step didn't finish in time or failed — the proposal itself is still valid, just without a scored breakdown. Try again, or check with support if it happens repeatedly.

## Understanding Quality Scores

Every proposal is automatically evaluated across 4 dimensions:

- **Content Quality (30%)**: How well your KB documents matched the grant, based on semantic search scores
- **Guideline Adherence (40%)**: Each proposal section evaluated individually against the guidelines that generated it
- **Completeness (20%)**: Whether all expected sections are present with adequate word counts
- **Source Utilization (10%)**: How many document chunks were used and how relevant they were

**Grades:** A (93%+), A- (90%+), B+ (87%+), B (83%+), B- (80%+), C+ (77%+), C (73%+), C- (70%+), D+ (67%+), D (63%+), D- (60%+), F (below 60%)

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
- **Prompt Management**: How to view, test, and edit the AI prompts used for generation
- **Agent Discovery**: Find relevant grants automatically
- **Grant Search**: Search for grants to generate proposals for
