<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# How Bayesian Matching Works

Technical guide to understanding GROW2's grant matching algorithm.

---

## Overview

GROW2 uses a Bayesian matching system to calculate relevance scores between your research profile and grant opportunities. This probabilistic approach determines how well a grant matches your interests, expertise, and preferences.

**Key Benefits:**
- Personalized grant recommendations
- Learns from your feedback
- Balances multiple factors (keywords, career stage, agencies)
- Improves over time with usage

---

## How It Works

### The Bayesian Formula

The system calculates relevance scores using Bayesian inference:

```
P(Relevant|Grant) = P(Grant|Relevant) × P(Relevant) / P(Grant)

Where:
- P(Relevant) = Prior probability based on your profile
- P(Grant|Relevant) = Likelihood of this grant given relevance
- P(Grant) = Overall grant probability (normalization factor)
```

**In simple terms:** The system combines what it knows about you (your profile) with what it learns about each grant to predict relevance.

---

## Matching Factors

The algorithm considers multiple factors, each with different weights:

### 1. Keyword Overlap (40% weight)

**What it does:**
- Compares keywords in your profile with grant text
- Uses AI embeddings for semantic similarity
- Recognizes technical terms and domain-specific language

**Example:**
- Your keywords: "machine learning", "healthcare", "diagnostics"
- Grant mentions: "AI-powered clinical decision support"
- Result: High keyword score due to semantic similarity

**How to optimize:**
- Use specific technical terms, not general ones
- Include synonyms and related terms
- Update keywords as your research evolves

---

### 2. Research Area Alignment (25% weight)

**What it does:**
- Matches your research areas with grant focus areas
- Gives bonus for interdisciplinary grants
- Detects emerging fields

**Example:**
- Your area: "Artificial Intelligence"
- Grant focus: "AI in Healthcare"
- Result: High alignment score

**How to optimize:**
- Select all relevant research areas
- Include interdisciplinary areas
- Update as you explore new directions

---

### 3. Career Stage Fit (20% weight)

**What it does:**
- Matches grants to your career level
- Considers appropriate funding levels
- Identifies early investigator programs

**Career stages:**
- Graduate Student
- Postdoctoral Researcher
- Early Career Faculty
- Mid-Career Faculty
- Senior Researcher

**Example:**
- Your stage: "Early Career Faculty"
- Grant: "NSF CAREER Award"
- Result: Perfect career stage match

**How to optimize:**
- Keep career stage current
- Look for stage-specific programs
- Consider transition grants

---

### 4. Agency Preference (10% weight)

**What it does:**
- Weights grants from your preferred agencies
- Considers historical success patterns
- Aligns with agency missions

**Example:**
- Your preferences: NIH, NSF
- Grant agency: NIH
- Result: Preference bonus applied

**How to optimize:**
- Select agencies you're eligible for
- Include agencies you've worked with before
- Update based on success patterns

---

### 5. Eligibility Compliance (5% weight)

**What it does:**
- Checks institution type requirements
- Verifies geographic restrictions
- Considers collaboration requirements

**Example:**
- Your institution: "University"
- Grant requirement: "Academic institutions only"
- Result: Eligible, no penalty

**How to optimize:**
- Keep institution information current
- Note any special eligibility factors
- Review grant requirements carefully

---

## Real-Time Learning

The system improves its recommendations based on your behavior:

### User Feedback
- **Mark as relevant:** Increases weight for similar grants
- **Mark as irrelevant:** Decreases weight for similar grants
- **Save/bookmark:** Signals strong interest
- **Apply:** Strongest positive signal

### Application Tracking
- Success rates with different grant types
- Preferred funding amounts
- Timeline preferences
- Collaboration patterns

### Profile Updates
- New keywords automatically update matching
- Research area changes refine recommendations
- Career stage transitions adjust targeting

### Behavioral Patterns
- Which grants you view
- How long you spend reviewing
- Which sections you read
- Download and save patterns

---

## Match Score Interpretation

### Score Ranges

| Score | Meaning | Action |
|-------|---------|--------|
| 0.8 - 1.0 | Excellent match | Strongly consider applying |
| 0.6 - 0.8 | Good match | Review carefully |
| 0.4 - 0.6 | Moderate match | May be worth exploring |
| 0.2 - 0.4 | Weak match | Probably not relevant |
| 0.0 - 0.2 | Poor match | Skip |

