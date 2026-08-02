<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

# Proposal Evaluation Metrics Guide

## Overview

Every generated proposal is automatically evaluated by an AI agent that assesses quality across 4 key dimensions. The result is an overall grade (A–F), a confidence level, and a detailed breakdown with strengths, weaknesses, and recommendations.

## The 4 Evaluation Dimensions

### 1. Content Quality (30% of total score)

**What it measures:** How well your knowledge base documents matched the grant requirements.

Measures semantic similarity between the grant description and your uploaded documents. Higher scores mean your documents are more relevant to the grant topic.

**Score ranges (mapped from the Semantic Search level shown on the proposal):**
- 90%: EXCELLENT or GOOD level (avg semantic score 0.55+) — documents are highly relevant
- 70%: MODERATE level (avg semantic score 0.40-0.54) — acceptable but could be stronger
- 50%: WEAK level (avg semantic score 0.25-0.39) — questionable relevance
- 25%: POOR level (avg semantic score below 0.25) — source material doesn't align well with the grant

**How to improve:** Upload more documents directly related to the grant topic — research papers, technical reports, and project descriptions all help. The semantic score shown (e.g., "avg: 0.47") reflects how closely your documents matched; scores above 0.55 reach the top tier.

---

### 2. Guideline Adherence (40% of total score)

**What it measures:** How well each section of the proposal follows the guidelines that were used to generate it.

The evaluator scores each proposal section individually — Broader Impacts, Implementation, Intellectual Merit (or the equivalent sections for your agency) — against that specific section's own prompt/guidelines, then combines the results into a single score weighted by each section's word count. A section is never penalized for content that belongs in a different section (for example, a missing budget figure won't count against a Broader Impacts section, since budget belongs in Implementation).

**Note:** If a section's analysis fails for a transient reason (an API error, for instance), that section falls back to a heuristic score rather than failing the whole evaluation. The reasoning text will say how many sections were analyzed and whether any fell back.

**Score ranges:**
- 90-100%: Excellent — follows all guidelines across every section
- 80-89%: Good — minor deviations only
- 70-79%: Fair — some requirements missed in one or more sections
- 60-69%: Weak — several issues found
- <60%: Poor — significant problems, often flagged as red flags

**How to improve:** Include the grant's official guidelines or RFP document in your knowledge base before generating — this gives the evaluator (and the generation prompts themselves) more structured requirements to check the proposal against.

---

### 3. Completeness (20% of total score)

**What it measures:** Whether the proposal contains all sections expected for its agency, with adequate word counts.

Checks the number of distinct sections against how many sections that agency's prompt set actually defines (e.g., NSF today has 3: Intellectual Merit, Broader Impacts, Implementation), plus total word count. The evaluation output shows both (e.g., "3/3 expected sections with 10,419 total words").

**How to improve:** Ensure your knowledge base documents contain detailed technical content, not just abstracts — thin word counts per section (under ~500 words) are flagged as "SHORT" in the section breakdown and genuinely hurt this score. If a section is missing entirely, check the proposal generation logs — a single failed section shouldn't happen, but if it does, regenerating usually resolves it.

---

### 4. Source Utilization (10% of total score)

**What it measures:** How many document chunks were retrieved and how relevant they were, based on the same semantic search results used for Content Quality.

Half the score comes from chunk count (full marks at 20+ chunks used), half from average semantic relevance score (full marks at 0.50+ average).

**Score ranges:**
- 90-100%: 20+ chunks used, 0.45+ average semantic score
- 70-89%: Good chunk count or good relevance, not necessarily both
- 50-69%: Moderate on both chunk count and relevance
- <50%: Fewer than 10 chunks used, or low average relevance

**How to improve:** Upload more diverse, on-topic documents to your knowledge base. Avoid relying on a single comprehensive document — multiple relevant sources give the retrieval step more high-scoring chunks to pull from.

---

## Contextual Grounding (shown separately, not part of the 4 dimensions)

Each generated section also gets a **grounding score**, shown as the **Grounded: [%]** badge on the proposal — this is informational only and is not one of the 4 weighted dimensions above, so it does not affect your overall grade.

**What it measures:** How much of a section's text is actually backed by the documents used to write it, versus generic or illustrative content the AI added to fill gaps. Every generation prompt instructs the AI to mark unsourced sentences, figures, or claims with `[Not sourced from your documents]` inline — the grounding score is a guardrail-based check of how much of the section's text that marker (and similar unsourced content) actually covers.

**Why some sections score lower than others:** Sections like Implementation legitimately contain budget figures, timelines, and personnel details that your source documents typically don't supply — that content is intentionally allowed (never blocked), just honestly flagged. A lower grounding score on Implementation is often expected and not a sign of a problem, whereas a low score on Intellectual Merit (which should mostly restate your own research) is more worth investigating.

**How to improve:** Upload documents with more depth on the topics each section covers. Thin source material gives the model less to ground each section in, so more of it ends up marked as unsourced.

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
2. Find your proposal and click the quality score button (e.g., "📊 Quality: C+ (78%)")
3. The detailed breakdown modal shows all four weighted dimensions, the contextual grounding scores per section, the overall grade, confidence level, strengths, weaknesses, and recommendations

## Tips for Higher Scores

- Upload the grant's official guidelines or RFP to your knowledge base before generating — this is the single biggest improvement for Guideline Adherence
- Upload multiple diverse documents, not just one large file
- Include research papers, technical reports, and project descriptions relevant to the grant topic
- If your score is below B, review the recommendations and regenerate with an improved knowledge base

## Related Features

- **Proposal Generation**: Create AI-powered proposals
- **Knowledge Base**: Manage your research documents
- **Prompt Management**: How to view, test, and edit the prompts driving each score
- **Grant Search**: Find grants to generate proposals for
