#!/usr/bin/env python3
"""
US Grants Search Agent V2 - AgentCore Native with Async Tasks
Version: 2.0 (Testing CDK Update Workflow)

This agent is a self-contained orchestrator that:
1. Receives search request from initiator Lambda
2. Returns immediately with "STARTED" status
3. Spawns background thread for long-running work
4. Writes progress to DynamoDB as it works
5. Publishes events to AppSync for real-time UI updates

Key differences from V1:
- Uses app.add_async_task() for background processing
- Writes directly to DynamoDB (no processor Lambda)
- Publishes directly to AppSync (no processor Lambda)
- Supports up to 8-hour execution
- Self-contained - no external orchestration needed

Dependencies:
- bedrock-agentcore: AgentCore Runtime SDK
- boto3: AWS SDK for DynamoDB/AppSync
- httpx: HTTP client for grants.gov API
"""

import re
import logging
import httpx
import json
import html
import threading
import time
import boto3
import os
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from bedrock_agentcore.runtime import BedrockAgentCoreApp

# Configure logging
# CRITICAL: stream=sys.stdout so AgentCore captures logs (it captures stdout, not stderr)
import sys
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)

# Initialize AgentCore app
app = BedrockAgentCoreApp()

# Get AWS region from environment (set by AgentCore Runtime)
AWS_REGION = os.environ.get('AWS_REGION')
if not AWS_REGION:
    raise ValueError("AWS_REGION environment variable not set")

# Initialize AWS clients (will use execution role)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
ssm = boto3.client('ssm', region_name=AWS_REGION)

# Table references - will be initialized in invoke() with names from payload
grant_records_table = None
search_event_table = None

# AppSync client - will be initialized in invoke() with endpoint from payload
appsync_client = None

# Bayesian matcher will be imported AFTER setting USER_PROFILE_TABLE env var
# This is done in invoke() before calling apply_dual_scoring
BAYESIAN_SCORING_AVAILABLE = False
apply_dual_scoring = None

# ============================================================================
# SIMPLE KEYWORD MAPPINGS (no spacy needed)
# ============================================================================

AGENCY_CODE_MAPPINGS_ONLY = {
    "hhs": "HHS-NIH11",
    "dod": "DOD",
    "doc": "DOC",
    "nasa": "NASA",
    "neh": "NEH",
    "usda": "USDA",
    "dhs": "DHS",
    "dol": "DOL",
    "dot": "DOT",
    "va": "VA",
    "hud": "HUD",
    "epa": "EPA",
    "ed": "ED",
    "nih": "HHS-NIH11",
    "cdc": "HHS-CDC",
    "ahrq": "HHS-AHRQ",
    "fema": "DHS-DHS",
    "onr": "DOD-ONR",
    "navair": "DOD-ONR-AIR",
    "darpa dso": "DOD-DARPA-DSO",
    "nsf": "NSF",
}

STATUS_MAPPINGS = {
    "posted": "posted",
    "closed": "closed",
    "archived": "archived",
    "forecasted": "forecasted",
    "active": "posted",
    "open": "posted",
}

FUNDING_INSTRUMENT_MAPPINGS = {
    "grants": "G",
    "grant": "G",
    "cooperative agreements": "CA",
    "cooperative agreement": "CA",
    "contracts": "PC",
    "contract": "PC",
    "procurement": "PC",
}

# ============================================================================
# MAIN ENTRYPOINT - Returns immediately, spawns background thread
# ============================================================================