### What Affects Scores

**High scores (0.8+):**
- Strong keyword overlap
- Perfect career stage fit
- Preferred agency
- Research area alignment
- Eligibility match

**Low scores (< 0.4):**
- Few keyword matches
- Wrong career stage
- Unfamiliar agency
- Different research area
- Eligibility issues

---

## Optimization Tips

### For Better Matches

1. **Use Specific Keywords**
   - ❌ Bad: "research", "science", "study"
   - ✅ Good: "CRISPR", "gene editing", "genomics"

2. **Complete Your Profile**
   - Fill in all sections
   - Add multiple research areas
   - List all relevant agencies
   - Keep career stage current

3. **Provide Feedback**
   - Mark grants as relevant/irrelevant
   - The system learns from your choices
   - More feedback = better matches

4. **Update Regularly**
   - Review profile quarterly
   - Add new keywords as research evolves
   - Update career stage when appropriate
   - Adjust agency preferences based on success

5. **Use Multiple Profiles**
   - Create separate profiles for different research directions
   - Each profile gets independent matching
   - Useful for interdisciplinary researchers

---

## Technical Implementation

### AI/ML Components

**Bedrock Integration:**
- Uses Amazon Bedrock for AI-powered text analysis
- Claude models for semantic understanding
- Embeddings for similarity calculations

**Vector Embeddings:**
- Converts text to numerical vectors
- Enables semantic similarity matching
- Captures meaning beyond exact keywords

**DynamoDB Storage:**
- Fast retrieval of matching scores
- Historical data for learning
- User feedback tracking

**Real-time Updates:**
- Scores recalculated when profiles change
- AppSync subscriptions for live updates
- Efficient caching for performance

---

## Performance Metrics

The system tracks its own performance:

### Precision
Percentage of high-scored grants that are actually relevant
- **Target:** > 70%
- **Measured by:** User feedback on recommendations

### Recall
Percentage of relevant grants that receive high scores
- **Target:** > 80%
- **Measured by:** Grants users apply to vs. grants found

### User Satisfaction
Based on feedback and application rates
- **Target:** > 75% satisfaction
- **Measured by:** Surveys and usage patterns

### Discovery Rate
New relevant grants found over time
- **Target:** Consistent discovery of new opportunities
- **Measured by:** Unique grants surfaced per week

---

## Comparison with Keyword Search

### Bayesian Matching Advantages

| Feature | Keyword Search | Bayesian Matching |
|---------|---------------|-------------------|
| Personalization | None | High |
| Learning | No | Yes |
| Semantic understanding | Limited | Advanced |
| Career stage awareness | No | Yes |
| Agency preferences | No | Yes |
| Improves over time | No | Yes |

### When to Use Each

**Use Bayesian Matching (Agent Discovery) when:**
- You want personalized recommendations
- You have a complete profile
- You want the system to learn your preferences
- You're exploring new opportunities

**Use Keyword Search when:**
- You're looking for something specific
- You want full control over search terms
- You're exploring outside your usual areas
- You need quick, broad results

---

## Frequently Asked Questions

### Why did I get a low score for a grant I'm interested in?

The system doesn't know you're interested until you tell it! Mark the grant as relevant, and similar grants will score higher in the future.

### Can I see why a grant got a specific score?

Currently, scores are composite. Future versions may show factor breakdowns (keyword: 0.8, career stage: 0.6, etc.).

### How long does it take for the system to learn?

You'll see improvements after 5-10 feedback actions. Significant learning happens after 20-30 interactions.

### Does the system share my data?

No. All matching happens within your AWS account. Your profile and preferences are private.

### Can I reset the learning?

Yes, by creating a new profile. The system starts fresh with no historical data.

---

## Additional Resources

- [User Profiles Guide](../usage/FIRST_LOGIN.md#step-8-complete-your-researcher-profile-new-accounts-only) - Setting up your profile
- [Agent Configuration](../usage/FIRST_LOGIN.md) - Autonomous discovery setup
- [Monitoring Guide](../maintenance/MONITORING.md) - Understanding match scores in logs

---

**Last Updated:** February 4, 2026  
**Version:** 1.0
