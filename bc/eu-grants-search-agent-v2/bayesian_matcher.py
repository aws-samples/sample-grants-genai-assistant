#!/usr/bin/env python3
"""
Bayesian Grant Matching Module

Implements the Bayesian probability algorithm for matching grants to researcher profiles.
Based on the algorithm described in BAYESIAN_GRANT_MATCHING.md
"""

import json
import logging
import traceback
from typing import Dict, List, Any, Optional
import boto3
from decimal import Decimal

logger = logging.getLogger(__name__)

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
        
        # NEW: Fallback to default profile for any user without a specific profile
        logger.info(f"⚠️ No specific profile found for user {cognito_user_id}, checking for default profile")
        
        response = user_profile_table.scan(
            FilterExpression='default_profile = :default_val',
            ExpressionAttributeValues={':default_val': True}
        )
        
        default_profiles = response.get('Items', [])
        if default_profiles:
            logger.info(f"✅ Found default profile: {default_profiles[0].get('name', 'Unknown')} ({default_profiles[0].get('researcherType', 'Unknown type')})")
            return default_profiles[0]
        
        logger.warning(f"❌ No profile found for Cognito user {cognito_user_id} and no default profile available")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error fetching profile for Cognito user {cognito_user_id}: {str(e)}")
        return None

def extract_grant_features(grant: Dict[str, Any]) -> Dict[str, bool]:
    """Extract boolean features from a grant for Bayesian analysis"""
    
    title = (grant.get('title', '') or '').lower()
    agency = (grant.get('agency', '') or '').lower()
    description = (grant.get('description', '') or '').lower()
    
    logger.debug(f"   🔍 Extracting features from: title_len={len(title)}, agency_len={len(agency)}, desc_len={len(description)}")
    
    # Combine all text for analysis
    combined_text = f"{title} {agency} {description}"
    logger.debug(f"   🔍 Combined text length: {len(combined_text)} chars")
    
    features = {
        # Agency features
        'isNIH': any(term in agency for term in ['nih', 'national institutes of health', 'nidcr', 'ninds', 'nci']),
        'isNSF': any(term in agency for term in ['nsf', 'national science foundation']),
        'isDOD': any(term in agency for term in ['dod', 'department of defense', 'darpa', 'army', 'navy', 'air force']),
        'isDOE': any(term in agency for term in ['doe', 'department of energy']),
        'isEmbassy': any(term in agency for term in ['embassy', 'consulate', 'diplomatic']),
        
        # Research domain features
        'isBiomedical': any(term in combined_text for term in [
            'biomedical', 'medical', 'health', 'disease', 'clinical', 'biological',
            'genomics', 'neuroscience', 'cancer', 'alzheimer', 'diabetes'
        ]),
        'isEngineering': any(term in combined_text for term in [
            'engineering', 'technology', 'materials', 'mechanical', 'electrical',
            'computer science', 'robotics', 'ai', 'artificial intelligence'
        ]),
        'isBasicScience': any(term in combined_text for term in [
            'basic research', 'fundamental', 'theoretical', 'physics', 'chemistry',
            'mathematics', 'statistics'
        ]),
        
        # Specific research areas
        'isAlzheimers': any(term in combined_text for term in ['alzheimer', 'dementia', 'neurodegeneration']),
        'isCancer': any(term in combined_text for term in ['cancer', 'oncology', 'tumor', 'carcinoma']),
        'isAI': any(term in combined_text for term in ['artificial intelligence', 'machine learning', 'ai', 'ml']),
        'isClimateChange': any(term in combined_text for term in ['climate', 'environmental', 'sustainability']),
        
        # Grant characteristics
        'isSmallBusiness': any(term in combined_text for term in ['sbir', 'sttr', 'small business']),
        'isEducation': any(term in combined_text for term in ['education', 'training', 'student', 'fellowship']),
        'isInternational': any(term in combined_text for term in ['international', 'global', 'foreign']),
        
        # Amount features (EU grants use awardCeiling, US grants use amount)
        # Safely handle both numeric and string values
        'hasLargeAmount': False,
        'hasMediumAmount': False,
        'hasSmallAmount': False,
    }
    
    # Safely extract amount value
    amount_value = grant.get('awardCeiling', grant.get('amount', 0))
    if isinstance(amount_value, (int, float)) and amount_value > 0:
        features['hasLargeAmount'] = amount_value > 1000000  # > $1M
        features['hasMediumAmount'] = 100000 <= amount_value <= 1000000  # $100K - $1M
        features['hasSmallAmount'] = 0 < amount_value < 100000  # < $100K
    
    return features
    
    return features

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