@app.entrypoint
def invoke(payload):
    """
    Main entrypoint - returns immediately with "STARTED" status
    
    Background thread handles:
    - Calling grants.gov API
    - Applying Bayesian scoring
    - Writing to DynamoDB
    - Publishing to AppSync
    """
    global grant_records_table, search_event_table
    
    try:
        logger.info(f"[V2] Agent invoked with payload: {payload}")
        
        # Extract parameters
        session_id = payload.get('sessionId')
        query = payload.get('query')
        cognito_user_id = payload.get('cognitoUserId')
        filters = payload.get('filters', {})
        sources = payload.get('sources', ['GRANTS_GOV'])
        
        # Get table names from payload (passed by Lambda)
        table_names = payload.get('tableNames', {})
        grant_records_table_name = table_names.get('grantRecords')
        search_event_table_name = table_names.get('searchEvent')
        user_profile_table_name = table_names.get('userProfile')
        appsync_endpoint = payload.get('appsyncEndpoint')
        graphql_api_id = payload.get('graphqlApiId')
        
        if not grant_records_table_name or not search_event_table_name:
            raise ValueError("Missing required table names in payload")
        
        if not appsync_endpoint or not graphql_api_id:
            raise ValueError("Missing appsyncEndpoint or graphqlApiId in payload")
        
        if not session_id or not query:
            raise ValueError("Missing required parameters: sessionId, query")
        
        logger.info(f"[V2] Session: {session_id}, Query: {query}, User: {cognito_user_id}")
        logger.info(f"[V2] Using tables: {grant_records_table_name}, {search_event_table_name}")
        logger.info(f"[V2] AppSync endpoint: {appsync_endpoint}")
        
        # Set USER_PROFILE_TABLE environment variable BEFORE importing bayesian_matcher
        if user_profile_table_name:
            os.environ['USER_PROFILE_TABLE'] = user_profile_table_name
            logger.info(f"[V2] Set USER_PROFILE_TABLE: {user_profile_table_name}")
        
        # Set APPSYNC_ENDPOINT and GRAPHQL_API_ID for AppSync client
        os.environ['APPSYNC_ENDPOINT'] = appsync_endpoint
        os.environ['GRAPHQL_API_ID'] = graphql_api_id
        
        # NOW import bayesian_matcher (after setting environment variable)
        global BAYESIAN_SCORING_AVAILABLE, apply_dual_scoring, appsync_client
        try:
            from bayesian_matcher import apply_dual_scoring as _apply_dual_scoring
            apply_dual_scoring = _apply_dual_scoring
            BAYESIAN_SCORING_AVAILABLE = True
            logger.info("[V2] ✅ Successfully imported bayesian_matcher module")
        except Exception as e:
            BAYESIAN_SCORING_AVAILABLE = False
            logger.error(f"[V2] ❌ Failed to import bayesian_matcher: {str(e)}")
            logger.error("[V2] ⚠️ Bayesian scoring will be DISABLED")
        
        # Initialize AppSync client for mutations (IAM auth only)
        try:
            from appsync_client import AppSyncClient
            appsync_client = AppSyncClient()
            logger.info("[V2] ✅ AppSync client initialized")
        except Exception as e:
            logger.error(f"[V2] ❌ Failed to initialize AppSync client: {str(e)}")
            appsync_client = None
        
        # Initialize tables with names from payload (make them global for background thread)
        grant_records_table = dynamodb.Table(grant_records_table_name)
        search_event_table = dynamodb.Table(search_event_table_name)
        
        # Start async task tracking
        task_id = app.add_async_task("grant_search", {
            "sessionId": session_id,
            "query": query,
            "cognitoUserId": cognito_user_id
        })
        
        logger.info(f"[V2] Started async task: {task_id}")
        
        # Spawn background thread for long-running work
        def background_search():
            try:
                logger.info(f"[V2] Background thread started for session {session_id}")
                
                # ============================================================
                # STEP 1: SEARCH GRANTS.GOV API
                # ============================================================
                logger.info(f"[V2] ========== STEP 1: SEARCHING GRANTS.GOV ==========")
                publish_search_event(session_id, 'PROGRESS', {
                    'message': 'Searching grants.gov...',
                    'step': 1,
                    'totalSteps': 4
                }, search_event_table, cognito_user_id)
                
                grants = search_grants_sync(query, filters)
                logger.info(f"[V2] ✅ Found {len(grants)} grants from API")
                
                # Log first grant details for debugging
                if grants:
                    sample = grants[0]
                    logger.info(f"[V2] 📋 Sample grant from API:")
                    logger.info(f"[V2]    - grantId: {sample.get('grantId')}")
                    logger.info(f"[V2]    - title: {sample.get('title', '')[:60]}...")
                    logger.info(f"[V2]    - agency: {sample.get('agency')}")
                    logger.info(f"[V2]    - amount: {sample.get('amount')}")
                    logger.info(f"[V2]    - deadline: {sample.get('deadline')}")
                    logger.info(f"[V2]    - description length: {len(sample.get('description', ''))}")
                    logger.info(f"[V2]    - eligibility length: {len(sample.get('eligibility', ''))}")
                    logger.info(f"[V2]    - source: {sample.get('source')}")
                
                # ============================================================
                # STEP 2: APPLY BAYESIAN SCORING
                # ============================================================
                logger.info(f"[V2] ========== STEP 2: APPLYING BAYESIAN SCORING ==========")
                publish_search_event(session_id, 'PROGRESS', {
                    'message': f'Found {len(grants)} grants, applying scoring...',
                    'step': 2,
                    'totalSteps': 4
                }, search_event_table, cognito_user_id)
                
                if BAYESIAN_SCORING_AVAILABLE and cognito_user_id:
                    logger.info(f"[V2] 🧠 Applying Bayesian scoring for user {cognito_user_id}")
                    scored_grants = apply_dual_scoring(grants, cognito_user_id, query)
                    logger.info(f"[V2] ✅ Bayesian scoring complete")
                else:
                    logger.warning("[V2] ⚠️  Bayesian scoring not available, using default scores")
                    logger.warning(f"[V2]    - BAYESIAN_SCORING_AVAILABLE: {BAYESIAN_SCORING_AVAILABLE}")
                    logger.warning(f"[V2]    - cognito_user_id: {cognito_user_id}")
                    # Set default scores when Bayesian scoring is unavailable
                    for grant in grants:
                        grant['relevanceScore'] = 0.5
                        grant['keywordScore'] = 0.5
                        grant['profileMatchScore'] = 0.0
                    scored_grants = grants
                    logger.info(f"[V2] ✅ Default scores applied to {len(scored_grants)} grants")
                
                # Log scored grant sample
                if scored_grants:
                    sample = scored_grants[0]
                    logger.info(f"[V2] 📋 Sample scored grant:")
                    logger.info(f"[V2]    - relevanceScore: {sample.get('relevanceScore')}")
                    logger.info(f"[V2]    - keywordScore: {sample.get('keywordScore')}")
                    logger.info(f"[V2]    - profileMatchScore: {sample.get('profileMatchScore')}")
                
                # ============================================================
                # STEP 3: WRITE TO DYNAMODB VIA APPSYNC
                # ============================================================
                logger.info(f"[V2] ========== STEP 3: WRITING TO DYNAMODB VIA APPSYNC ==========")
                publish_search_event(session_id, 'PROGRESS', {
                    'message': f'Writing {len(scored_grants)} grants to database...',
                    'step': 3,
                    'totalSteps': 4
                }, search_event_table, cognito_user_id)
                
                # 3. Write grants to DynamoDB AND AppSync
                for i, grant in enumerate(scored_grants):
                    logger.info(f"[V2] 📝 Writing grant {i+1}/{len(scored_grants)}: {grant.get('grantId')}")
                    write_grant_record(session_id, grant, grant_records_table, cognito_user_id)
                    
                    # Small delay for smooth progress updates
                    if i % 5 == 0:  # Every 5 grants
                        # nosemgrep: arbitrary-sleep - Intentional: Rate limiting for DynamoDB writes
                        time.sleep(0.1)
                
                logger.info(f"[V2] ✅ Wrote {len(scored_grants)} grants to DynamoDB")
                
                # Log top results summary for easy debugging
                top5 = sorted(scored_grants, key=lambda g: g.get('relevanceScore', 0), reverse=True)[:5]
                scores = [g.get('relevanceScore', 0) for g in scored_grants]
                score_range = f"{min(scores):.2f}–{max(scores):.2f}" if scores else "n/a"
                logger.info(f"[V2] 📊 SEARCH SUMMARY: {len(scored_grants)} grants, score range {score_range}")
                for rank, g in enumerate(top5, 1):
                    logger.info(f"[V2]   #{rank} [{g.get('relevanceScore', 0):.2f}] {g.get('title', '')[:80]} ({g.get('agency', '')})")
                
                # ============================================================
                # STEP 4: PUBLISH COMPLETION EVENT
                # ============================================================
                logger.info(f"[V2] ========== STEP 4: PUBLISHING COMPLETION EVENT ==========")
                publish_search_event(session_id, 'SEARCH_COMPLETE', {
                    'message': f'Search complete - found {len(scored_grants)} grants',
                    'totalGrants': len(scored_grants),
                    'step': 4,
                    'totalSteps': 4
                }, search_event_table, cognito_user_id)
                
                logger.info(f"[V2] ========== BACKGROUND SEARCH COMPLETE ==========")
                logger.info(f"[V2] ✅ Session {session_id} completed successfully")
                
            except Exception as e:
                logger.error(f"[V2] Error in background search: {str(e)}")
                
                # Publish error event
                publish_search_event(session_id, 'SEARCH_ERROR', {
                    'message': f'Search failed: {str(e)}',
                    'error': str(e)
                }, search_event_table, cognito_user_id)
                
            finally:
                # Mark async task as complete
                app.complete_async_task(task_id)
                logger.info(f"[V2] Async task {task_id} completed")
        
        # Start background thread
        threading.Thread(target=background_search, daemon=True).start()
        
        # Return immediately
        return {
            "status": "STARTED",
            "sessionId": session_id,
            "message": f"Search started for: {query}",
            "taskId": task_id,
            "version": "V2"
        }
        
    except Exception as e:
        logger.error(f"[V2] Error in entrypoint: {str(e)}")
        return {
            "status": "ERROR",
            "error": str(e),
            "version": "V2"
        }

