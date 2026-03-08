<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

# Proposal Evaluation Metrics Guide

## Overview

Every generated proposal is automatically evaluated by an AI agent that assesses quality across 4 key dimensions. The result is an overall grade (A–F), a confidence level, and a detailed breakdown with strengths, weaknesses, and recommendations.

## The 4 Evaluation Dimensions

### 1. Content Quality (30% of total score)

**What it measures:** How well your knowledge base documents matched the grant requirements.

Measures semantic similarity between the grant description and your uploaded documents. Higher scores mean your documents are more relevant to the grant topic.

**Score ranges:**
- 90-100%: Excellent — documents are highly relevant
- 80-89%: Good — documents cover most requirements
- 70-79%: Fair — some relevant content found
- 60-69%: Weak — limited relevant content
- <60%: Poor — documents don't align well with the grant

**How to improve:** Upload more documents directly related to the grant topic — research papers, technical reports, and project descriptions all help. The semantic score shown (e.g., "avg: 0.43") reflects how closely your documents matched; scores above 0.6 are strong.

---

### 2. Guideline Adherence (40% of total score)

**What it measures:** How well the proposal follows the grant's specific requirements and structure.

**Important:** You may see "Unable to perform detailed analysis. Using heuristic evaluation." — this is expected behavior, not a bug. The evaluator attempts to extract structured requirements from the grant description. When the grant prompt doesn't contain formal numbered requirements or a structured RFP format, the evaluator falls back to a heuristic approach (checking general proposal structure, tone, and completeness). The score is still valid — it just reflects a less granular analysis.

**Score ranges:**
- 90-100%: Excellent — follows all guidelines
- 80-89%: Good — minor deviations only
- 70-79%: Fair — some requirements missed
- 60-69%: Weak — several issues found
- <60%: Poor — significant problems

**How to improve:** Include the grant's official guidelines or RFP document in your knowledge base before generating. When the evaluator finds structured requirements in your documents, it can perform a detailed analysis instead of falling back to heuristics.

---

### 3. Completeness (20% of total score)

**What it measures:** Whether the proposal contains all expected sections with adequate detail.

Checks the number of distinct sections and total word count. The evaluation output shows both (e.g., "3 sections with 10,007 total words").

**Score ranges:**
- 90-100%: 6+ sections, 4,000+ words, well-balanced
- 80-89%: 5-6 sections, 3,000-4,000 words
- 70-79%: 4-5 sections, 2,000-3,000 words
- 60-69%: 3-4 sections, 1,000-2,000 words
- <60%: fewer than 3 sections or under 1,000 words

**Note:** A proposal can score well on word count but still show "Some sections may be missing" if the section count is low. This is common when the proposal is written as flowing prose rather than clearly headed sections.

**How to improve:** Ensure your knowledge base documents contain detailed technical content, not just abstracts. More comprehensive source material leads to more complete proposals.

---

### 4. Source Utilization (10% of total score)

**What it measures:** How effectively and diversely your knowledge base documents were used.

Counts the number of document chunks retrieved and used in the proposal. More chunks from more diverse sources = higher score.

**Score ranges:**
- 90-100%: 5+ documents, 30+ chunks, diverse sources
- 80-89%: 4-5 documents, 20-30 chunks
- 70-79%: 3-4 documents, 15-20 chunks
- 60-69%: 2-3 documents, 10-15 chunks
- <60%: fewer than 2 documents or under 10 chunks

**How to improve:** Upload more diverse documents to your knowledge base. Avoid relying on a single comprehensive document — multiple sources of different types (papers, reports, data) produce better utilization scores.

---

## Overall Grade Calculation

```
Total Score = (Content Quality × 0.30) +
              (Guideline Adherence × 0.40) +
              (Completeness × 0.20) +
              (Source Utilization × 0.10)
```

**Grade ranges:**
| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90-100% | Excellent — ready to submit |
| B | 80-89% | Good — minor improvements needed |
| C | 70-79% | Fair — needs refinement |
| D | 60-69% | Weak — significant work needed |
| F | <60% | Poor — major revision required |

## Confidence Level

Each evaluation includes a confidence level (HIGH, MEDIUM, LOW) reflecting how reliable the evaluation is:

- **HIGH**: Evaluation is very reliable — proposal and grant description had enough content to analyze
- **MEDIUM**: Reasonably reliable
- **LOW**: May be less accurate — occurs when the proposal is very short, the grant description is vague, or the knowledge base has limited content

## Strengths, Weaknesses, and Recommendations

The evaluation always includes:
- **✅ Strengths**: What the proposal does well
- **⚠️ Weaknesses**: Areas that need attention
- **💡 Recommendations**: Specific actions to improve the score

Read these before deciding whether to regenerate or manually edit the proposal.

## Viewing the Evaluation

1. Go to **Proposals**
2. Find your proposal and click the quality score button (e.g., "📊 Quality: C (73%)")
3. The detailed breakdown modal shows all four dimensions, the overall grade, confidence level, strengths, weaknesses, and recommendations

## Tips for Higher Scores

- Upload the grant's official guidelines or RFP to your knowledge base before generating — this is the single biggest improvement for Guideline Adherence
- Upload multiple diverse documents, not just one large file
- Include research papers, technical reports, and project descriptions relevant to the grant topic
- If your score is below B, review the recommendations and regenerate with an improved knowledge base

## Related Features

- **Proposal Generation**: Create AI-powered proposals
- **Knowledge Base**: Manage your research documents
- **Grant Search**: Find grants to generate proposals for
