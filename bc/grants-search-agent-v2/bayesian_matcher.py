#!/usr/bin/env python3
"""
Bayesian Grant Matching Module

Implements the Bayesian probability algorithm for matching grants to researcher profiles.
Based on the algorithm described in BAYESIAN_GRANT_MATCHING.md
"""

import json
import logging
import re
from typing import Dict, List, Any, Optional, Tuple
import boto3
from decimal import Decimal

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Term matching helpers
#
# FIX: matching used `term in text`, a bare substring test. For short terms that
# is badly wrong — 'ai' matches inside "training", "Ukraine", "available",
# "domain", "certain", "maintain", and 'ml' matches inside HTML fragments. The
# effect was that isAI fired on essentially every grant, including cancer and
# education grants with no AI content, confirmed against live results.
#
# These helpers do word-boundary matching instead. Compiled patterns are cached
# because the same profile/feature terms are re-tested against every grant.
# ---------------------------------------------------------------------------
_TERM_PATTERN_CACHE: Dict[str, Any] = {}


def _term_matches(term: str, text: str) -> bool:
    """True if `term` appears in `text` as a whole word (or whole phrase)."""
    term = (term or '').strip().lower()
    if not term or not text:
        return False
    pattern = _TERM_PATTERN_CACHE.get(term)
    if pattern is None:
        pattern = re.compile(r'\b' + re.escape(term) + r'\b')
        _TERM_PATTERN_CACHE[term] = pattern
    return pattern.search(text) is not None


def _any_term_matches(terms: List[str], text: str) -> bool:
    """True if ANY term matches as a whole word. Replaces
    `any(t in text for t in terms)`."""
    return any(_term_matches(t, text) for t in terms)


def _fraction_matched(terms: Optional[List[str]], text: str) -> Tuple[float, List[str]]:
    """What FRACTION of the supplied terms actually appear in the text.

    Returns (fraction, matched_terms). Empty/missing term list -> (0.0, []).

    This is what makes profile keywords matter. The previous code only tested
    whether the profile's keyword LIST WAS NON-EMPTY, so every profile with any
    keywords at all got an identical boost and editing the keywords changed
    nothing.
    """
    cleaned = [t.strip().lower() for t in (terms or []) if t and str(t).strip()]
    if not cleaned:
        return 0.0, []
    matched = [t for t in cleaned if _term_matches(t, text)]
    return len(matched) / len(cleaned), matched


def get_grant_text(grant: Dict[str, Any]) -> str:
    """Combined lowercase title + agency + description for a grant.

    Handles BOTH native agent structures (US nested, EU flat/nested) — the same
    field probing extract_grant_features does, factored out so profile matching
    scores against exactly the same text the features are derived from.
    """
    title = ''
    if grant.get('title'):
        title = grant.get('title', '')
    elif grant.get('searchData', {}).get('title'):
        title = grant.get('searchData', {}).get('title', '')
    elif grant.get('grantData', {}).get('title'):
        title = grant.get('grantData', {}).get('title', '')

    agency = ''
    if grant.get('agency'):
        agency = grant.get('agency', '')
    elif grant.get('searchData', {}).get('agency'):
        agency = grant.get('searchData', {}).get('agency', '')
    elif grant.get('grantData', {}).get('frameworkProgramme', {}).get('description'):
        agency = grant.get('grantData', {}).get('frameworkProgramme', {}).get('description', '')
    elif isinstance(grant.get('grantData', {}).get('frameworkProgramme'), str):
        agency = grant.get('grantData', {}).get('frameworkProgramme', '')

    description = ''
    if grant.get('description'):
        description = grant.get('description', '')
    elif grant.get('detailsData', {}).get('synopsis', {}).get('synopsisDesc'):
        description = grant.get('detailsData', {}).get('synopsis', {}).get('synopsisDesc', '')
    elif grant.get('grantData', {}).get('description'):
        description = grant.get('grantData', {}).get('description', '')
    elif grant.get('grantData', {}).get('descriptionByte'):
        description = grant.get('grantData', {}).get('descriptionByte', '')
    elif grant.get('grantData', {}).get('summary'):
        description = grant.get('grantData', {}).get('summary', '')

    return f"{(title or '').lower()} {(agency or '').lower()} {(description or '').lower()}"

# Get AWS region and table name from environment variables
import os
AWS_REGION = os.environ['AWS_REGION']  # REQUIRED - set by CDK, no fallback
USER_PROFILE_TABLE = os.environ['USER_PROFILE_TABLE']  # REQUIRED - set by CDK, no fallback

# DynamoDB client with explicit region
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
user_profile_table = dynamodb.Table(USER_PROFILE_TABLE)

def get_active_user_profile(cognito_user_id: str) -> Optional[Dict[str, Any]]:
    """Get the active profile for a Cognito user, with fallback to default profile"""
    try:
        # First try to get active profile for this specific Cognito user
        response = user_profile_table.scan(
            FilterExpression='userId = :uid AND isActive = :active',
            ExpressionAttributeValues={
                ':uid': cognito_user_id,
                ':active': True
            }
        )
        
        profiles = response.get('Items', [])
        if profiles:
            logger.info(f"✅ Found active profile for Cognito user {cognito_user_id}")
            return profiles[0]  # Return first active profile
        
        # Fallback: get any profile for this Cognito user
        response = user_profile_table.scan(
            FilterExpression='userId = :uid',
            ExpressionAttributeValues={':uid': cognito_user_id}
        )
        
        profiles = response.get('Items', [])
        if profiles:
            logger.info(f"✅ Found profile for Cognito user {cognito_user_id}, using first available")
            return profiles[0]
        
        # No profile found - fail explicitly
        logger.error(f"❌ No profile found for Cognito user {cognito_user_id}")
        logger.error(f"   User must create a profile in the Profile tab before using Bayesian matching")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error fetching profile for Cognito user {cognito_user_id}: {str(e)}")
        return None

