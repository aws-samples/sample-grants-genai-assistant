<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# How Bayesian Matching Works

Technical guide to GROW2's grant matching algorithm.

Implementation: `bc/grants-search-agent-v2/bayesian_matcher.py` (US) and
`bc/eu-grants-search-agent-v2/bayesian_matcher.py` (EU). The two are kept in sync
except for the CFDA signal, which only exists for US grants.

---

## Overview

Each grant is scored against a researcher profile to produce a
`profileMatchScore` between 0 and 1. Scoring is **lexical and rule-based**: it
matches profile terms against grant text with word-boundary regexes and combines
the results as likelihood ratios in Bayes' theorem.

There are no embeddings and no semantic similarity in this path. There is also no
learning loop — the score is a pure function of the profile and the grant, so the
same inputs always produce the same output. Changing your profile changes your
scores immediately; nothing else does.

---

## The Calculation

Bayes' theorem in **odds form**:

```
odds_prior     = prior / (1 - prior)
odds_posterior = likelihood_ratio × odds_prior
score          = odds_posterior / (1 + odds_posterior)
```

So there are two inputs: a **prior** from who the researcher is, and a
**likelihood ratio** from how well the grant fits them.

### The prior — who you are

From `get_researcher_priors()`. Base value by `researcherType`:

| Researcher type | Prior |
|---|---|
| `biomedical` | 0.20 |
| `engineering` | 0.15 |
| `computer_science` | 0.15 |
| `basic_science` | 0.12 |
| `social_science` | 0.10 |
| unrecognised / unset | 0.10 |

Then multiplied by `expertise_level` (`expert` 1.2, `advanced` 1.1,
`intermediate` 1.0, `beginner` 0.9) and a further 1.1 if `early_investigator` is
`"True"`. Capped at 0.30.

The prior sets a baseline only. It cannot make an irrelevant grant relevant, and
the type string must be one of the keys above — the Profile UI dropdown stores
these values, so selecting from the dropdown always produces a recognised type.

### The likelihood ratio — how well the grant fits

The product of four groups of multipliers:

1. Gated, damped **grant features**
2. **Profile term matches**, weighted by where they appear
3. **Preferred agency** match
4. **CFDA directorate** alignment (US only)

Each is described below. Because they multiply, a grant that matches on several
axes can compound to a high score, and a single strong penalty can pull a
superficially relevant grant down.

---

## 1. Grant features

`extract_grant_features()` derives ~20 booleans from the grant's title, agency and
description — `isNIH`, `isCancer`, `isAI`, `isEducation`, `hasLargeAmount` and so
on. Each present feature contributes a likelihood ratio from
`get_feature_likelihoods()`, mostly in the 1.7x–2.5x range, with `isEmbassy` a
0.3x penalty and `hasSmallAmount` a mild 0.88x one.

Two corrections make this behave sensibly.

### Word-boundary matching

Term tests use `_term_matches()`, which wraps each term in `\b...\b`. The earlier
code used a bare `term in text` substring test, so the term `'ai'` matched inside
"tr**ai**ning", "Ukr**ai**ne", "av**ai**lable", "dom**ai**n" and "cert**ai**n".
Measured against 100 live grants.gov records, `isAI` fired on 14 of them and
**every one was a false positive**.

### Profile gating

A domain feature only counts if the profile gives a reason to care about it.
`gate_features()` checks each feature's entry in `FEATURE_GATES` against the
profile's own text, and zeroes it out on no match. So `isCancer` no longer
rewards a cancer grant when the researcher does machine learning.

This was the central design error in the original model: features were
**absolute**, describing the grant in isolation, not **relative** to the
researcher. `isBiomedical` fired on 93 of those same 100 live grants — a feature
that matches almost everything cannot discriminate between anything.

Agency features (`isNSF`, `isNIH`, `isDOD`, `isDOE`) are gated on the profile's
preferred agencies. Genuine grant characteristics that are independent of the
researcher — `isSmallBusiness`, `isInternational`, `isEmbassy`, and the three
amount features — are never gated, and are listed in `UNGATED_FEATURES`.

### Damping

Features that still fire broadly are pulled toward 1.0 via `FEATURE_DAMPING`
rather than deleted, since they carry some signal:

