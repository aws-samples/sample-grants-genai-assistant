<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

# Knowledge Base Guide

## Overview

Your Knowledge Base is a personal library of research documents the AI uses to generate proposals. The more relevant your documents, the better your proposals will be. The Knowledge Base has four tabs: **Upload Documents**, **Grant Guidelines**, **My Documents**, and **Search**.

---

## Tab 1: Upload Documents

Use this tab to upload research content — papers, technical reports, reference materials, and other documents that support your proposals.

### How to Upload

1. Click **Choose File** and select a PDF or TXT file (max 10MB)
2. Select the **Agency** the document is associated with (e.g., NSF - National Science Foundation)
3. Select a **Content Category** (e.g., Reference Materials, Research Papers, Technical Docs)
4. Click **Upload Content Document**

### Supported formats
- PDF, TXT only (max 10MB)
- Word documents (.docx, .doc) are not supported in this tab — use File → Save As → PDF in Word before uploading

### How documents are used
- Documents are automatically processed and vectorized for semantic search
- At proposal time, only documents matching the grant's agency are retrieved
- Select the funding agency carefully — it controls which documents are used during proposal generation
- Processing typically takes 1-2 minutes depending on document size

---

## Tab 2: Grant Guidelines

Use this tab to upload official grant guidelines, templates, and writing tips. These are stored separately from content documents and are used for precise retrieval during proposal generation — particularly for the Guideline Adherence evaluation dimension.

### How to Upload

1. Click **Choose File** and select your guideline document
2. Supported formats: PDF, DOCX, DOC, TXT, MD (max 10MB) — note Word and Markdown are supported here but not in Upload Documents
3. Fill in **Document Metadata**:
   - **Funding Agency**: e.g., NIH - National Institutes of Health
   - **Grant Type**: e.g., R01
   - **Section/Topic**: e.g., Specific Aims
   - **Document Type**: e.g., Official Guidelines
   - **Year**: e.g., 2026
   - **Version** (optional): e.g., v1.0, Rev A
4. Tags are generated automatically from your metadata (e.g., NIH, R01, specific-aims, guidelines, 2026)
5. Click **Upload Grant Guideline**

### Why this matters
Uploading the official grant guidelines for your target agency is the single most effective way to improve your **Guideline Adherence** score. When the evaluator finds structured requirements in your documents, it performs a detailed analysis instead of falling back to heuristics.

---

## Tab 3: My Documents

View and manage all your uploaded documents.

### What you see
Each document shows:
- **File name**
- **Status badge**: ✅ Ready (document is processed and searchable) or processing
- **Category**: e.g., reference
- **Agency**: e.g., NSF
- **Size**: file size
- **Uploaded**: date and time
- **Searchable**: confirms the document is indexed and available for proposals

### Filtering
Use **Filter by Category** and **Filter by Agency** dropdowns to narrow the list.

### Deleting Documents
Click the **Delete** button on any document to remove it. Deleted documents cannot be recovered.

---

## Tab 4: Search

Search your knowledge base using natural language queries to find relevant content before generating a proposal.

### How to Search

1. Enter a natural language query (e.g., "thermal processing", "machine learning for healthcare")
2. Optionally filter by: Category, Agency, Grant Type, Section, Doc Type, Year
3. Click **Search** to find matching documents
4. Click **Show All Documents** to browse everything

### Search Tips (shown in the UI)
- Use natural language queries like "machine learning for healthcare"
- Search is semantic — it understands meaning, not just keywords
- Results are ranked by relevance to your query
- Filter by category to narrow your search
- Only documents with "ready" status are searchable

---

## Best Practices

### For better proposal quality
- Upload multiple diverse documents — avoid relying on a single file
- Include research papers, technical reports, and project descriptions
- Always upload the official grant guidelines in the **Grant Guidelines** tab before generating a proposal
- Tag documents with the correct agency — only agency-matched documents are retrieved at proposal time

### Document quality
- Detailed, well-structured documents produce better proposals
- Avoid very short documents (under 500 words) or files that are mostly images/tables
- Use descriptive file names

### Processing
- Documents typically take 1-2 minutes to process
- Wait for **✅ Ready** / **Searchable** status before generating a proposal
- If a document is stuck processing after 10 minutes, delete and re-upload

---

## Troubleshooting

### "Upload failed"
- Check file size (must be under 10MB)
- Verify file type is supported
- Ensure the file is not password-protected

### "Document not used in proposal"
- Verify the document's agency matches the grant's agency
- Confirm the document shows **Ready** / **Searchable** status
- Check that the document contains substantial relevant content

### "No results in Search"
- Try broader or different phrasing
- Verify documents are in **Ready** status
- Use **Show All Documents** to confirm documents exist

---

## Related Features

- **Proposal Generation**: Uses your knowledge base to create proposals
- **Evaluation Metrics**: Content Quality and Guideline Adherence scores are directly tied to your KB documents
- **Agent Discovery**: Finds grants matching your research profile