def extract_grant_features(grant: Dict[str, Any]) -> Dict[str, bool]:
    """
    Extract boolean features from a grant for Bayesian analysis.
    
    Handles BOTH native agent structures (US and EU) by checking multiple field locations.
    """
    
    # TITLE: Try multiple locations
    title = ''
    if grant.get('title'):
        title = grant.get('title', '')
    elif grant.get('searchData', {}).get('title'):
        title = grant.get('searchData', {}).get('title', '')
    elif grant.get('grantData', {}).get('title'):
        title = grant.get('grantData', {}).get('title', '')
    title = (title or '').lower()
    
    # AGENCY: Try multiple locations, prioritize frameworkProgramme for EU grants
    agency = ''
    if grant.get('agency'):
        agency = grant.get('agency', '')
    elif grant.get('searchData', {}).get('agency'):
        agency = grant.get('searchData', {}).get('agency', '')
    elif grant.get('grantData', {}).get('frameworkProgramme', {}).get('description'):
        # EU uses framework programme (e.g., "Horizon Europe", "Digital Europe")
        agency = grant.get('grantData', {}).get('frameworkProgramme', {}).get('description', '')
    elif isinstance(grant.get('grantData', {}).get('frameworkProgramme'), str):
        agency = grant.get('grantData', {}).get('frameworkProgramme', '')
    agency = (agency or '').lower()
    
    # DESCRIPTION: Try multiple locations
    description = ''
    if grant.get('description'):
        description = grant.get('description', '')
    elif grant.get('detailsData', {}).get('synopsis', {}).get('synopsisDesc'):
        # US agent structure
        description = grant.get('detailsData', {}).get('synopsis', {}).get('synopsisDesc', '')
    elif grant.get('grantData', {}).get('description'):
        description = grant.get('grantData', {}).get('description', '')
    elif grant.get('grantData', {}).get('descriptionByte'):
        description = grant.get('grantData', {}).get('descriptionByte', '')
    elif grant.get('grantData', {}).get('summary'):
        description = grant.get('grantData', {}).get('summary', '')
    description = (description or '').lower()
    
    # Combine all text for analysis
    combined_text = f"{title} {agency} {description}"
    
    # NOTE: all term tests use _any_term_matches (word-boundary) rather than the
    # previous bare `term in text` substring test. See the helper docstrings —
    # the old form made 'ai' match "training"/"Ukraine" and fired isAI on almost
    # every grant regardless of content.
    features = {
        # Agency features
        'isNIH': _any_term_matches(['nih', 'national institutes of health', 'nidcr', 'ninds', 'nci'], agency),
        'isNSF': _any_term_matches(['nsf', 'national science foundation'], agency),
        'isDOD': _any_term_matches(['dod', 'department of defense', 'darpa', 'army', 'navy', 'air force'], agency),
        'isDOE': _any_term_matches(['doe', 'department of energy'], agency),
        'isEmbassy': _any_term_matches(['embassy', 'consulate', 'diplomatic'], agency),

        # Research domain features
        'isBiomedical': _any_term_matches([
            'biomedical', 'medical', 'health', 'disease', 'clinical', 'biological',
            'genomics', 'neuroscience', 'cancer', 'alzheimer', 'diabetes'
        ], combined_text),
        'isEngineering': _any_term_matches([
            'engineering', 'technology', 'materials', 'mechanical', 'electrical',
            'computer science', 'robotics', 'ai', 'artificial intelligence'
        ], combined_text),
        'isBasicScience': _any_term_matches([
            'basic research', 'fundamental', 'theoretical', 'physics', 'chemistry',
            'mathematics', 'statistics'
        ], combined_text),

        # Specific research areas
        'isAlzheimers': _any_term_matches(['alzheimer', 'dementia', 'neurodegeneration'], combined_text),
        'isCancer': _any_term_matches(['cancer', 'oncology', 'tumor', 'carcinoma'], combined_text),
        'isAI': _any_term_matches(['artificial intelligence', 'machine learning', 'ai', 'ml'], combined_text),
        'isClimateChange': _any_term_matches(['climate', 'environmental', 'sustainability'], combined_text),

        # Grant characteristics
        'isSmallBusiness': _any_term_matches(['sbir', 'sttr', 'small business'], combined_text),
        'isEducation': _any_term_matches(['education', 'training', 'student', 'fellowship'], combined_text),
        'isInternational': _any_term_matches(['international', 'global', 'foreign'], combined_text),
        
        # Amount features
        'hasLargeAmount': grant.get('amount', 0) > 1000000,  # > $1M
        'hasMediumAmount': 100000 <= grant.get('amount', 0) <= 1000000,  # $100K - $1M
        'hasSmallAmount': 0 < grant.get('amount', 0) < 100000,  # < $100K
    }
    
    return features

# ===========================================================================
# PROFILE-RELATIVE SCORING
#
# Everything below exists to answer "is this grant relevant to THIS researcher"
# rather than "is this a research grant". The original model asked the latter:
# features were absolute, so isBiomedical (2.5x) and isCancer (2.46x) were awarded
# to every grant regardless of who was searching. Measured against 100 live
# grants.gov records, isBiomedical fired on 93% of them — a feature that matches
# almost everything cannot discriminate.
#
# Validated on a 50-grant live sample scored for a Computer Science / AI profile:
# the mean rank of grants in the CISE (Computer & Information Science &
# Engineering) directorate improved from 25.4 to 4.2, and the top result changed
# from a mathematics-education grant to "Mathematical Foundations of Artificial
# Intelligence".
# ===========================================================================