def calculate_bayesian_probability(profile: Dict[str, Any], features: Dict[str, bool]) -> float:
    """Calculate Bayesian probability that grant is relevant to researcher"""
    
    # Get prior probability
    prior = get_researcher_priors(profile)
    logger.info(f"🎯 Starting Bayesian calculation - Prior: {prior:.3f}")
    
    # Get feature likelihoods
    likelihoods = get_feature_likelihoods()
    
    # Calculate likelihood ratio for each feature
    likelihood_ratio = 1.0
    active_features = []
    
    for feature, is_present in features.items():
        if feature in likelihoods and is_present:
            feature_likelihood = likelihoods[feature]
            
            # Calculate likelihood ratio: P(feature|relevant) / P(feature|irrelevant)
            if feature_likelihood['irrelevant'] > 0:
                ratio = feature_likelihood['relevant'] / feature_likelihood['irrelevant']
                likelihood_ratio *= ratio
                active_features.append(f"{feature}({ratio:.1f}x)")
    
    if active_features:
        logger.info(f"📋 Matched features ({len(active_features)}): {', '.join(active_features)}")
        logger.info(f"📈 Combined likelihood from features: {likelihood_ratio:.3f}x")
    else:
        logger.info(f"📋 No features matched - using prior only")
    
    # Additional boost for keyword matches with different weights
    profile_keywords = profile.get('keywords', [])  # Primary keywords - higher weight
    optimized_keywords = profile.get('optimized_keywords', [])  # Secondary keywords - lower weight
    profile_research_areas = profile.get('research_areas', [])
    
    # Check for direct keyword matches (this gives additional confidence)
    keyword_boost = 1.0
    boosts_applied = []
    
    # REDUCED boosts to prevent over-scoring when combined with feature matches
    # Primary keywords get 8% boost (reduced from 15%)
    if profile_keywords:
        keyword_boost *= 1.08
        boosts_applied.append(f"keywords(1.08x)")
    
    # Optimized keywords get 3% boost (reduced from 5%)
    if optimized_keywords:
        keyword_boost *= 1.03
        boosts_applied.append(f"opt_keywords(1.03x)")
    
    # Check for preferred agencies - 4% boost (reduced from 8%)
    preferred_agencies = profile.get('agencies', [])
    if preferred_agencies:
        keyword_boost *= 1.04
        boosts_applied.append(f"agencies(1.04x)")
    
    if boosts_applied:
        logger.info(f"🚀 Profile boosts: {', '.join(boosts_applied)} = {keyword_boost:.3f}x total")
    
    likelihood_ratio *= keyword_boost
    
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
    """
    if not search_query:
        return 0.5  # Neutral score if no query
    
    # Normalize query
    query_terms = search_query.lower().split()
    
    # Get grant text fields
    title = (grant.get('title', '') or '').lower()
    description = (grant.get('description', '') or '').lower()
    agency = (grant.get('agency', '') or '').lower()
    
    # Calculate matches
    title_matches = sum(1 for term in query_terms if term in title)
    description_matches = sum(1 for term in query_terms if term in description)
    agency_matches = sum(1 for term in query_terms if term in agency)
    
    # Weighted scoring (title worth more than description)
    total_terms = len(query_terms)
    if total_terms == 0:
        return 0.5
    
    title_score = (title_matches / total_terms) * 0.5  # 50% weight
    description_score = (description_matches / total_terms) * 0.3  # 30% weight
    agency_score = (agency_matches / total_terms) * 0.2  # 20% weight
    
    keyword_score = title_score + description_score + agency_score
    
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
    
    logger.info(f"🔍 DUAL SCORING: Starting for user {cognito_user_id} with {len(grants)} grants")
    logger.info(f"🔍 Search query: '{search_query}'")
    
    # Get user profile for Bayesian scoring
    profile = get_active_user_profile(cognito_user_id)
    if not profile:
        logger.warning(f"❌ DUAL SCORING: No profile found for user {cognito_user_id}, using keyword-only scoring")
        # Apply keyword scoring only
        for grant in grants:
            keyword_score = calculate_keyword_score(grant, search_query)
            grant['keywordScore'] = keyword_score
            grant['profileMatchScore'] = 0.0  # No profile available
            grant['relevanceScore'] = keyword_score  # Default to keyword score
        return grants
    
    logger.info(f"✅ DUAL SCORING: Found profile '{profile.get('name', 'Unknown')}' (type: {profile.get('researcherType', 'Unknown')})")
    
    # Score each grant with BOTH methods
    scored_grants = []
    for i, grant in enumerate(grants, 1):
        try:
            grant_title = grant.get('title', 'N/A')[:40]
            
            # 1. Calculate keyword score (no profile)
            keyword_score = calculate_keyword_score(grant, search_query)
            grant['keywordScore'] = keyword_score
            
            # 2. Calculate Bayesian profile match score
            features = extract_grant_features(grant)
            profile_score = calculate_bayesian_probability(profile, features)
            grant['profileMatchScore'] = profile_score
            grant['bayesianProbability'] = profile_score  # Keep for debugging
            
            # 3. Set relevanceScore to profile score (used for filtering/ranking)
            # For agent discovery, we use profile matching, not keyword matching
            grant['relevanceScore'] = profile_score
            
            scored_grants.append(grant)
            
            if i <= 3:  # Log first 3 grants
                logger.info(f"Grant #{i}: '{grant_title}...' - Keyword: {keyword_score:.3f}, Profile: {profile_score:.3f}")
            
        except Exception as e:
            logger.error(f"❌ DUAL SCORING: Error scoring grant {grant.get('grantId', 'unknown')}: {str(e)}")
            logger.error(f"   Traceback: {traceback.format_exc()}")
            # Set default scores if error
            grant['keywordScore'] = 0.5
            grant['profileMatchScore'] = 0.0
            grant['relevanceScore'] = 0.5
            scored_grants.append(grant)
    
    # Sort by keyword score (for All tab display)
    scored_grants.sort(key=lambda g: g.get('keywordScore', 0), reverse=True)
    
    if scored_grants:
        top_grant = scored_grants[0]
        logger.info(f"🏆 DUAL SCORING: Top by keyword: '{top_grant.get('title', '')[:40]}...' (K:{top_grant.get('keywordScore', 0):.3f}, P:{top_grant.get('profileMatchScore', 0):.3f})")
    
    return scored_grants

def apply_bayesian_scoring(grants: List[Dict[str, Any]], cognito_user_id: str) -> List[Dict[str, Any]]:
    """
    DEPRECATED: Use apply_dual_scoring instead.
    Kept for backward compatibility.
    """
    logger.warning("apply_bayesian_scoring is deprecated, use apply_dual_scoring instead")
    return apply_dual_scoring(grants, cognito_user_id, "")
    
    logger.info(f"✅ BAYESIAN MATCHER: Complete - scored {len(scored_grants)} grants")
    
    return scored_grants

def convert_decimal_to_float(obj):
    """Convert DynamoDB Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimal_to_float(v) for v in obj]
    return obj