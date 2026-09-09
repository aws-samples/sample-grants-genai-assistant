<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

# Agent Discovery Guide

## Overview

Agent Discovery is an autonomous system that periodically searches for grant opportunities matching your research profile. Instead of manually searching, the AI agent works in the background to find relevant grants for you.

## How It Works

1. **Profile Analysis**: The agent reads your researcher type, keywords, research areas, and preferred agencies
2. **Automated Search**: Searches both US (Grants.gov) and EU (Horizon Europe) grant databases
3. **Bayesian Matching**: Scores each grant against your profile, starting from a baseline set by your researcher type and adjusting it for each signal the grant does or does not match
4. **Filtering**: Drops anything below a 20% match, then ranks US and EU separately
5. **Storage**: Saves the top matches for you to review in **Agent Selected Grants**

## Setting Up Agent Discovery

### Step 1: Complete Your Research Profile

Before configuring discovery, make sure your profile is complete — the agent uses it to find relevant grants.

1. Go to **User Profiles**
2. Fill in the fields that drive matching:
   - **Researcher Type**: Sets your starting relevance and decides which research
     domains count. A Computer Science researcher does not get credit for a grant
     being biomedical, and vice versa.
   - **Primary Keywords**: Your main research terms. These drive the searches AND
     carry the largest matching weight.
   - **Secondary Keywords**: Related terms and techniques. Smaller weight.
   - **Research Areas**: Your broader domains.
   - **Preferred Agencies**: Matched against the grant's funding agency
     (NSF, NIH, DOD, DARPA, Horizon Europe, etc.).

> **Use fewer, broader keywords — not more.** Each grant is scored on the
> **fraction** of your keywords it contains. Two of six matching scores higher than
> two of twelve, so a term that never appears in real grant text *lowers* your
> scores rather than adding to them.
>
> ✅ Good: "artificial intelligence", "machine learning", "cancer", "clinical trials"
> — broad terms that appear in grant titles
> ❌ Too narrow: "knowledge graphs", "semantic reasoning", "kill chain" — rarely
> present verbatim, so they dilute the average
>
> A keyword found in a grant's **title** counts for far more than one buried in its
> description. That is deliberate: a grant whose title names your field is about
> your field, whereas one listing your field among thirty eligible topics is not.

Other profile fields (Methodologies, Tech Skills, Budget Range, Duration,
Geographic Scope) are stored for your reference but are **not** currently used in
match scoring.

### Step 2: Configure the Agent

Go to **Agent Config** and click **Edit Configuration** to set up how the agent runs:

- **Research Profile**: Select which profile the agent should use for matching. The profile name and researcher type are shown (e.g., "Test User (computer_science)")
- **Search Interval**: How often the agent searches for new grants — 24 hours (Daily) is the default and recommended setting
- **Grants to Surface**: Number of top-matching grants to surface **per region** (default: 2). US and EU are ranked separately, so a setting of 2 surfaces up to 4 grants — 2 US plus 2 EU
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

### Understanding Match Scores

Scores are relative, not absolute — treat them as a ranking within a single run
rather than a fixed grade. Grants must clear a **20% minimum** to be surfaced at all.

| Score | Meaning |
|-------|---------|
| 70%+ | Strong match — your field, your preferred funders |
| 50-69% | Solid match — worth reviewing |
| 30-49% | Partial match — usually a related but different field |
| 20-29% | Weak — cleared the floor, little else in common |
| <20% | Filtered out, never surfaced |

How well a profile can score depends on how the grants in your field are written.
A cancer researcher will see higher numbers than an AI researcher simply because
oncology grant titles contain words like "Cancer" and "Clinical Trials" directly,
so compare scores **within** a run, not across profiles.

**What actually affects the score:**
- How many of your **primary keywords** appear in the grant — and whether they are
  in the **title** (counts much more) or only the description
- **Secondary keywords** and **research areas**, at lower weight
- Whether the grant's **funding agency** is one of your preferred agencies
- For US grants, whether the grant's **funding directorate** matches your field.
  This comes from the grant's CFDA / Assistance Listing program title — for example
  "Computer and Information Science and Engineering" versus "STEM Education". A
  grant from an unrelated directorate is penalised even if it mentions your
  keywords in passing.
- **Researcher Type**, which sets your starting relevance and gates which research
  domains can contribute at all
- **Expertise level** and **early career** status, as small multipliers

**What does not affect it:** budget range, project duration, geographic scope,
methodologies, or technical skills. Those are stored but unused by scoring.

## Grant Sources

### US Grants (Grants.gov)

Agencies covered include NIH, NSF, DOD/DARPA, DOE, NASA, USDA, and 20+ other federal agencies.

### EU Grants (Horizon Europe)

Programs covered include Horizon Europe, European Research Council (ERC), Marie Skłodowska-Curie Actions, and European Innovation Council.

The agent searches both sources automatically — no separate configuration needed.

## Optimizing Discovery Results

### Improve Your Profile

- **Prefer the terms funding agencies use**, not the terms your subfield uses. Grant
  titles say "artificial intelligence" far more often than "neuro-symbolic reasoning".
- **Remove keywords that never match.** Because scoring uses the fraction of your
  keywords found, a term absent from all grant text drags every score down.
- Set your **Researcher Type** accurately — it decides which research domains are
  allowed to contribute to your score at all.
- List the **agencies that actually fund your field** under Preferred Agencies.
- Update your profile as your research evolves.

### Adjust Agent Settings

- Increase **Grants to Surface** if you want more options per run
- Reduce **Storage Duration** if you want a tighter, more current feed
- Use **Automatic Search: Enabled** so you don't have to trigger runs manually

## Troubleshooting

### "No grants discovered"

- Keywords may be too specialised for anything to clear the 20% floor — replace niche
  terms with the broader ones agencies use in titles
- Confirm your **Researcher Type** matches your field
- Try triggering a manual run from Agent Config

### "Too many irrelevant grants"

- Trim your keyword list rather than extending it. Removing terms that never match
  raises the scores of genuinely relevant grants, which pushes the irrelevant ones down
- Check that **Preferred Agencies** lists only funders relevant to your work
- Reduce Grants to Surface to focus on top matches only

### "All my results have nearly the same score"

Expected when your field is a strong match — several grants can reach the high 90s and
the displayed percentage is rounded, so grants shown as equal are usually still ranked
correctly against each other. Compare the grants themselves rather than the numbers.

### "Agent not running"

- Confirm **Automatic Search** is set to Enabled
- Check that a Research Profile is selected
- Verify Search Interval is set

## Related Features

- **User Profiles**: Set up your research profile
- **Grant Search**: Manual search for grants
- **Agent Selected Grants**: View your discovered grants
- **Proposal Generation**: Create proposals from discovered grants