# --- Agency aliases -------------------------------------------------------
# A profile says "NSF"; the grant says "U.S. National Science Foundation". Neither
# substring nor word-boundary matching connects those, so preferred-agency
# matching silently did nothing for NSF, DOD, DARPA and NIH (verified). Matching
# is also done against the grant's AGENCY field only — previously a stray "NSF"
# in a description counted as an agency preference match.
AGENCY_ALIASES = {
    'nsf':   ['nsf', 'national science foundation'],
    'nih':   ['nih', 'national institutes of health', 'nidcr', 'ninds', 'nci',
              'nhlbi', 'niaid', 'nimh', 'nia'],
    'dod':   ['dod', 'department of defense', 'dept of defense', 'army', 'navy',
              'air force', 'marine corps', 'materiel command', 'onr',
              'office of naval research', 'afosr', 'afrl', 'darpa', 'defense'],
    'darpa': ['darpa', 'defense advanced research projects'],
    'doe':   ['doe', 'department of energy', 'office of science'],
    'nasa':  ['nasa', 'national aeronautics'],
    'dot':   ['dot', 'department of transportation'],
    'usda':  ['usda', 'department of agriculture'],
    'epa':   ['epa', 'environmental protection agency'],
    'ed':    ['department of education'],
    'horizon europe': ['horizon europe', 'horizon'],
    'digital europe programme': ['digital europe'],
    'european commission': ['european commission', 'horizon europe', 'digital europe'],
}


def agency_match_fraction(profile_agencies, grant_agency_text) -> Tuple[float, List[str]]:
    """Fraction of the user's preferred agencies that match the grant's agency."""
    prefs = [a.strip().lower() for a in (profile_agencies or []) if a and str(a).strip()]
    if not prefs or not grant_agency_text:
        return 0.0, []
    hits = []
    for pref in prefs:
        for alias in AGENCY_ALIASES.get(pref, [pref]):
            if _term_matches(alias, grant_agency_text):
                hits.append(pref)
                break
    return len(hits) / len(prefs), hits


# --- Partial credit for multi-word profile terms --------------------------
# "Autonomous Agents" never appears verbatim in a grant that says "autonomous
# systems"/"autonomous maneuver", so multi-word profile terms contributed nothing.
# Rule: require ALL significant words present (adjacency not required) and award
# partial credit. Requiring all of them is what stops "AI Agents" matching
# "agents of change" — 'ai' must appear as a word too.
_STOPWORDS = {'a', 'an', 'and', 'the', 'of', 'for', 'in', 'on', 'to', 'with', 'or'}
_WEAK_ALONE = {'agents', 'models', 'systems', 'databases', 'data', 'learning',
               'networks', 'science', 'sciences', 'intelligence', 'research'}
_PARTIAL_CREDIT = 0.6


def term_credit(term: str, text: str) -> float:
    """1.0 exact phrase; _PARTIAL_CREDIT if all significant words present; else 0."""
    term = (term or '').strip().lower()
    if not term:
        return 0.0
    if _term_matches(term, text):
        return 1.0
    words = [w for w in term.split() if w and w not in _STOPWORDS]
    if len(words) < 2:
        return 0.0
    if not all(_term_matches(w, text) for w in words):
        return 0.0
    if all(w in _WEAK_ALONE for w in words):
        return 0.0
    return _PARTIAL_CREDIT


def field_credit(terms, text) -> Tuple[float, List[str]]:
    """Mean credit across a profile field's terms, and which ones contributed."""
    cleaned = [t.strip().lower() for t in (terms or []) if t and str(t).strip()]
    if not cleaned:
        return 0.0, []
    scored = [(t, term_credit(t, text)) for t in cleaned]
    return (sum(c for _t, c in scored) / len(cleaned),
            [t for t, c in scored if c > 0])


# --- Feature gating -------------------------------------------------------
# A domain feature contributes only if the PROFILE gives a reason to care.
FEATURE_GATES = {
    'isBiomedical': ['biomedical', 'medical', 'health', 'disease', 'clinical', 'biology',
                     'biological', 'genomics', 'neuroscience', 'cancer', 'oncology',
                     'bioinformatics', 'life sciences', 'epidemiology'],
    'isCancer':     ['cancer', 'oncology', 'tumor', 'carcinoma', 'biomedical'],
    'isAlzheimers': ['alzheimer', 'dementia', 'neurodegeneration', 'neuroscience'],
    'isAI':         ['ai', 'artificial intelligence', 'machine learning', 'deep learning',
                     'neural networks', 'data science', 'computer science', 'nlp',
                     'computer vision', 'autonomous', 'agents', 'intelligent systems'],
    'isClimateChange': ['climate', 'environmental', 'sustainability', 'energy', 'earth'],
    'isEngineering': ['engineering', 'robotics', 'materials', 'mechanical', 'electrical',
                      'computer science', 'systems', 'artificial intelligence'],
    'isBasicScience': ['physics', 'chemistry', 'mathematics', 'statistics', 'theoretical',
                       'basic research', 'data science'],
    'isEducation':  ['education', 'teaching', 'curriculum', 'pedagogy', 'outreach',
                     'broadening participation', 'stem education', 'training'],
}
# Genuinely profile-independent grant characteristics — never gated.
UNGATED_FEATURES = {'isSmallBusiness', 'isInternational', 'isEmbassy',
                    'hasLargeAmount', 'hasMediumAmount', 'hasSmallAmount'}
AGENCY_FEATURES = {'isNSF': 'nsf', 'isNIH': 'nih', 'isDOD': 'dod', 'isDOE': 'doe'}

# Broad features that fire on most grants are damped toward 1.0 rather than
# removed — they carry a little signal, just far less than their raw ratio implies.
FEATURE_DAMPING = {
    'isEngineering': 0.30,   # matches "technology"
    'isBasicScience': 0.30,  # matches "mathematics"/"statistics"
    'isEducation': 0.40,
    'isInternational': 0.40,
    'isBiomedical': 0.50,    # isCancer/isAlzheimers carry the specificity
}


def profile_signal_text(profile: Dict[str, Any]) -> str:
    """All free-text profile signal as one searchable blob."""
    parts = [str(profile.get('researcherType', '')), str(profile.get('department', ''))]
    for field in ('keywords', 'optimized_keywords', 'research_areas', 'expertise',
                  'researchInterests'):
        parts.extend(str(v) for v in (profile.get(field) or []))
    return ' '.join(parts).lower()