| Feature | Retained | Because it also matches |
|---|---|---|
| `isEngineering` | 30% | "technology" |
| `isBasicScience` | 30% | "mathematics", "statistics" |
| `isEducation` | 40% | "training" |
| `isInternational` | 40% | "global" |
| `isBiomedical` | 50% | `isCancer` carries the specificity |

---

## 2. Profile term matching

The part that makes profile edits matter.

Each of `keywords`, `research_areas` and `optimized_keywords` is scored on the
**fraction** of its terms found in the grant, and the multiplier scales with that
fraction — reaching the maximum only on a full match.

| Profile field | Max in TITLE | Max in body only |
|---|---|---|
| `keywords` | 4.00x | 1.40x |
| `research_areas` | 2.50x | 1.25x |
| `optimized_keywords` | 2.00x | 1.15x |

**Title placement dominates deliberately.** A grant whose title names your field
is about your field; one that lists your field among thirty eligible topics in
its description is not. Two live NSF examples, TCUP and CAMEL, both contain
"artificial intelligence" and "machine learning" — in eligibility boilerplate.
Both previously outranked grants with AI in the title.

**Multi-word terms get partial credit.** `term_credit()` returns 1.0 for an exact
phrase match, or 0.6 if every significant word appears somewhere (adjacency not
required), so "autonomous agents" earns partial credit from a grant about
"autonomous systems". Requiring *all* significant words is what stops "AI agents"
matching "agents of change". Terms whose words are all weak in isolation
(`_WEAK_ALONE`: "data", "systems", "models", "learning", …) get no partial credit.

### Why fewer keywords score higher

Because credit is a **fraction of terms supplied**, adding a term that never
appears in grant text lowers every score. Two matches out of six beats two out of
twelve. This inverts the advice the UI and docs previously gave, and it is the
single most useful thing to tell a user: prefer the broad terms that appear in
grant titles over precise terms from your subfield.

---

## 3. Preferred agencies

`agency_match_fraction()` matches the profile's `agencies` against the grant's
**agency field only**, up to 1.50x. Previously a stray mention of "NSF" anywhere
in a description counted as an agency preference match.

Matching goes through `AGENCY_ALIASES`, because a profile says `NSF` while
grants.gov says "U.S. National Science Foundation" — neither substring nor
word-boundary matching connects those. Before the alias map, preferred-agency
matching silently did nothing for NSF, NIH, DOD or DARPA.

---

## 4. CFDA directorate alignment (US only)

The strongest domain signal grants.gov exposes. CFDA / Assistance Listing program
titles name the **funding directorate** and are short and curated, where
descriptions are long and full of boilerplate.

The four grants that dominated a CS/AI profile's results before this signal
existed:

| Grant | CFDA program title | Actual field |
|---|---|---|
| TCUP | 47.076 STEM Education | education |
| CAMEL | 47.075 Social, Behavioral, and Economic Sciences | social science |
| Sociology | 47.075 Social, Behavioral, and Economic Sciences | social science |
| IUSE | 47.041 Engineering + 47.076 STEM Education | education |

All four mention AI or ML in prose. None sits in 47.070, Computer and Information
Science and Engineering, where a CS researcher's grants actually live.

`cfda_signal()` reads the researcher's domain from their profile
(`PROFILE_DOMAIN_TERMS`), the grant's domain from its CFDA titles
(`CFDA_DOMAIN_TERMS`), and compares:

| Outcome | Multiplier |
|---|---|
| Aligned | up to 3.00x, scaled by the fraction of grant domains that match |
| Adjacent | 0.75x |
| Unrelated | 0.35x |
| Catch-all title, or either domain unknown | 1.00x |

**Adjacency** exists because some fields genuinely overlap — CISE is literally
"Computer and Information Science **and Engineering**", and CS researchers
routinely hold NSF Engineering awards. An engineering grant is not wrong for a CS
profile the way a social-science one is. Pairs are in `DOMAIN_ADJACENCY`.

**Catch-all detection** matters for DOD, whose 12.630 "Basic, Applied, and
Advanced Research in Science and Engineering" covers everything DOD funds.
Inferring "engineering" from it and penalising a CS researcher would be wrong, so
`CFDA_CATCHALL_PATTERNS` maps these to neutral rather than to another field.