# ============================================================================
# GRANTS.GOV API FUNCTIONS (same as V1)
# ============================================================================

def parse_search_filters(user_input):
    """Convert natural language to API filters using simple keyword matching"""
    # Simplified version without spacy
    user_lower = user_input.lower()
    
    filters = {
        "keyword": user_input.strip(),
        "agencies": "",
        "fundingCategories": "",
        "eligibilities": "",
        "oppStatuses": "posted",
        "fundingInstruments": "",
        "aln": "",
        "oppNum": "",
        "dateRange": ""
    }
    
    return filters

def call_grants_api(payload):
    """Call grants.gov API"""
    base_url = "https://api.grants.gov/v1/api/search2"
    
    try:
        logger.info(f"[V2] Calling grants.gov API: {base_url}")
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; GrantsAgentV2/1.0)"
        }
        
        with httpx.Client(timeout=30.0, headers=headers) as client:
            response = client.post(base_url, json=payload)
            response.raise_for_status()
        
        result = response.json()
        
        if result.get("errorcode", 0) != 0:
            error_msg = result.get('msg', 'Unknown error')
            raise Exception(f"API Error: {error_msg}")
        
        data = result.get("data", {})
        grants = data.get("oppHits", [])
        total_found = data.get("hitCount", 0)
        
        logger.info(f"[V2] API returned {len(grants)} grants (total: {total_found})")
        
        return data
        
    except Exception as e:
        logger.error(f"[V2] API call failed: {str(e)}")
        raise