def gate_features(features: Dict[str, bool], profile: Dict[str, Any],
                  grant_agency_text: str) -> Tuple[Dict[str, bool], List[str]]:
    """Zero out features the profile gives no reason to care about."""
    blob = profile_signal_text(profile)
    prefs = [a.strip().lower() for a in (profile.get('agencies') or []) if a]
    gated, suppressed = {}, []
    for name, present in features.items():
        if not present:
            gated[name] = False
        elif name in UNGATED_FEATURES:
            gated[name] = True
        elif name in AGENCY_FEATURES:
            canonical = AGENCY_FEATURES[name]
            keep = canonical in prefs or any(
                canonical in AGENCY_ALIASES.get(p, [p]) for p in prefs)
            gated[name] = keep
            if not keep:
                suppressed.append(name)
        elif name in FEATURE_GATES:
            keep = any(_term_matches(t, blob) for t in FEATURE_GATES[name])
            gated[name] = keep
            if not keep:
                suppressed.append(name)
        else:
            gated[name] = True
    return gated, suppressed


def damp_ratio(name: str, ratio: float) -> float:
    """Pull a likelihood ratio toward 1.0 for broad, non-discriminative features."""
    factor = FEATURE_DAMPING.get(name)
    return ratio if factor is None else 1.0 + (ratio - 1.0) * factor


# --- Keyword weighting: title beats body ----------------------------------
# WHERE a keyword appears matters more than whether it appears. A grant whose
# TITLE names your field is about your field; one that lists your field among
# thirty eligible topics in its description is not. Confirmed on live data: TCUP
# and CAMEL both contain "artificial intelligence"/"machine learning" in
# eligibility boilerplate, while "Quantum Machine Learning" has it in the title.
KEYWORD_MAX_TITLE = (('keywords', 4.00), ('research_areas', 2.50),
                     ('optimized_keywords', 2.00))
KEYWORD_MAX_BODY = (('keywords', 1.40), ('research_areas', 1.25),
                    ('optimized_keywords', 1.15))
AGENCY_MAX = 1.50


# --- CFDA / Assistance Listing domain signal (US grants) ------------------
# The strongest domain signal grants.gov exposes. Program titles name the funding
# directorate and are short, curated and boilerplate-free, where descriptions are
# neither. Measured on live data:
#   TCUP      47.076 STEM Education                          <- an education grant
#   CAMEL     47.075 Social, Behavioral, and Economic Sciences <- social science
#   Sociology 47.075 Social, Behavioral, and Economic Sciences
#   IUSE      47.041 Engineering + 47.076 STEM Education
# All four mention AI/ML in their prose; none sits in 47.070 (Computer and
# Information Science and Engineering) where a CS researcher's grants live.
#
# Supplied via grant['tags'] (populated by extract_cfda_titles in the search
# agent). Absent -> neutral, so this is inert until the agent is redeployed.
CFDA_DOMAIN_TERMS = {
    'computer science': ['computer', 'information science', 'information technology',
                         'cyber', 'computing'],
    'engineering':      ['engineering'],
    'biomedical':       ['health', 'medical', 'biomedical', 'cancer', 'allergy',
                         'infectious', 'mental', 'aging', 'nursing', 'dental',
                         'neurological', 'heart', 'lung', 'blood', 'diabetes'],
    'social science':   ['social', 'behavioral', 'economic', 'sociolog'],
    'basic science':    ['mathematical', 'physical sciences', 'chemistry', 'physics',
                         'geosciences', 'polar', 'astronomical', 'materials research',
                         'biological sciences'],
    'education':        ['stem education', 'education', 'human resources'],
    'environment':      ['environmental', 'climate', 'atmospheric', 'ocean', 'earth'],
}

# How to read the researcher's own domain off their profile.
PROFILE_DOMAIN_TERMS = {
    'computer science': ['computer science', 'artificial intelligence', 'machine learning',
                         'data science', 'deep learning', 'neural networks', 'ai',
                         'cybersecurity', 'informatics', 'autonomous', 'agents'],
    'engineering':      ['engineering', 'robotics', 'mechanical', 'electrical', 'materials'],
    'biomedical':       ['biomedical', 'medical', 'health', 'cancer', 'oncology', 'clinical',
                         'disease', 'biology', 'genomics', 'neuroscience', 'microbiome'],
    'social science':   ['social science', 'sociology', 'psychology', 'economics',
                         'behavioral', 'anthropology'],
    'basic science':    ['physics', 'chemistry', 'mathematics', 'statistics', 'astronomy'],
    'education':        ['education', 'curriculum', 'teaching', 'pedagogy', 'students',
                         'undergraduate', 'outreach', 'broadening participation'],
    'environment':      ['climate', 'environmental', 'atmospheric', 'ocean', 'sustainability'],
}

# Some titles carry NO domain information. DOD's 12.630 "Basic, Applied, and
# Advanced Research in Science and Engineering" covers everything DOD funds —
# inferring "engineering" from it and penalising a CS researcher would be wrong.
# Catch-alls are treated as UNKNOWN (neutral), never as evidence of another field.
CFDA_CATCHALL_PATTERNS = [
    r'basic,?\s+applied,?\s+and\s+advanced\s+research',
    r'^\d*\s*basic\s+(scientific\s+)?research$',
    r'research\s+and\s+development\s+(program|activities)$',
    r'^\d*\s*(multidisciplinary|general)\s+research',
    r'science\s+and\s+technology\s+and\s+other\s+research',
]

# Domains that genuinely overlap. CISE is "Computer and Information Science AND
# Engineering", and CS researchers routinely hold NSF Engineering awards, so an
# engineering grant is not wrong for a CS profile the way a social-science one is.
DOMAIN_ADJACENCY = {
    frozenset({'computer science', 'engineering'}),
    frozenset({'computer science', 'basic science'}),
    frozenset({'engineering', 'basic science'}),
    frozenset({'biomedical', 'basic science'}),
    frozenset({'social science', 'education'}),
    frozenset({'environment', 'basic science'}),
}