CFDA titles reach the scorer through the grant's `tags` field, populated by
`extract_cfda_titles()` in the search agent. When absent the signal is neutral,
so this degrades safely.

---

## Score interpretation

Scores are **relative, not absolute** — a ranking within one run, not a fixed
grade.

| Score | Meaning |
|---|---|
| 70%+ | Strong — the researcher's field and preferred funders |
| 50–69% | Solid, worth reviewing |
| 30–49% | Partial, usually a related but different field |
| 20–29% | Weak, cleared the floor |
| < 20% | Filtered out (`MIN_PROFILE_MATCH_SCORE = 0.20`) |

How high a profile *can* score depends on how grants in its field are written.
Oncology grant titles contain "Cancer" and "Clinical Trials" literally, so a
biomedical profile scores higher than a CS one on the same pool. Compare within a
run, not across profiles.

### Selection

`consolidate_results()` in `amplify/functions/agent-discovery-search/handler.py`
drops everything below 0.20, sorts by score descending, and takes the top
`grantsSurfaced` **per region** — so a setting of 2 surfaces up to 4 grants, 2 US
and 2 EU.

Ties fall back to Python's stable sort, i.e. DynamoDB return order. Note the UI
rounds to whole percent, so grants displayed with the same percentage are usually
still ordered correctly against each other.

---

## Verified behaviour

Measured live in `us-east-2` against real grants.gov data.

**A CS/AI profile's top results, before and after:**

| Before | After |
|---|---|
| TCUP (96%) | AI Infrastructure Hubs (80%) |
| CAMEL (96%) | Integrated Data Systems (80%) |
| Sociology (96%) | AI Datasets (74%) |
| IUSE (95%) | Expeditions in Computing (74%) |
| Tactical Autonomous (94%) | Tactical Autonomous (71%) |

Every original result except the last was an education or social-science grant.
The uniform 94–96% band is itself the tell: scores that high, that close, on
grants that unrelated, mean the profile was barely affecting the outcome.

**Mean rank of CISE-directorate grants** for that profile, across a 50-grant live
sample: **25.4 → 4.2**.

**Cross-profile check.** The changes were validated on CS, biomedical, education
and climate profiles before landing, to confirm they generalise rather than
overfit to the CS case that surfaced the bug.

---

## What is not used in scoring

Stored on the profile, and useful to a human reader, but not read by the scorer:

- Budget range and project duration
- Geographic scope
- Methodologies and technical skills
- Institution type and eligibility

There is also **no feedback mechanism**. Marking a grant as relevant or
irrelevant, bookmarking, viewing and applying have no effect on future scores,
because no such signal is collected or consumed. To change results, change the
profile.

---

## Known limitations

- **Score compression on strong matches.** A profile that matches its field
  closely can produce several grants in the high 90s, at which point the score
  stops discriminating within the relevant set. Caused by unbounded multiplicative
  compounding, which damping reduced but did not remove.
- **Near-duplicate grants.** `deduplicate_grants()` matches on exact `grantId`
  only, so sibling opportunities from one program family can occupy several of
  the surfaced slots.
- **No tie-breaker.** Equal scores resolve to DynamoDB order, which is not
  guaranteed stable between runs.
- **EU grants have no directorate signal.** There is no CFDA equivalent in the EU
  data. `EuGrantRecord` has `euKeywords` fields that the EU agent never populates,
  which is the natural place to add one.
- **Lexical matching only.** A grant using vocabulary the profile does not contain
  will not match, however conceptually close it is.

---

## Related documentation

- [Agent Discovery Guide](../../chat-docs/agent-discovery-guide.md) — user-facing
  guide, including how to choose keywords
- [User Profiles](../usage/FIRST_LOGIN.md#step-8-complete-your-researcher-profile-new-accounts-only)
- [Monitoring Guide](../maintenance/MONITORING.md) — the scorer logs its prior,
  every matched feature with its damped ratio, each profile boost with the terms
  that triggered it, and the CFDA decision with its reason

---

**Last Updated:** September 1, 2026
**Version:** 2.0
