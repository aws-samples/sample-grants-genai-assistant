<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

# Agent Discovery Guide

## Overview

Agent Discovery is an autonomous system that periodically searches for grant opportunities matching your research profile. Instead of manually searching, the AI agent works in the background to find relevant grants for you.

## How It Works

1. **Profile Analysis**: The agent reads your research profile keywords, research areas, and preferences
2. **Automated Search**: Searches both US (Grants.gov) and EU (Horizon Europe) grant databases
3. **Bayesian Matching**: Scores each grant against your profile using a Bayesian algorithm
4. **Filtering**: Keeps only high-relevance matches
5. **Storage**: Saves results for you to review in **Agent Selected Grants**

## Setting Up Agent Discovery

### Step 1: Complete Your Research Profile

Before configuring discovery, make sure your profile is complete — the agent uses it to find relevant grants.

1. Go to **User Profiles**
2. Fill in your research details:
   - **Research Areas**: Your main research domains
   - **Keywords**: Specific terms related to your work (more = better matching)
   - **Methodologies**: Research methods you use
   - **Tech Skills**: Technical capabilities
3. Set your preferences:
   - **Budget Range**: Desired funding amounts
   - **Duration**: Preferred project length
   - **Geographic Scope**: Where you can apply
   - **Agencies**: Preferred funding agencies (NSF, NIH, DOD, Horizon Europe, etc.)

The more complete your profile, the better the grant matching.

### Step 2: Configure the Agent

Go to **Agent Config** and click **Edit Configuration** to set up how the agent runs:

- **Research Profile**: Select which profile the agent should use for matching. The profile name and researcher type are shown (e.g., "Test User (computer_science)")
- **Search Interval**: How often the agent searches for new grants — 24 hours (Daily) is the default and recommended setting
- **Grants to Surface**: Number of top-matching grants to surface per search run (default: 2)
- **Automatic Search**: Toggle on to have the agent run automatically on your chosen interval. When enabled, you will see "✅ Enabled — Agent will search automatically"
- **Storage Duration**: How many days to keep discovered grants in your dashboard (default: 3 days)

Your **Current Configuration** summary is shown at the bottom of the page so you can confirm your settings before saving.

### Step 3: Wait for Results

- **First run**: May take 5-10 minutes after saving
- **Subsequent runs**: Automatic based on your Search Interval
- **Results**: Appear in the **Agent Selected Grants** section

## Viewing Discovered Grants

### Agent Selected Grants

1. Go to **Agent Selected Grants**
2. Grants are ranked by match score — higher scores mean better fit
3. Each grant shows:
   - Title and description
   - Match score (0-100%)
   - Agency and program
   - Deadline date
   - Funding amount
   - Why it matched (keywords, research areas)

### Understanding Match Scores

| Score | Meaning |
|-------|---------|
| 90-100% | Excellent match — highly relevant |
| 80-89% | Good match — worth considering |
| 70-79% | Fair match — review carefully |
| 60-69% | Weak match — may not be ideal |
| <60% | Usually filtered out |

**Factors in scoring:**
- Keyword overlap with your profile
- Research area alignment
- Career stage appropriateness
- Budget range match
- Geographic eligibility

## Grant Sources

### US Grants (Grants.gov)

Agencies covered include NIH, NSF, DOD/DARPA, DOE, NASA, USDA, and 20+ other federal agencies.

### EU Grants (Horizon Europe)

Programs covered include Horizon Europe, European Research Council (ERC), Marie Skłodowska-Curie Actions, and European Innovation Council.

The agent searches both sources automatically — no separate configuration needed.

## Optimizing Discovery Results

### Improve Your Profile

- Add synonyms and related terms to your keywords
- Use both technical and plain language
- Include emerging research areas
- Update your profile as your research evolves
- Set realistic budget ranges and geographic scope

### Adjust Agent Settings

- Increase **Grants to Surface** if you want more options per run
- Reduce **Storage Duration** if you want a tighter, more current feed
- Use **Automatic Search: Enabled** so you don't have to trigger runs manually

## Troubleshooting

### "No grants discovered"

- Profile keywords may be too narrow — broaden them
- Budget range may be too restrictive
- Try triggering a manual run from Agent Config

### "Too many irrelevant grants"

- Add more specific technical keywords to your profile
- Set tighter budget ranges
- Reduce Grants to Surface to focus on top matches only

### "Agent not running"

- Confirm **Automatic Search** is set to Enabled
- Check that a Research Profile is selected
- Verify Search Interval is set

## Related Features

- **User Profiles**: Set up your research profile
- **Grant Search**: Manual search for grants
- **Agent Selected Grants**: View your discovered grants
- **Proposal Generation**: Create proposals from discovered grants