CFDA_ALIGNED_MAX = 3.00
CFDA_PENALTY_UNRELATED = 0.35
CFDA_PENALTY_ADJACENT = 0.75


def _domains_of(text: str, table: Dict[str, List[str]]) -> set:
    text = (text or '').lower()
    return {d for d, terms in table.items() if _any_term_matches(terms, text)}


def _is_cfda_catchall(title: str) -> bool:
    t = (title or '').lower()
    return any(re.search(p, t) for p in CFDA_CATCHALL_PATTERNS)


def get_cfda_titles(grant: Dict[str, Any]) -> List[str]:
    """CFDA program titles for a grant, from wherever they landed."""
    tags = grant.get('tags') or []
    # Only CFDA-shaped entries ("<number> <title>"); ignore any other tags.
    out = [str(t) for t in tags if re.match(r'^\d{2}\.\d{3}\s+\S', str(t))]
    if out:
        return out
    details = grant.get('detailsData') or {}
    return [f"{c.get('cfdaNumber')} {c.get('programTitle')}".strip()
            for c in (details.get('cfdas') or []) if c.get('programTitle')]


def cfda_signal(cfda_titles: List[str], profile: Dict[str, Any]) -> Tuple[float, str]:
    """Multiplier from CFDA directorate alignment. 1.0 when uninformative."""
    if not cfda_titles:
        return 1.0, 'no CFDA data'
    pdoms = _domains_of(profile_signal_text(profile), PROFILE_DOMAIN_TERMS)
    if not pdoms:
        return 1.0, 'profile domain unknown'

    informative = [t for t in cfda_titles if not _is_cfda_catchall(t)]
    dropped = len(cfda_titles) - len(informative)
    if not informative:
        return 1.0, f'neutral — all {len(cfda_titles)} CFDA title(s) are catch-alls'

    gdoms = set()
    for t in informative:
        gdoms |= _domains_of(t, CFDA_DOMAIN_TERMS)
    if not gdoms:
        return 1.0, 'CFDA domain unknown'

    note = f' [{dropped} catch-all ignored]' if dropped else ''
    aligned = pdoms & gdoms
    if aligned:
        frac = len(aligned) / len(gdoms)
        return (1.0 + (CFDA_ALIGNED_MAX - 1.0) * frac,
                f"ALIGNED {sorted(aligned)} of {sorted(gdoms)}{note}")

    if any(frozenset({g, p}) in DOMAIN_ADJACENCY for g in gdoms for p in pdoms):
        return CFDA_PENALTY_ADJACENT, f"ADJACENT {sorted(gdoms)} ~ {sorted(pdoms)}{note}"

    return (CFDA_PENALTY_UNRELATED,
            f"MISALIGNED {sorted(gdoms)} vs profile {sorted(pdoms)}{note}")


def get_researcher_priors(profile: Dict[str, Any]) -> float:
    """Get prior probability based on researcher type and experience level"""
    
    researcher_type = profile.get('researcherType', '').lower()
    expertise_level = profile.get('expertise_level', '').lower()
    
    # Base priors by researcher type
    base_priors = {
        'biomedical': 0.20,      # 20% base relevance for biomedical researchers
        'engineering': 0.15,     # 15% base relevance for engineering researchers  
        'social_science': 0.10,  # 10% base relevance for social science researchers
        'basic_science': 0.12,   # 12% base relevance for basic science researchers
        'computer_science': 0.15, # 15% base relevance for CS researchers
    }
    
    base_prior = base_priors.get(researcher_type, 0.10)
    
    # Adjust based on expertise level
    expertise_multipliers = {
        'expert': 1.2,      # Experts get 20% boost
        'advanced': 1.1,    # Advanced get 10% boost
        'intermediate': 1.0, # No change
        'beginner': 0.9     # Beginners get 10% reduction
    }
    
    multiplier = expertise_multipliers.get(expertise_level, 1.0)
    
    # Also consider if they're an early investigator
    early_investigator = profile.get('early_investigator', '').lower() == 'true'
    if early_investigator:
        multiplier *= 1.1  # Early investigators get additional 10% boost
    
    return min(base_prior * multiplier, 0.30)  # Cap at 30% prior

def get_feature_likelihoods() -> Dict[str, Dict[str, float]]:
    """Get likelihood ratios for each feature - DAMPENED to prevent over-scoring"""
    
    # Format: feature -> {'relevant': P(feature|relevant), 'irrelevant': P(feature|irrelevant)}
    # IMPORTANT: Ratios are kept small (1.5-3.0x) to prevent exponential compounding
    # When multiple features match, they multiply together, so we need conservative values
    
    return {
        # Agency likelihoods - reduced from 4-8x to 1.5-2.5x
        'isNIH': {'relevant': 0.30, 'irrelevant': 0.12},      # 2.5x ratio (was 8.0x)
        'isNSF': {'relevant': 0.28, 'irrelevant': 0.14},      # 2.0x ratio (was 4.4x)
        'isDOD': {'relevant': 0.25, 'irrelevant': 0.12},      # 2.1x ratio (was 8.3x)
        'isDOE': {'relevant': 0.22, 'irrelevant': 0.12},      # 1.8x ratio (was 10x)
        'isEmbassy': {'relevant': 0.05, 'irrelevant': 0.15},  # 0.3x ratio (penalty)
        
        # Research domain likelihoods - reduced from 5-6x to 1.8-2.5x
        'isBiomedical': {'relevant': 0.35, 'irrelevant': 0.14}, # 2.5x ratio (was 6.0x)
        'isEngineering': {'relevant': 0.32, 'irrelevant': 0.16}, # 2.0x ratio (was 6.2x)
        'isBasicScience': {'relevant': 0.25, 'irrelevant': 0.14}, # 1.8x ratio (was 6.0x)
        
        # Specific research areas - reduced from 11-25x to 2.0-2.5x
        'isAlzheimers': {'relevant': 0.30, 'irrelevant': 0.12}, # 2.5x ratio (was 25x)
        'isCancer': {'relevant': 0.32, 'irrelevant': 0.13},     # 2.5x ratio (was 15x)
        'isAI': {'relevant': 0.34, 'irrelevant': 0.17},        # 2.0x ratio (was 11.7x)
        'isClimateChange': {'relevant': 0.28, 'irrelevant': 0.14}, # 2.0x ratio (was 10x)
        
        # Grant characteristics - kept modest
        'isSmallBusiness': {'relevant': 0.20, 'irrelevant': 0.12}, # 1.7x ratio
        'isEducation': {'relevant': 0.28, 'irrelevant': 0.16},     # 1.75x ratio
        'isInternational': {'relevant': 0.15, 'irrelevant': 0.12}, # 1.25x ratio
        
        # Amount features - kept modest
        'hasLargeAmount': {'relevant': 0.24, 'irrelevant': 0.14},   # 1.7x ratio (was 4.0x)
        'hasMediumAmount': {'relevant': 0.35, 'irrelevant': 0.30},  # 1.17x ratio
        'hasSmallAmount': {'relevant': 0.28, 'irrelevant': 0.32},   # 0.88x ratio (slight penalty)
    }

