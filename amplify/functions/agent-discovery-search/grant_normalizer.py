"""
Grant Normalizer for Multi-Region Agent Discovery

Normalizes US and EU grant formats into a common structure for merging and filtering.
"""

import logging
from typing import Dict, Any, List
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def normalize_us_grant(grant: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize US grant from GrantRecord table to common format"""
    try:
        return {
            'grantId': grant.get('grantId', ''),
            'title': grant.get('title', ''),
            'agency': grant.get('agency', ''),
            'profileMatchScore': float(grant.get('profileMatchScore', 0)),
            'relevanceScore': float(grant.get('relevanceScore', 0)),
            'amount': float(grant.get('amount', 0)) if grant.get('amount') else None,
            'deadline': grant.get('deadline', ''),
            'closeDate': grant.get('closeDate', ''),
            'description': grant.get('description', ''),
            'source': 'US',
            'sourceTable': 'GrantRecord',
            # Preserve all original fields for S3 storage
            '_original': grant
        }
    except Exception as e:
        logger.error(f"Error normalizing US grant: {e}")
        raise


def normalize_eu_grant(grant: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize EU grant from EuGrantRecord table to common format"""
    try:
        # Extract framework programme as agency (more specific than "European Commission")
        # frameworkProgramme can be: "Horizon Europe", "Digital Europe", "LIFE", "Connecting Europe", "EUAF"
        agency = 'European Commission'  # Default fallback
        
        # Try to get framework programme from various locations
        if grant.get('euFrameworkProgramme'):
            agency = grant.get('euFrameworkProgramme')
        elif grant.get('frameworkProgramme'):
            fp = grant.get('frameworkProgramme')
            if isinstance(fp, dict):
                agency = fp.get('description') or fp.get('title') or fp.get('abbreviation') or 'European Commission'
            elif isinstance(fp, str):
                agency = fp
        
        return {
            'grantId': grant.get('grantId', ''),
            'title': grant.get('title', ''),
            'agency': agency,  # Use framework programme as agency
            'profileMatchScore': float(grant.get('profileMatchScore', 0)),
            'relevanceScore': float(grant.get('relevanceScore', 0)),
            'amount': float(grant.get('amount', 0)) if grant.get('amount') else None,
            'deadline': grant.get('deadline', ''),
            'closeDate': grant.get('deadline', ''),  # EU uses deadline field
            'description': grant.get('description', ''),
            'source': 'EU',
            'sourceTable': 'EuGrantRecord',
            # EU-specific fields
            'euReference': grant.get('euReference', ''),
            'euIdentifier': grant.get('euIdentifier', ''),
            'euFrameworkProgramme': agency,  # Store the extracted framework programme
            # Preserve all original fields for S3 storage
            '_original': grant
        }
    except Exception as e:
        logger.error(f"Error normalizing EU grant: {e}")
        raise


def normalize_grants(us_grants: List[Dict[str, Any]], eu_grants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalize and merge US and EU grants into common format
    
    Args:
        us_grants: List of grants from GrantRecord table
        eu_grants: List of grants from EuGrantRecord table
    
    Returns:
        List of normalized grants in common format
    """
    normalized = []
    
    # Normalize US grants
    for grant in us_grants:
        try:
            normalized.append(normalize_us_grant(grant))
        except Exception as e:
            logger.error(f"Skipping US grant due to normalization error: {e}")
            continue
    
    # Normalize EU grants
    for grant in eu_grants:
        try:
            normalized.append(normalize_eu_grant(grant))
        except Exception as e:
            logger.error(f"Skipping EU grant due to normalization error: {e}")
            continue
    
    logger.info(f"✅ Normalized {len(us_grants)} US grants + {len(eu_grants)} EU grants = {len(normalized)} total grants")
    
    return normalized


def convert_decimal_to_float(obj: Any) -> Any:
    """Recursively convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimal_to_float(item) for item in obj]
    return obj