def fetch_grant_details(opp_id: str) -> dict:
    """Fetch detailed grant information"""
    try:
        url = "https://api.grants.gov/v1/api/fetchOpportunity"
        payload = {"opportunityId": int(opp_id)}
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; GrantsAgentV2/1.0)"
        }
        
        with httpx.Client(timeout=10.0, headers=headers) as client:
            response = client.post(url, json=payload)
            if response.status_code == 200:
                result = response.json()
                if result.get("errorcode", 0) != 0:
                    return {"error": f"API Error: {result.get('msg', 'Unknown error')}"}
                return result.get("data", {})
            else:
                return {"error": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

def search_grants_sync(keyword: str, filters: dict = None) -> List[Dict[str, Any]]:
    """
    Synchronous grant search (called from background thread)
    Returns list of grants in UI format
    """
    try:
        logger.info(f"[V2] Searching for: {keyword}")
        
        # Parse filters
        parsed_filters = parse_search_filters(keyword)
        
        # Build API payload
        payload = {
            "rows": 25,
            "startRecordNum": 0,
            "resultType": "json",
            "searchOnly": False,
            "keyword": parsed_filters["keyword"],
            "oppStatuses": parsed_filters["oppStatuses"]
        }
        
        # Call API
        api_response = call_grants_api(payload)
        raw_grants = api_response.get("oppHits", [])
        
        # Convert to UI format
        grants_with_details = []
        
        for i, grant in enumerate(raw_grants[:25], 1):
            logger.info(f"[V2] Processing grant {i}/{len(raw_grants[:25])}: {grant.get('id', 'Unknown')}")
            
            grant_data = {
                "searchData": {
                    "id": grant.get("id", ""),
                    "number": grant.get("number", ""),
                    "title": grant.get("title", ""),
                    "agencyCode": grant.get("agencyCode", ""),
                    "agency": grant.get("agency", ""),
                    "openDate": grant.get("openDate", ""),
                    "closeDate": grant.get("closeDate", ""),
                    "oppStatus": grant.get("oppStatus", ""),
                    "docType": grant.get("docType", ""),
                    "cfdaList": grant.get("cfdaList", [])
                },
                "detailsData": None,
                "error": None
            }
            
            # Fetch details
            opp_id = grant.get("id")
            if opp_id:
                try:
                    details = fetch_grant_details(opp_id)
                    if details and not details.get("error"):
                        grant_data["detailsData"] = details
                    else:
                        grant_data["error"] = details.get("error", "Failed to fetch details")
                except Exception as e:
                    grant_data["error"] = str(e)
            
            # Convert to UI format
            ui_grant = convert_grant_to_ui_format(grant_data)
            grants_with_details.append(ui_grant)
        
        logger.info(f"[V2] Converted {len(grants_with_details)} grants to UI format")
        
        return grants_with_details
        
    except Exception as e:
        logger.error(f"[V2] Search failed: {str(e)}")
        raise

def convert_grant_to_ui_format(grant_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert agent grant format to UI format (same as V1)"""
    try:
        search_data = grant_data.get('searchData', {})
        details_data = grant_data.get('detailsData', {})
        
        grant_id = search_data.get('id', '')
        title = search_data.get('title', 'No title')
        agency = search_data.get('agency', 'Unknown agency')
        open_date = search_data.get('openDate', '')
        close_date = search_data.get('closeDate', '')
        
        synopsis = details_data.get('synopsis', {})
        description = synopsis.get('synopsisDesc', 'No description available')
        
        # Extract amount
        amount = 0
        amount_str = synopsis.get('awardCeiling', '0')
        if amount_str and str(amount_str).lower() != 'none':
            try:
                clean_amount = str(amount_str).replace('$', '').replace(',', '').strip()
                if clean_amount:
                    amount = float(clean_amount)
            except:
                amount = 0
        
        ui_grant = {
            'grantId': grant_id,
            'title': title,
            'agency': agency,
            'amount': amount,
            'deadline': close_date,
            'description': description,
            'eligibility': synopsis.get('applicantEligibilityDesc', 'See grant details'),
            'applicationProcess': f"Contact: {synopsis.get('agencyContactEmail', '')}",
            # Don't set relevanceScore here - let Bayesian matcher set it
            # If no Bayesian scoring, it will be set to 0.5 by default
            'matchedKeywords': [],
            'tags': [],
            'contactEmail': synopsis.get('agencyContactEmail', ''),
            'contactPhone': synopsis.get('agencyContactPhone', ''),
            'openDate': open_date,
            'opportunityNumber': search_data.get('number', ''),
            'source': 'GRANTS_GOV'
        }
        
        return ui_grant
        
    except Exception as e:
        logger.error(f"[V2] Error converting grant: {str(e)}")
        raise

# ============================================================================
# DYNAMODB FUNCTIONS - Agent writes directly (no processor Lambda)
# ============================================================================

def write_grant_record(session_id: str, grant: Dict[str, Any], table, cognito_user_id: str = None):
    """Write GrantRecord via AppSync mutation (which writes to DynamoDB and triggers subscriptions)"""
    try:
        if not appsync_client:
            logger.error("[V2] AppSync client not available, cannot write GrantRecord")
            return
        
        # Log what we received
        logger.info(f"[V2] 🔍 Grant object keys: {list(grant.keys())}")
        logger.info(f"[V2] 🔍 Grant data sample - grantId: {grant.get('grantId')}, title: {grant.get('title', '')[:50]}, agency: {grant.get('agency')}, amount: {grant.get('amount')}, description length: {len(grant.get('description', ''))}")
        
        # Prepare record for AppSync
        record = {
            "sessionId": session_id,
            "grantId": grant['grantId'],
            "title": grant['title'],
            "agency": grant.get('agency', ''),
            "amount": float(grant.get('amount', 0)),
            "deadline": grant.get('deadline', ''),
            "description": grant.get('description', ''),
            "eligibility": grant.get('eligibility', ''),
            "applicationProcess": grant.get('applicationProcess', ''),
            "source": grant.get('source', 'GRANTS_GOV'),
            "relevanceScore": float(grant.get('relevanceScore', 0.85)),
            "profileMatchScore": float(grant.get('profileMatchScore', 0)) if grant.get('profileMatchScore') else None,
            "keywordScore": float(grant.get('keywordScore', 0)) if grant.get('keywordScore') else None,
            "matchedKeywords": grant.get('matchedKeywords', []),
            "tags": grant.get('tags', [])
        }
        
        logger.info(f"[V2] 🔍 Record being sent - agency: {record['agency']}, amount: {record['amount']}, description length: {len(record['description'])}")
        
        # Call AppSync mutation (which writes to DDB and triggers subscription)
        appsync_client.create_grant_record(record)
        logger.info(f"[V2] Created GrantRecord via AppSync: {grant['grantId']}")
        
    except Exception as e:
        logger.error(f"[V2] Error writing GrantRecord: {str(e)}")
        raise

def publish_search_event(session_id: str, event_type: str, data: Dict[str, Any], table, cognito_user_id: str = None):
    """Publish SearchEvent via AppSync mutation (which writes to DynamoDB and triggers subscriptions)"""
    if not appsync_client:
        error_msg = "[V2] AppSync client not available, cannot publish SearchEvent"
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    
    # Call AppSync mutation (which writes to DDB and triggers subscription)
    success = appsync_client.create_search_event(
        session_id=session_id,
        event_type=event_type,
        data=data,
        cognito_user_id=cognito_user_id
    )
    
    if not success:
        error_msg = f"[V2] Failed to publish SearchEvent via AppSync: {event_type}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    
    logger.info(f"[V2] Published SearchEvent via AppSync: {event_type} for session {session_id}")

# ============================================================================
# RUN
# ============================================================================

if __name__ == "__main__":
    print("[US Grants V2] *** CODE VERSION: 2026-03-05-v2 — search summary logging ***", flush=True)
    logger.info("[V2] Starting US Grants Search Agent V2")
    app.run()