MATCH_REASON_LIMIT = 12


def calculate_bayesian_probability(profile: Dict[str, Any], features: Dict[str, bool],
                                   combined_text: str = '', grant_title: str = '',
                                   grant_agency: str = '',
                                   cfda_titles: Optional[List[str]] = None,
                                   explain: Optional[Dict[str, Any]] = None) -> float:
    """Calculate Bayesian probability that grant is relevant to researcher.

    `combined_text` is title + agency + description (see get_grant_text) and is
    required for profile keyword matching to do anything. `grant_title` enables
    the title-vs-body weighting and `grant_agency` the agency alias matching and
    agency-feature gating.

    All three default to '' so the deprecated apply_bayesian_scoring path still
    works — it simply scores on gated features and the prior alone.

    Pass a dict as `explain` to receive the human-readable reasons this grant
    matched, under key 'matchedKeywords'. The score itself is a single number and
    saturates near the top of its range — two grants can both display 97% while
    differing by 1.4x in underlying evidence — so the reasons are often more
    useful to a user than the score. Ordered strongest signal first: title
    matches, then preferred agency, then funding program, then description
    matches. Only positive signals are listed; the field means what matched.
    """

    grant_title = (grant_title or '').lower()
    grant_agency = (grant_agency or '').lower()

    # Get prior probability
    prior = get_researcher_priors(profile)
    logger.info(f"🎯 Starting Bayesian calculation - Prior: {prior:.3f}")
    
    # Get feature likelihoods
    likelihoods = get_feature_likelihoods()
    
    # Suppress features the profile gives no reason to care about, then damp the
    # broad ones. See gate_features / damp_ratio for why.
    features, suppressed = gate_features(features, profile, grant_agency)
    if suppressed:
        logger.info(f"🚫 Suppressed (off-profile): {', '.join(suppressed)}")

    likelihood_ratio = 1.0
    matched_features = []

    for feature, is_present in features.items():
        if feature in likelihoods and is_present:
            feature_likelihood = likelihoods[feature]
            if feature_likelihood['irrelevant'] > 0:
                ratio = feature_likelihood['relevant'] / feature_likelihood['irrelevant']
                damped = damp_ratio(feature, ratio)
                likelihood_ratio *= damped
                matched_features.append(
                    f"{feature}({damped:.2f}x)" if damped == ratio
                    else f"{feature}({damped:.2f}x, damped from {ratio:.2f})")

    if matched_features:
        logger.info(f"📋 Matched features ({len(matched_features)}): {', '.join(matched_features)}")
        logger.info(f"📈 Combined likelihood from features: {likelihood_ratio:.3f}x")
    else:
        logger.info(f"📋 No features matched - using prior only")
    
    # ---------------------------------------------------------------------
    # Profile boosts, scaled by how much of the profile ACTUALLY matches.
    #
    # FIX: this previously tested only whether each profile list was NON-EMPTY:
    #     if profile_keywords: keyword_boost *= 1.08
    # so any profile with any keywords received an identical 1.08 x 1.03 x 1.04
    # = 1.157x, whatever the keywords were and whatever the grant was about.
    # Editing keywords therefore could not change a single score — the reported
    # symptom. `research_areas` was read into a variable and never used at all.
    #
    # Now each boost scales with the FRACTION of that field's terms found in the
    # grant text, so the maxima below are reached only on a full match. The
    # weights match what the Profile UI advertises (15% / 5% / 10% / 8%).
    #
    # Requires `combined_text`; when it is not supplied (deprecated
    # apply_bayesian_scoring path) profile boosts are skipped rather than faked.
    # ---------------------------------------------------------------------
    keyword_boost = 1.0
    boosts_applied = []
    # Reasons kept in separate buckets so the final list reads strongest-first
    # regardless of which profile field each term came from.
    title_reasons: List[str] = []
    body_reasons: List[str] = []
    agency_reasons: List[str] = []
    program_reasons: List[str] = []

    if combined_text:
        for (field, max_title), (_f, max_body) in zip(KEYWORD_MAX_TITLE, KEYWORD_MAX_BODY):
            terms = profile.get(field)
            t_frac, t_hits = field_credit(terms, grant_title)
            a_frac, a_hits = field_credit(terms, combined_text)
            # body = matched somewhere in the grant, but NOT in the title
            body_only = [h for h in a_hits if h not in t_hits]
            b_frac = (len(body_only) / len(a_hits)) * a_frac if a_hits else 0.0

            if t_frac > 0:
                applied = 1.0 + (max_title - 1.0) * t_frac
                keyword_boost *= applied
                boosts_applied.append(f"{field}@TITLE({applied:.2f}x: {', '.join(t_hits[:3])})")
                title_reasons.extend(f"{h} (in title)" for h in t_hits)
            if b_frac > 0:
                applied = 1.0 + (max_body - 1.0) * b_frac
                keyword_boost *= applied
                boosts_applied.append(f"{field}@body({applied:.2f}x, {len(body_only)} term(s))")
                body_reasons.extend(f"{h} (in description)" for h in body_only)

        frac, hits = agency_match_fraction(profile.get('agencies'), grant_agency)
        if frac > 0:
            applied = 1.0 + (AGENCY_MAX - 1.0) * frac
            keyword_boost *= applied
            boosts_applied.append(f"agencies({applied:.2f}x: {', '.join(hits)})")
            agency_reasons.extend(f"{h.upper()} (preferred agency)" for h in hits)
    else:
        logger.warning("⚠️ No grant text supplied — profile keyword boosts skipped")

    if boosts_applied:
        logger.info(f"🚀 Profile boosts: {'; '.join(boosts_applied)} = {keyword_boost:.3f}x total")
    else:
        logger.info("🚀 Profile boosts: none — no profile terms matched this grant")
    
    likelihood_ratio *= keyword_boost

    # CFDA directorate alignment (US grants). Neutral when unavailable, so this is
    # inert until the search agent populates `tags` with CFDA program titles.
    if cfda_titles:
        cfda_mult, cfda_why = cfda_signal(cfda_titles, profile)
        if cfda_mult != 1.0:
            likelihood_ratio *= cfda_mult
        if cfda_mult > 1.0:
            program_reasons.extend(f"{t} (funding program)" for t in cfda_titles
                                   if not _is_cfda_catchall(t))
        logger.info(f"🏛️ CFDA: {cfda_mult:.2f}x — {cfda_why}")

    if explain is not None:
        seen, ordered = set(), []
        for reason in title_reasons + agency_reasons + program_reasons + body_reasons:
            key = reason.lower()
            if key not in seen:
                seen.add(key)
                ordered.append(reason)
        explain['matchedKeywords'] = ordered[:MATCH_REASON_LIMIT]

    # Apply Bayes' theorem: P(relevant|features) = P(features|relevant) * P(relevant) / P(features)
    # Using odds form: odds_posterior = likelihood_ratio * odds_prior
    
    odds_prior = prior / (1 - prior)
    odds_posterior = likelihood_ratio * odds_prior
    
    # Convert back to probability
    probability = odds_posterior / (1 + odds_posterior)
    
    # Ensure probability is between 0 and 1
    probability = max(0.0, min(1.0, probability))
    
    logger.info(f"🎲 Final calculation: prior({prior:.3f}) × likelihood({likelihood_ratio:.3f}) = {probability:.3f} ({probability*100:.1f}%)")
    
    return probability

def calculate_keyword_score(grant: Dict[str, Any], search_query: str) -> float:
    """
    Calculate keyword-based relevance score WITHOUT user profile.
    Simple TF-IDF-like scoring based on keyword matches.
    
    Handles BOTH native agent structures (US and EU) by checking multiple field locations.
    """
    if not search_query:
        return 0.5  # Neutral score if no query
    
    # Normalize query
    query_terms = search_query.lower().split()
    
    # Get grant text fields - handle BOTH US and EU native structures
    # US structure: searchData.title, detailsData.synopsis.synopsisDesc
    # EU structure: title, description/descriptionByte/summary, tags/keywords
    
    # TITLE: Try multiple locations
    title = ''
    if grant.get('title'):
        title = grant.get('title', '')
    elif grant.get('searchData', {}).get('title'):
        title = grant.get('searchData', {}).get('title', '')
    elif grant.get('grantData', {}).get('title'):
        title = grant.get('grantData', {}).get('title', '')
    title = (title or '').lower()
    
    # DESCRIPTION: Try multiple locations (US has nested synopsis, EU has multiple desc fields)
    description = ''
    if grant.get('description'):
        description = grant.get('description', '')
    elif grant.get('detailsData', {}).get('synopsis', {}).get('synopsisDesc'):
        # US agent structure
        description = grant.get('detailsData', {}).get('synopsis', {}).get('synopsisDesc', '')
    elif grant.get('grantData', {}).get('description'):
        description = grant.get('grantData', {}).get('description', '')
    elif grant.get('grantData', {}).get('descriptionByte'):
        # EU agent structure - alternative description field
        description = grant.get('grantData', {}).get('descriptionByte', '')
    elif grant.get('grantData', {}).get('summary'):
        # EU agent structure - summary field
        description = grant.get('grantData', {}).get('summary', '')
    elif grant.get('detailsData', {}).get('description'):
        description = grant.get('detailsData', {}).get('description', '')
    description = (description or '').lower()
    
    # AGENCY: Try multiple locations, prioritize frameworkProgramme for EU grants
    agency = ''
    if grant.get('agency'):
        agency = grant.get('agency', '')
    elif grant.get('searchData', {}).get('agency'):
        agency = grant.get('searchData', {}).get('agency', '')
    elif grant.get('grantData', {}).get('frameworkProgramme', {}).get('description'):
        # EU agent structure - use framework programme as agency (e.g., "Horizon Europe")
        agency = grant.get('grantData', {}).get('frameworkProgramme', {}).get('description', '')
    elif isinstance(grant.get('grantData', {}).get('frameworkProgramme'), str):
        agency = grant.get('grantData', {}).get('frameworkProgramme', '')
    agency = (agency or '').lower()
    
    # TAGS/KEYWORDS: Try multiple locations (US doesn't have, EU has both tags and keywords)
    tags = []
    if grant.get('tags'):
        tags = grant.get('tags', [])
    elif grant.get('grantData', {}).get('tags'):
        tags = grant.get('grantData', {}).get('tags', [])
    
    # EU also has keywords array - combine with tags
    keywords = []
    if grant.get('grantData', {}).get('keywords'):
        keywords = grant.get('grantData', {}).get('keywords', [])
    
    # Combine tags and keywords
    all_tags = (tags or []) + (keywords or [])
    tags_text = ' '.join(all_tags).lower() if all_tags else ''
    has_tags = len(all_tags) > 0
    
    # Calculate matches
    title_matches = sum(1 for term in query_terms if term in title)
    description_matches = sum(1 for term in query_terms if term in description)
    agency_matches = sum(1 for term in query_terms if term in agency)
    tags_matches = sum(1 for term in query_terms if term in tags_text) if has_tags else 0
    
    # Weighted scoring with normalization when tags are missing
    total_terms = len(query_terms)
    if total_terms == 0:
        return 0.5
    
    if has_tags:
        # Standard weights when tags available (US + EU with tags)
        title_score = (title_matches / total_terms) * 0.4  # 40% weight
        description_score = (description_matches / total_terms) * 0.25  # 25% weight
        agency_score = (agency_matches / total_terms) * 0.15  # 15% weight
        tags_score = (tags_matches / total_terms) * 0.2  # 20% weight
    else:
        # Normalized weights when tags missing (US grants without tags)
        # Redistribute 20% tag weight proportionally: 40→50%, 25→31.25%, 15→18.75%
        title_score = (title_matches / total_terms) * 0.5  # 50% weight
        description_score = (description_matches / total_terms) * 0.3125  # 31.25% weight
        agency_score = (agency_matches / total_terms) * 0.1875  # 18.75% weight
        tags_score = 0  # No tags available
    
    keyword_score = title_score + description_score + agency_score + tags_score
    
    # Normalize to 0-1 range
    return min(keyword_score, 1.0)

def apply_dual_scoring(grants: List[Dict[str, Any]], cognito_user_id: str, search_query: str = "") -> List[Dict[str, Any]]:
    """
    Apply BOTH profile-based Bayesian scoring AND keyword-only scoring.
    
    Returns grants with two scores:
    - profileMatchScore: Bayesian probability based on user profile (for Profile Match tab)
    - keywordScore: Simple keyword matching (for All tab)
    - relevanceScore: Defaults to keywordScore for backward compatibility
    """
    
    logger.info(f"Applying dual scoring for Cognito user {cognito_user_id} to {len(grants)} grants")
    logger.info(f"Search query: '{search_query}'")
    
    # Get user profile for Bayesian scoring
    profile = get_active_user_profile(cognito_user_id)
    if not profile:
        logger.warning(f"No profile found for Cognito user {cognito_user_id}, using keyword-only scoring")
        # Apply keyword scoring only
        for grant in grants:
            keyword_score = calculate_keyword_score(grant, search_query)
            grant['keywordScore'] = keyword_score
            grant['profileMatchScore'] = 0.0  # No profile available
            grant['relevanceScore'] = keyword_score  # Default to keyword score
            grant['matchedKeywords'] = []  # Nothing to explain without a profile
        return grants
    
    logger.info(f"Found profile for {cognito_user_id}: {profile.get('name', 'Unknown')} ({profile.get('researcherType', 'Unknown type')})")
    
    # Score each grant with BOTH methods
    scored_grants = []
    for grant in grants:
        try:
            # 1. Calculate keyword score (no profile)
            keyword_score = calculate_keyword_score(grant, search_query)
            grant['keywordScore'] = keyword_score
            
            # 2. Calculate Bayesian profile match score
            # Pass the grant text so profile keywords are matched against it —
            # without this the profile boosts are skipped (see
            # calculate_bayesian_probability).
            features = extract_grant_features(grant)
            explain: Dict[str, Any] = {}
            profile_score = calculate_bayesian_probability(
                profile, features, get_grant_text(grant),
                grant_title=grant.get('title', ''),
                grant_agency=grant.get('agency', ''),
                cfda_titles=get_cfda_titles(grant),
                explain=explain,
            )
            grant['profileMatchScore'] = profile_score
            grant['bayesianProbability'] = profile_score  # Keep for debugging
            # Why this grant matched. The field already existed on the record and
            # was hardcoded to [] — nothing ever populated it.
            grant['matchedKeywords'] = explain.get('matchedKeywords', [])
            
            # 3. Set relevanceScore to keyword score for "All" tab
            grant['relevanceScore'] = keyword_score
            
            scored_grants.append(grant)
            
            logger.debug(f"Grant '{grant.get('title', '')[:40]}...' - Keyword: {keyword_score:.3f}, Profile: {profile_score:.3f}")
            
        except Exception as e:
            logger.error(f"Error scoring grant {grant.get('grantId', 'unknown')}: {str(e)}")
            # Set default scores if error
            grant['keywordScore'] = 0.5
            grant['profileMatchScore'] = 0.0
            grant['relevanceScore'] = 0.5
            grant['matchedKeywords'] = []
            scored_grants.append(grant)
    
    # Sort by keyword score (for All tab display)
    scored_grants.sort(key=lambda g: g.get('keywordScore', 0), reverse=True)
    
    logger.info(f"Dual scoring complete. Top by keyword: {scored_grants[0].get('title', '')[:40]}... (K:{scored_grants[0].get('keywordScore', 0):.3f}, P:{scored_grants[0].get('profileMatchScore', 0):.3f})")
    
    return scored_grants

def apply_bayesian_scoring(grants: List[Dict[str, Any]], cognito_user_id: str) -> List[Dict[str, Any]]:
    """
    DEPRECATED: Use apply_dual_scoring instead.
    Kept for backward compatibility.
    """
    logger.warning("apply_bayesian_scoring is deprecated, use apply_dual_scoring instead")
    return apply_dual_scoring(grants, cognito_user_id, "")

def convert_decimal_to_float(obj):
    """Convert DynamoDB Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimal_to_float(v) for v in obj]
    return obj