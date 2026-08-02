#!/usr/bin/env python3
"""
Proposal Generation Agent - AgentCore Native

Version: 2.1.2 - DOT Agency Support (2026-04-07)

This agent is a self-contained orchestrator that:
1. Receives proposal request from initiator Lambda
2. Returns immediately with "STARTED" status
3. Spawns background thread for long-running work
4. Writes progress to DynamoDB as it works
5. Publishes events to AppSync for real-time UI updates

Key features:
- Uses app.add_async_task() for background processing
- Writes directly to DynamoDB (no processor Lambda)
- Publishes directly to AppSync (no processor Lambda)
- Supports up to 8-hour execution
- Self-contained - no external orchestration needed
- Uses direct KB ID from CloudFormation (no name-based lookup)

Dependencies:
- bedrock-agentcore: AgentCore Runtime SDK
- boto3: AWS SDK for DynamoDB/AppSync/Bedrock
"""

print("=" * 80, flush=True)
print("[Proposal Agent] STEP 1: Starting imports...", flush=True)
print("=" * 80, flush=True)

import logging
print("[Proposal Agent] ✅ logging imported")

import json
print("[Proposal Agent] ✅ json imported")

import threading
print("[Proposal Agent] ✅ threading imported")

import boto3
print("[Proposal Agent] ✅ boto3 imported")

import os
print("[Proposal Agent] ✅ os imported")

import re
print("[Proposal Agent] ✅ re imported")

import time
print("[Proposal Agent] ✅ time imported")

from datetime import datetime, timedelta
print("[Proposal Agent] ✅ datetime imported")

from typing import Dict, Any, List
print("[Proposal Agent] ✅ typing imported")

from decimal import Decimal
print("[Proposal Agent] ✅ Decimal imported")

print("[Proposal Agent] STEP 2: Importing bedrock-agentcore SDK...")
from bedrock_agentcore.runtime import BedrockAgentCoreApp
print("[Proposal Agent] ✅ bedrock-agentcore SDK imported")

from botocore.config import Config
print("[Proposal Agent] ✅ botocore.config imported")

print("[Proposal Agent] STEP 3: Configuring logging...")
# Use DEBUG level to match working agents (pdf-converter, evaluator) - captures asyncio internals
# CRITICAL: stream=sys.stdout so AgentCore captures logs (it captures stdout, not stderr)
import sys
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
print("[Proposal Agent] ✅ Logging configured")

print("[Proposal Agent] STEP 4: Initializing AgentCore app...")
# Initialize AgentCore app
app = BedrockAgentCoreApp()
print("[Proposal Agent] ✅ AgentCore app initialized")
print(f"[Proposal Agent] App object: {app}")
print(f"[Proposal Agent] App type: {type(app)}")

print("[Proposal Agent] STEP 5: Getting AWS region...")
# Get AWS region from environment (set by AgentCore Runtime)
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-2')
print(f"[Proposal Agent] ✅ AWS_REGION: {AWS_REGION}")

# Select inference profile based on region and model tier
# eu-west-1 uses EU cross-region profile; all US regions use US cross-region profile
# Opus 4.6: 200K context, better for large EU grant proposals (no :0 suffix)
# Sonnet 4.5: 200K context, faster/cheaper for smaller proposals
# PROPOSAL_MODEL_TIER env var is set by the initiator Lambda from backend.ts
# Default to 'opus' — can be changed in backend.ts without touching agent code
# NOTE: This is the startup default. The actual value is re-evaluated per invocation
#       inside invoke() after env vars are applied from the payload.
_MODEL_TIER = os.environ.get('PROPOSAL_MODEL_TIER', 'opus')

if AWS_REGION.startswith('eu-'):
    _REGION_PREFIX = 'eu'
else:
    _REGION_PREFIX = 'us'

if _MODEL_TIER == 'sonnet':
    CLAUDE_MODEL_ID = f'{_REGION_PREFIX}.anthropic.claude-sonnet-4-5-20250929-v1:0'
else:
    # opus (default)
    CLAUDE_MODEL_ID = f'{_REGION_PREFIX}.anthropic.claude-opus-4-6-v1'
print(f"[Proposal Agent] ✅ CLAUDE_MODEL_ID: {CLAUDE_MODEL_ID}")

# PROPOSAL_TEMPERATURE env var, optional. Falls back to the existing default.
try:
    PROPOSAL_TEMPERATURE = float(os.environ.get('PROPOSAL_TEMPERATURE', '0.3'))
except ValueError:
    PROPOSAL_TEMPERATURE = 0.3
print(f"[Proposal Agent] ✅ PROPOSAL_TEMPERATURE: {PROPOSAL_TEMPERATURE}")

# Contextual grounding (Bedrock Guardrails). Optional — if unset, grounding
# scoring is simply skipped (fails open, never blocks proposal generation).
# Version is hardcoded to 'DRAFT' at the call site in score_section_grounding
# (see that function for why), so no GUARDRAIL_VERSION env var is needed here.
GUARDRAIL_ID = os.environ.get('GUARDRAIL_ID')
print(f"[Proposal Agent] ✅ GUARDRAIL_ID: {GUARDRAIL_ID or '(not configured — grounding scoring disabled)'}")

print("[Proposal Agent] STEP 6: Creating boto3 config...")
# Config optimized for streaming (no long read timeouts needed)
bedrock_config = Config(
    read_timeout=60,   # 1 minute - streaming keeps connection alive
    connect_timeout=10,
    retries={'max_attempts': 2}
)
print("[Proposal Agent] ✅ boto3 config created")

# Config for synchronous A2A calls to OTHER agentcore runtimes (PDF converter,
# Proposal Evaluator) via invoke_agent_runtime — these are NOT streaming, they
# block until the callee returns its full response. The default botocore read
# timeout (60s) is too short for the evaluator: it now runs one Claude call
# per proposal section sequentially (Task: per-section guideline adherence,
# 2026-08-02) rather than a single whole-proposal call, so timing scales with
# section count (observed ~30s/section) rather than being fixed. A short read
# timeout here doesn't cancel the callee's work (it keeps running), it just
# makes the CALLER give up and silently skip attaching the evaluation — which
# is what caused the Quality badge to disappear from the UI even though the
# evaluator succeeded.
#
# This call already runs inside the background thread (app.add_async_task),
# which AgentCore Runtime supports for up to 8 hours — there's no reason to
# fit this timeout tightly to today's observed section counts/timing when
# more sections (new agencies) or a slower Claude call could plausibly push
# past a tighter bound. Set generously (30 min) rather than reactively — this
# is a ceiling, not a fixed wait: the call returns as soon as the callee
# responds, and only actually waits the full 30 min if the callee hangs.
#
# max_attempts=1: don't retry on timeout — invoke_agent_runtime starts new
# work each call, so retrying a slow-but-succeeding call would just waste
# Claude calls rather than fix anything.
agentcore_a2a_config = Config(
    read_timeout=1800,
    connect_timeout=10,
    retries={'max_attempts': 1}
)
print("[Proposal Agent] ✅ agentcore A2A config created (1800s read timeout)")

print("[Proposal Agent] STEP 7: Initializing AWS clients...")
# Initialize AWS clients (will use execution role)
# NOTE: Clients are created at module level for reuse across invocations,
# but we defer heavy initialization to invoke() to pass the health check quickly.
print("[Proposal Agent]   - Creating dynamodb resource...")
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
print("[Proposal Agent]   ✅ dynamodb resource created")

print("[Proposal Agent]   - Creating bedrock-agent client...")
bedrock_agent = boto3.client('bedrock-agent', region_name=AWS_REGION)
print("[Proposal Agent]   ✅ bedrock-agent client created")

print("[Proposal Agent]   - Creating bedrock-runtime client...")
bedrock_runtime = boto3.client('bedrock-runtime', region_name=AWS_REGION, config=bedrock_config)
print("[Proposal Agent]   ✅ bedrock-runtime client created")

print("[Proposal Agent]   - Creating bedrock-agent-runtime client...")
bedrock_agent_runtime = boto3.client('bedrock-agent-runtime', region_name=AWS_REGION)
print("[Proposal Agent]   ✅ bedrock-agent-runtime client created")

print("[Proposal Agent]   - Creating s3 client...")
s3_client = boto3.client('s3', region_name=AWS_REGION)
print("[Proposal Agent]   ✅ s3 client created")

print("[Proposal Agent] ✅ All AWS clients initialized")

# Table references - will be initialized in invoke() with names from payload
proposals_table = None

# AppSync client - will be initialized in invoke() with endpoint from payload
appsync_client = None

# Cache for KB ID (looked up once per agent container lifecycle)
_KB_ID_CACHE = None

print("[Proposal Agent] STEP 8: Registering entrypoint...")
@app.entrypoint
def invoke(payload):
    """
    Main entrypoint - returns immediately with "STARTED" status
    
    Background thread handles:
    - Retrieving grant requirements from Knowledge Base
    - Fetching user profile and documents
    - Generating proposal sections using Claude
    - Uploading to S3
    - Publishing status updates to AppSync
    """
    global proposals_table, appsync_client
    
    print("=" * 80, flush=True)
    print("[Proposal Agent] 🎯 INVOKE FUNCTION CALLED!", flush=True)
    print("=" * 80, flush=True)
    
    try:
        print(f"[Proposal Agent] Received payload type: {type(payload)}")
        print(f"[Proposal Agent] Payload keys: {payload.keys() if isinstance(payload, dict) else 'N/A'}")
        logger.info(f"[Proposal Agent] Agent invoked with payload: {json.dumps(payload, default=str)}")
        
        # Extract parameters
        proposal_id = payload.get('proposalId')
        grant_id = payload.get('grantId')
        user_id = payload.get('userId')
        grant_info = payload.get('grantInfo', {})
        selected_documents = payload.get('selectedDocuments', [])
        
        # CRITICAL: Extract environment variables from payload
        # AgentCore agents don't automatically inherit Lambda environment variables
        env_vars = payload.get('env', {})
        if not env_vars:
            raise ValueError("Missing 'env' in payload - environment variables required")
        
        # Set environment variables from payload
        logger.info("[Proposal Agent] Setting environment variables from payload")
        for key, value in env_vars.items():
            if value:
                os.environ[key] = str(value)
                logger.info(f"   Set {key}")

        # Re-evaluate model selection now that env vars from payload are applied
        global CLAUDE_MODEL_ID
        _tier = os.environ.get('PROPOSAL_MODEL_TIER', 'opus')
        _prefix = 'eu' if AWS_REGION.startswith('eu-') else 'us'
        if _tier == 'sonnet':
            CLAUDE_MODEL_ID = f'{_prefix}.anthropic.claude-sonnet-4-5-20250929-v1:0'
        else:
            CLAUDE_MODEL_ID = f'{_prefix}.anthropic.claude-opus-4-6-v1'
        print(f"[Proposal Agent] 🤖 Model: {CLAUDE_MODEL_ID} (tier={_tier})", flush=True)
        logger.info(f"[Proposal Agent] Model selected: {CLAUDE_MODEL_ID}")
        
        # Get required environment variables
        proposals_table_name = os.environ.get('PROPOSALS_TABLE')
        knowledge_base_id = os.environ.get('KNOWLEDGE_BASE_ID')  # Direct KB ID from CloudFormation
        proposals_bucket = os.environ.get('PROPOSALS_BUCKET')
        document_table = os.environ.get('DOCUMENT_TABLE')
        document_bucket = os.environ.get('DOCUMENT_BUCKET')
        appsync_endpoint = os.environ.get('APPSYNC_ENDPOINT')
        graphql_api_id = os.environ.get('GRAPHQL_API_ID')
        
        if not proposals_table_name:
            raise ValueError("Missing PROPOSALS_TABLE in environment variables")
        
        if not proposals_bucket:
            raise ValueError("Missing PROPOSALS_BUCKET in environment variables")
        
        if not appsync_endpoint or not graphql_api_id:
            raise ValueError("Missing APPSYNC_ENDPOINT or GRAPHQL_API_ID in environment variables")
        
        if not proposal_id or not grant_id:
            raise ValueError("Missing required parameters: proposalId, grantId")
        
        logger.info(f"[Proposal Agent] Proposal: {proposal_id}, Grant: {grant_id}, User: {user_id}")
        logger.info(f"[Proposal Agent] Using table: {proposals_table_name}")
        logger.info(f"[Proposal Agent] Using bucket: {proposals_bucket}")
        logger.info(f"[Proposal Agent] AppSync endpoint: {appsync_endpoint}")
        logger.info(f"[Proposal Agent] ✅ Knowledge Base ID from CloudFormation: {knowledge_base_id}")
        logger.info(f"[Proposal Agent] Document table: {document_table}")
        logger.info(f"[Proposal Agent] Document bucket: {document_bucket}")
        
        # Initialize AppSync client for mutations (IAM auth only)
        try:
            from appsync_client import AppSyncClient
            appsync_client = AppSyncClient()
            logger.info("[Proposal Agent] ✅ AppSync client initialized")
        except Exception as e:
            logger.error(f"[Proposal Agent] ❌ Failed to initialize AppSync client: {str(e)}")
            appsync_client = None
        
        # Initialize table with name from payload
        proposals_table = dynamodb.Table(proposals_table_name)
        
        # Start async task tracking
        task_id = app.add_async_task("proposal_generation", {
            "proposalId": proposal_id,
            "grantId": grant_id,
            "userId": user_id
        })
        
        logger.info(f"[Proposal Agent] Started async task: {task_id}")
        
        # Spawn background thread for long-running work
        def background_generation():
            try:
                print(f"[Proposal Agent] 🧵 Background thread started for proposal {proposal_id}", flush=True)
                logger.info(f"[Proposal Agent] Background thread started for proposal {proposal_id}")
                
                # ============================================================
                # STEP 1: INITIALIZE
                # ============================================================
                print(f"[Proposal Agent] ========== STEP 1: INITIALIZING ==========", flush=True)
                logger.info(f"[Proposal Agent] ========== STEP 1: INITIALIZING ==========")
                update_proposal_status(proposal_id, 'PROCESSING', {
                    'progress': 10,
                    'currentStep': 'Initializing proposal generation'
                })
                
                # ============================================================
                # STEP 2: DETECT AGENCY & RETRIEVE CONTEXT FROM KB
                # ============================================================
                print(f"[Proposal Agent] ========== STEP 2: RETRIEVING CONTEXT ==========", flush=True)
                logger.info(f"[Proposal Agent] ========== STEP 2: RETRIEVING CONTEXT ==========")
                update_proposal_status(proposal_id, 'PROCESSING', {
                    'progress': 20,
                    'currentStep': 'Retrieving grant requirements and documents'
                })
                
                # Detect agency from grant data
                agency = detect_agency(grant_info)
                print(f"[Proposal Agent] 🔍 AGENCY DETECTED: '{agency}'", flush=True)
                print(f"[Proposal Agent] 🔍 GRANT INFO KEYS: {list(grant_info.keys())}", flush=True)
                print(f"[Proposal Agent] 🔍 GRANT TITLE: {grant_info.get('title', 'MISSING')[:80]}", flush=True)
                print(f"[Proposal Agent] 🔍 GRANT AGENCY RAW: {grant_info.get('agency', 'MISSING')}", flush=True)
                logger.info(f"[Proposal Agent] Detected agency: {agency}")
                
                # Query Knowledge Base for relevant context
                kb_context = query_knowledge_base(grant_info, selected_documents, agency, user_id, knowledge_base_id)
                logger.info(f"[Proposal Agent] Retrieved {len(kb_context.get('user_documents', []))} documents from KB")
                
                # ============================================================
                # STEP 3: PREPARE PROMPTS
                # ============================================================
                print(f"[Proposal Agent] ========== STEP 3: PREPARING PROMPTS ==========", flush=True)
                logger.info(f"[Proposal Agent] ========== STEP 3: PREPARING PROMPTS ==========")
                update_proposal_status(proposal_id, 'PROCESSING', {
                    'progress': 30,
                    'currentStep': 'Preparing generation prompts'
                })
                
                # Get agency-specific prompts from Bedrock
                prompts = get_bedrock_prompts(agency)
                print(f"[Proposal Agent] 🔍 PROMPTS FOUND: {len(prompts)} for agency '{agency}'", flush=True)
                print(f"[Proposal Agent] 🔍 PROMPT KEYS: {list(prompts.keys())}", flush=True)
                logger.info(f"[Proposal Agent] Found {len(prompts)} prompt(s) for {agency}")

                # Retrieval params captured during the grant-level retrieval (STEP 2),
                # reused below for per-section (prompt-aware) retrieval. base_content is
                # the grant-level content used as a fallback for any section that comes
                # back empty.
                retrieval = kb_context.get('_retrieval', {})
                base_content = retrieval.get('base_content') or _kb_context_to_content(kb_context)
                doc_uri_prefixes = retrieval.get('doc_uri_prefixes')
                section_max_results = retrieval.get('max_results', 20)

                # ============================================================
                # STEP 4: GENERATE PROPOSAL SECTIONS (per-section, prompt-aware retrieval)
                # ============================================================
                print(f"[Proposal Agent] ========== STEP 4: GENERATING SECTIONS ==========", flush=True)
                logger.info(f"[Proposal Agent] ========== STEP 4: GENERATING SECTIONS ==========")
                
                sections = {}
                prepared_prompts = {}
                section_count = len(prompts)
                print(f"[Proposal Agent] Generating {section_count} section(s)", flush=True)
                logger.info(f"[Proposal Agent] Generating {section_count} section(s)")
                
                for idx, (section_name, prompt_data) in enumerate(prompts.items()):
                    progress = 30 + int((idx / section_count) * 50)

                    # --- Section-aware retrieval: query = grant context + section intent ---
                    # Each section pulls the excerpts most relevant to THAT section (e.g.
                    # Broader Impacts vs Intellectual Merit) instead of reusing one generic
                    # grant-level block for all sections. Retrieval stays scoped to the
                    # user's selected documents (doc_uri_prefixes). If a section returns no
                    # chunks, fall back to the grant-level content so a section is never empty.
                    section_intent = build_section_intent(section_name, prompt_data)
                    section_researcher_content = base_content
                    if knowledge_base_id:
                        try:
                            section_chunks = retrieve_relevant_chunks(
                                grant_info, knowledge_base_id, section_max_results, agency,
                                doc_uri_prefixes, section_intent=section_intent
                            )
                            if section_chunks:
                                section_researcher_content = apply_content_budget(section_chunks, max_chars=120000)
                            else:
                                logger.warning(f"[Proposal Agent] ⚠️ Section '{section_name}' returned 0 chunks; "
                                               f"falling back to grant-level content")
                        except Exception as e:
                            logger.error(f"[Proposal Agent] Section-aware retrieval failed for '{section_name}': {e}; "
                                         f"falling back to grant-level content")

                    # Build the final prompt for this section with its own retrieved content
                    prompt = build_section_prompt(section_name, prompt_data, grant_info, section_researcher_content, agency)
                    prepared_prompts[section_name] = prompt
                    
                    print(f"[Proposal Agent] 🤖 Calling Claude for section {idx+1}/{section_count}: {section_name}", flush=True)
                    logger.info(f"[Proposal Agent] Generating section {idx+1}/{section_count}: {section_name}")
                    update_proposal_status(proposal_id, 'PROCESSING', {
                        'progress': progress,
                        'currentStep': f'Generating {section_name}'
                    })
                    
                    # Generate this section with Claude
                    section_content = generate_section_with_claude(prompt, section_name)

                    # Contextual grounding: report (never block) how much of this
                    # section is actually backed by the researcher's documents used
                    # for it, vs. generic/illustrative content. No-op if GUARDRAIL_ID
                    # isn't configured or the call fails.
                    grounding = score_section_grounding(section_name, section_intent, section_researcher_content, section_content)

                    sections[section_name] = {
                        'title': section_name.replace('_', ' ').title(),
                        'content': section_content,
                        'wordCount': len(section_content.split()),
                        **({'grounding': grounding} if grounding else {})
                    }
                    
                    print(f"[Proposal Agent] ✅ Section {idx+1}/{section_count} done: {section_name} ({len(section_content.split())} words)", flush=True)
                    logger.info(f"[Proposal Agent] ✅ Section {idx+1}/{section_count} complete: {section_name}")
                
                # ============================================================
                # STEP 5: ASSEMBLE & UPLOAD TO S3
                # ============================================================
                logger.info(f"[Proposal Agent] ========== STEP 5: ASSEMBLING & UPLOADING ==========")
                update_proposal_status(proposal_id, 'PROCESSING', {
                    'progress': 85,
                    'currentStep': 'Assembling and uploading proposal'
                })
                
                # Assemble complete proposal
                complete_proposal = assemble_proposal(sections, grant_info, agency)
                logger.info(f"[Proposal Agent] Assembled proposal with {len(sections)} sections")
                
                # Upload to S3
                s3_result = save_to_s3(proposal_id, user_id, complete_proposal, proposals_bucket, prepared_prompts)
                logger.info(f"[Proposal Agent] Uploaded to S3: {s3_result['s3_key']}")
                
                # ============================================================
                # STEP 5.5: CONVERT TO PDF (A2A via invoke_agent)
                # ============================================================
                logger.info(f"[Proposal Agent] ========== STEP 5.5: CONVERTING TO PDF ==========")
                update_proposal_status(proposal_id, 'PROCESSING', {
                    'progress': 90,
                    'currentStep': 'Converting proposal to PDF'
                })
                
                # Call PDF converter agent using AgentCore Runtime API
                pdf_info = call_pdf_converter_agent(
                    html_content=complete_proposal['html'],
                    proposal_id=proposal_id,
                    user_id=user_id,
                    proposals_bucket=proposals_bucket
                )
                
                # ============================================================
                # STEP 5.7: EVALUATE PROPOSAL QUALITY (A2A via invoke_agent)
                # ============================================================
                logger.info(f"[Proposal Agent] ========== STEP 5.7: EVALUATING PROPOSAL QUALITY ==========")
                update_proposal_status(proposal_id, 'PROCESSING', {
                    'progress': 95,
                    'currentStep': 'Evaluating proposal quality'
                })
                
                # Call Proposal Evaluator agent using AgentCore Runtime API
                evaluation = call_proposal_evaluator_agent(
                    proposal_content=complete_proposal,
                    prompt=prepared_prompts,
                    content_quality=kb_context.get('contentQuality', {}),
                    grant_info=grant_info,
                    proposal_id=proposal_id,
                    user_id=user_id
                )
                
                # ============================================================
                # STEP 6: COMPLETE
                # ============================================================
                logger.info(f"[Proposal Agent] ========== STEP 6: COMPLETE ==========")
                
                # Include content quality in completion metadata
                completion_metadata = {
                    'progress': 100,
                    'currentStep': 'Proposal generation complete',
                    's3Key': s3_result['s3_key'],
                    'downloadUrl': s3_result['download_url'],
                    'metadata': complete_proposal['metadata'],
                    'grantInfo': grant_info,  # Preserve grant info for UI display
                }
                
                # Add PDF info if conversion succeeded
                # NOTE: We don't store pdfUrl here because it contains temporary STS credentials
                # that expire quickly. Instead, we store the S3 key and generate fresh presigned
                # URLs on-demand in the proposals-query Lambda (just like we do for HTML URLs)
                if pdf_info:
                    # Don't store pdfUrl - it has expired STS tokens
                    # completion_metadata['pdfUrl'] = pdf_info['pdfUrl']
                    completion_metadata['pdfS3Key'] = pdf_info['s3Key']
                    completion_metadata['pdfS3Bucket'] = pdf_info.get('s3Bucket')
                    completion_metadata['pdfGeneratedAt'] = pdf_info['convertedAt']
                    completion_metadata['pdfSize'] = pdf_info['pdfSize']
                    logger.info(f"[Proposal Agent] ✅ Including PDF S3 key in metadata (URL will be generated on-demand)")
                else:
                    logger.warning(f"[Proposal Agent] ⚠️ PDF conversion failed or skipped")
                
                # Add evaluation if available
                if evaluation:
                    completion_metadata['evaluation'] = evaluation
                    logger.info(f"[Proposal Agent] ✅ Including evaluation: {evaluation['overallScore']:.2f} ({evaluation['overallGrade']})")
                else:
                    logger.warning(f"[Proposal Agent] ⚠️ Proposal evaluation failed or skipped")
                
                # Add content quality if available
                if kb_context.get('contentQuality'):
                    completion_metadata['contentQuality'] = kb_context['contentQuality']
                    logger.info(f"[Proposal Agent] ✅ Including content quality: {kb_context['contentQuality']['level']}")

                # Add per-section grounding scores if available (contextual grounding,
                # informational only — see score_section_grounding docstring). Lets the
                # UI show, per section, how much content is backed by the researcher's
                # documents vs. generic/illustrative proposal boilerplate.
                section_grounding = {
                    name: s['grounding'] for name, s in sections.items() if s.get('grounding')
                }
                if section_grounding:
                    completion_metadata['sectionGrounding'] = section_grounding
                    logger.info(f"[Proposal Agent] ✅ Including grounding scores for {len(section_grounding)} section(s)")

                update_proposal_status(proposal_id, 'COMPLETED', completion_metadata)
                
                logger.info(f"[Proposal Agent] ✅ Proposal generation complete: {proposal_id}")
                
            except Exception as e:
                import traceback
                logger.error(f"[Proposal Agent] ❌ Error in background generation: {str(e)}")
                traceback.print_exc()
                print(f"[Proposal Agent] ❌ BACKGROUND THREAD EXCEPTION: {str(e)}", flush=True)
                print(traceback.format_exc(), flush=True)
                update_proposal_status(proposal_id, 'FAILED', {
                    'progress': 0,
                    'currentStep': f'Error: {str(e)}',
                    'error': str(e)
                })
        
        # Start background thread
        # daemon=False: thread must complete before process exits
        # This is correct for AgentCore long-running containers
        thread = threading.Thread(target=background_generation)
        thread.daemon = False
        thread.start()
        logger.info("[Proposal Agent] Background thread started")
        
        # Return immediately (async pattern)
        return {
            "status": "STARTED",
            "proposalId": proposal_id,
            "message": "Proposal generation started in background",
            "taskId": task_id
        }
        
    except Exception as e:
        logger.error(f"[Proposal Agent] ❌ Error in invoke: {str(e)}")
        return {
            "status": "ERROR",
            "error": str(e),
            "message": f"Failed to start proposal generation: {str(e)}"
        }

def update_proposal_status(proposal_id: str, status: str, progress_data: Dict[str, Any]):
    """Update proposal status in DynamoDB - matches V1 Lambda approach"""
    try:
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Extract progress percentage and current step (top-level fields)
        progress_percentage = progress_data.get('progress', 0)
        current_step = progress_data.get('currentStep', '')
        
        # Store ALL progress data in metadata field (JSON type) - matches V1
        # This includes s3Key, downloadUrl, etc.
        metadata_safe = convert_floats_to_decimal(progress_data)
        
        update_expr = 'SET #status = :status, updatedAt = :updated, progress = :progress, currentStep = :step, metadata = :metadata'
        expr_attr_names = {'#status': 'status'}
        expr_attr_values = {
            ':status': status,
            ':updated': timestamp,
            ':progress': int(progress_percentage),
            ':step': current_step,
            ':metadata': metadata_safe  # Full progress data as JSON (matches V1)
        }
        
        if 'error' in progress_data:
            update_expr += ', #error = :error'
            expr_attr_names['#error'] = 'error'
            expr_attr_values[':error'] = progress_data['error']
        
        proposals_table.update_item(
            Key={'id': proposal_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values
        )
        
        logger.info(f"[Proposal Agent] Updated proposal status: {proposal_id} -> {status} (progress: {progress_percentage}%)")
        
        # Also publish to AppSync if available
        if appsync_client:
            try:
                appsync_client.publish_proposal_update(proposal_id, status, progress_data)
            except Exception as e:
                logger.error(f"[Proposal Agent] Failed to publish to AppSync: {e}")
        
    except Exception as e:
        logger.error(f"[Proposal Agent] Error updating proposal status: {str(e)}")

# ============================================================================
# HELPER FUNCTIONS - Adapted from proposal-processor
# ============================================================================

def convert_floats_to_decimal(obj):
    """Recursively convert all float values to Decimal for DynamoDB compatibility"""
    if isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj

def get_knowledge_base_id(kb_name_prefix: str):
    """Dynamically find the Knowledge Base ID by name prefix"""
    global _KB_ID_CACHE
    
    if _KB_ID_CACHE:
        return _KB_ID_CACHE
    
    logger.info(f"[Proposal Agent] Looking up Knowledge Base with prefix: {kb_name_prefix}")
    
    try:
        response = bedrock_agent.list_knowledge_bases(maxResults=100)
        kbs = response.get('knowledgeBaseSummaries', [])
        
        # Find active KB matching our prefix
        for kb in kbs:
            if kb.get('name', '').startswith(kb_name_prefix) and kb.get('status') == 'ACTIVE':
                kb_id = kb['knowledgeBaseId']
                logger.info(f"[Proposal Agent] ✅ Found KB: {kb['name']} (ID: {kb_id})")
                _KB_ID_CACHE = kb_id
                return kb_id
        
        logger.warning(f"[Proposal Agent] ⚠️ No active KB found with prefix '{kb_name_prefix}'")
        return None
        
    except Exception as e:
        logger.error(f"[Proposal Agent] ❌ Error looking up KB: {e}")
        return None

def call_pdf_converter_agent(html_content: str, proposal_id: str, user_id: str, proposals_bucket: str) -> dict:
    """
    Convert HTML to PDF using the PDF Converter A2A agent.
    
    Uses boto3 invoke_agent_runtime to call the separate PDF converter agent.
    
    Args:
        html_content: Complete HTML proposal
        proposal_id: Proposal ID
        user_id: User ID
        proposals_bucket: S3 bucket name
    
    Returns:
        dict with pdfUrl, s3Key, s3Bucket, convertedAt, pdfSize
        or None if conversion fails
    """
    logger.info(f"[Proposal Agent] 📄 Calling PDF Converter agent for proposal {proposal_id}")
    
    try:
        from uuid import uuid4
        
        # Get PDF converter runtime ARN from environment variable
        pdf_converter_arn = os.environ.get('PDF_CONVERTER_ARN')
        if not pdf_converter_arn:
            logger.error(f"[Proposal Agent] ❌ PDF_CONVERTER_ARN environment variable not set")
            return None
        
        logger.info(f"[Proposal Agent] 🔗 PDF Converter ARN: {pdf_converter_arn}")
        
        # Prepare payload
        payload_dict = {
            'html': html_content,
            'proposalId': proposal_id,
            'userId': user_id,
            'bucket': proposals_bucket
        }
        payload_json = json.dumps(payload_dict)
        
        # Create bedrock-agentcore client (extended read timeout — see
        # agentcore_a2a_config definition for why)
        bedrock_agentcore = boto3.client('bedrock-agentcore', region_name=AWS_REGION, config=agentcore_a2a_config)
        
        # Invoke PDF converter agent
        logger.info(f"[Proposal Agent] 🚀 Invoking PDF converter agent...")
        response = bedrock_agentcore.invoke_agent_runtime(
            agentRuntimeArn=pdf_converter_arn,
            runtimeSessionId=str(uuid4()),
            payload=payload_json.encode('utf-8'),
            qualifier='DEFAULT'
        )
        
        # Parse response
        response_body = response['response'].read()
        result = json.loads(response_body)
        
        logger.info(f"[Proposal Agent] ✅ PDF conversion complete")
        logger.info(f"[Proposal Agent]    S3 Key: {result.get('s3Key')}")
        logger.info(f"[Proposal Agent]    Size: {result.get('pdfSize', 0):,} bytes")
        
        return result
        
    except Exception as e:
        logger.error(f"[Proposal Agent] ❌ Error calling PDF converter agent: {e}")
        import traceback
        traceback.print_exc()
        return None

def call_proposal_evaluator_agent(
    proposal_content: dict,
    prompt: dict,
    content_quality: dict,
    grant_info: dict,
    proposal_id: str,
    user_id: str
) -> dict:
    """
    Evaluate proposal quality using the Proposal Evaluator A2A agent.
    
    Uses boto3 invoke_agent_runtime to call the separate evaluator agent.
    
    Args:
        proposal_content: Complete proposal with html and sections
        prompt: Prompt with content and successCriteria
        content_quality: Content quality metadata from KB search
        grant_info: Grant information (id, title, agency)
        proposal_id: Proposal ID
        user_id: User ID
    
    Returns:
        dict with evaluation scores, strengths, weaknesses, recommendations
        or None if evaluation fails
    """
    logger.info(f"[Proposal Agent] 📊 Calling Proposal Evaluator agent for proposal {proposal_id}")
    
    try:
        from uuid import uuid4
        
        # Get Proposal Evaluator runtime ARN from environment variable
        evaluator_arn = os.environ.get('PROPOSAL_EVALUATOR_ARN')
        if not evaluator_arn:
            logger.error(f"[Proposal Agent] ❌ PROPOSAL_EVALUATOR_ARN environment variable not set")
            return None
        
        logger.info(f"[Proposal Agent] 🔗 Proposal Evaluator ARN: {evaluator_arn}")
        
        # Prepare payload
        payload_dict = {
            'proposalId': proposal_id,
            'userId': user_id,
            'proposalContent': proposal_content,
            'prompt': prompt,
            'contentQuality': content_quality,
            'grantInfo': grant_info
        }
        payload_json = json.dumps(payload_dict)
        
        # Create bedrock-agentcore client (extended read timeout — the
        # evaluator now runs one Claude call per section sequentially, so a
        # multi-section proposal can legitimately take 60-120s+; see
        # agentcore_a2a_config definition for full context)
        bedrock_agentcore = boto3.client('bedrock-agentcore', region_name=AWS_REGION, config=agentcore_a2a_config)
        
        # Invoke Proposal Evaluator agent
        logger.info(f"[Proposal Agent] 🚀 Invoking Proposal Evaluator agent...")
        response = bedrock_agentcore.invoke_agent_runtime(
            agentRuntimeArn=evaluator_arn,
            runtimeSessionId=str(uuid4()),
            payload=payload_json.encode('utf-8'),
            qualifier='DEFAULT'
        )
        
        # Parse response
        response_body = response['response'].read()
        result = json.loads(response_body)
        
        logger.info(f"[Proposal Agent] ✅ Proposal evaluation complete")
        logger.info(f"[Proposal Agent]    Overall Score: {result.get('overallScore'):.2f}")
        logger.info(f"[Proposal Agent]    Overall Grade: {result.get('overallGrade')}")
        logger.info(f"[Proposal Agent]    Confidence: {result.get('confidence')}")
        logger.info(f"[Proposal Agent]    Red Flags: {len(result.get('redFlags', []))}")
        
        return result
        
    except Exception as e:
        logger.error(f"[Proposal Agent] ❌ Error calling Proposal Evaluator agent: {e}")
        import traceback
        traceback.print_exc()
        return None

def detect_agency(grant_data: Dict[str, Any]) -> str:
    """
    Normalize agency name to match UI dropdown values.
    
    CRITICAL: This normalized value is used for:
    1. Prompt lookup in Bedrock
    2. DynamoDB document filtering
    3. OpenSearch metadata filtering
    
    Returns: Normalized agency code (NSF, NIH, DOD, etc.) matching UI dropdown values
    """
    logger.info(f"[Proposal Agent] Detecting agency from grant data")
    
    if not grant_data or not isinstance(grant_data, dict):
        raise ValueError("Invalid grant_data")
    
    agency = grant_data.get('agency', '').strip()
    
    if not agency:
        raise ValueError(f"No agency field in grant data. Available fields: {list(grant_data.keys())}")
    
    logger.info(f"[Proposal Agent] Original agency: '{agency}'")
    
    # Normalize to standard agency codes that match UI dropdown values
    # These MUST match the values stored in DocumentMetadata.agency field
    agency_upper = agency.upper()
    
    # US Federal Agencies (match UI dropdown values exactly)
    if 'NIH' in agency_upper or 'NATIONAL INSTITUTES OF HEALTH' in agency_upper:
        normalized = 'NIH'
        logger.info(f"[Proposal Agent] ✅ Normalized: '{agency}' → '{normalized}'")
        return normalized
    
    if 'NSF' in agency_upper or 'NATIONAL SCIENCE FOUNDATION' in agency_upper or 'U.S. NATIONAL SCIENCE FOUNDATION' in agency_upper:
        normalized = 'NSF'
        logger.info(f"[Proposal Agent] ✅ Normalized: '{agency}' → '{normalized}'")
        return normalized
    
    if any(kw in agency_upper for kw in ['DARPA', 'DOD', 'DEPARTMENT OF DEFENSE', 'NAVY', 'NAVAL', 'AIR FORCE', 'ARMY', 'MARINES', 'MARINE CORPS', 'ONR', 'OFFICE OF NAVAL RESEARCH', 'DEFENSE ADVANCED', 'DEFENSE THREAT', 'DEFENSE LOGISTICS', 'DEFENSE HEALTH', 'WASHINGTON HEADQUARTERS', 'PENTAGON', 'MATERIEL COMMAND', 'RESEARCH LABORATORY', 'AFOSR', 'AFRL']):
        normalized = 'DOD'
        logger.info(f"[Proposal Agent] ✅ Normalized: '{agency}' → '{normalized}'")
        return normalized
    
    if 'DOE' in agency_upper or 'DEPARTMENT OF ENERGY' in agency_upper:
        normalized = 'DOE'
        logger.info(f"[Proposal Agent] ✅ Normalized: '{agency}' → '{normalized}'")
        return normalized
    
    if 'NASA' in agency_upper or 'NATIONAL AERONAUTICS' in agency_upper:
        normalized = 'NASA'
        logger.info(f"[Proposal Agent] ✅ Normalized: '{agency}' → '{normalized}'")
        return normalized

    if any(kw in agency_upper for kw in [
        'DOT', 'DEPARTMENT OF TRANSPORTATION', 'FHWA', 'FEDERAL HIGHWAY',
        'FTA', 'FEDERAL TRANSIT', 'FRA', 'FEDERAL RAILROAD', 'NHTSA',
        'NATIONAL HIGHWAY TRAFFIC SAFETY', 'FAA', 'FEDERAL AVIATION',
        'MARAD', 'MARITIME ADMINISTRATION', 'VOLPE', 'BUILD', 'RAISE',
        'INFRA', 'TIGER', 'SMART GRANT', 'SS4A', 'UTC'
    ]):
        normalized = 'DOT'
        logger.info(f"[Proposal Agent] ✅ Normalized: '{agency}' → '{normalized}'")
        return normalized
    
    # European Agencies - ALL map to "European-Commission-Prompt" for prompt lookup
    # This includes: Horizon Europe, Digital Europe Programme, LIFE Programme, etc.
    eu_keywords = [
        'HORIZON', 'EUROPE', 'EUROPEAN', 'EU', 'DIGITAL EUROPE', 
        'LIFE PROGRAMME', 'ERASMUS', 'CREATIVE EUROPE', 'INTERREG',
        'EUROPEAN COMMISSION', 'EUROPEAN UNION', 'FRAMEWORK PROGRAMME'
    ]
    
    if any(kw in agency_upper for kw in eu_keywords):
        # For prompt lookup, use "European-Commission-Prompt"
        # But preserve original agency name for metadata/filtering
        normalized = 'European-Commission-Prompt'
        logger.info(f"[Proposal Agent] ✅ EU Agency detected: '{agency}' → using prompt: '{normalized}'")
        return normalized
    
    # If no pattern matches, return the original agency name
    logger.info(f"[Proposal Agent] ℹ️  No normalization pattern matched, using original: '{agency}'")
    return agency

def fetch_document_content_from_s3(doc_id: str, user_id: str, document_table_name: str, document_bucket: str) -> Dict[str, Any]:
    """Fetch document content from S3 using document ID"""
    logger.info(f"[Proposal Agent] Fetching document {doc_id} for user {user_id}")
    
    try:
        table = dynamodb.Table(document_table_name)
        response = table.get_item(Key={'userId': user_id, 'documentId': doc_id})
        
        if 'Item' not in response:
            logger.warning(f"[Proposal Agent] Document {doc_id} not found in DynamoDB")
            return None
        
        item = response['Item']
        s3_key = item.get('s3Key')
        s3_bucket = item.get('s3Bucket', document_bucket)
        filename = item.get('filename', 'unknown')
        
        if not s3_key or not s3_bucket:
            logger.warning(f"[Proposal Agent] Document {doc_id} missing S3 location")
            return None
        
        # Check for extracted text (for PDFs)
        extracted_text_key = item.get('extractedTextKey')
        extraction_status = item.get('extractionStatus')
        
        if extracted_text_key and extraction_status == 'success':
            logger.info(f"[Proposal Agent] Using extracted text from: {extracted_text_key}")
            s3_response = s3_client.get_object(Bucket=s3_bucket, Key=extracted_text_key)
            content = s3_response['Body'].read().decode('utf-8')
        else:
            s3_response = s3_client.get_object(Bucket=s3_bucket, Key=s3_key)
            content = s3_response['Body'].read()
            try:
                content = content.decode('utf-8')
            except UnicodeDecodeError:
                content = content.decode('latin-1', errors='ignore')
        
        logger.info(f"[Proposal Agent] ✅ Fetched {len(content)} chars from {filename}")
        
        return {
            'id': doc_id,
            'filename': filename,
            'content': content,
            'type': item.get('type', 'content')
        }
        
    except Exception as e:
        logger.error(f"[Proposal Agent] Error fetching document {doc_id}: {e}")
        return None


def retrieve_relevant_chunks(grant_data: Dict[str, Any], kb_id: str, max_results: int = 20, agency: str = None, doc_uri_prefixes: List[str] = None, section_intent: str = None) -> List[Dict[str, Any]]:
    """
    Use Bedrock KB retrieve() to get semantically relevant chunks.

    Document scoping: when `doc_uri_prefixes` is provided, retrieval is restricted
    to chunks whose source object URI starts with one of those prefixes (the
    per-document S3 folders, e.g. s3://<bucket>/user-<userId>/<documentId>/). This
    is what makes the user's document selection (manual mode) and the agency
    document set (automatic mode) actually govern which content is used — Bedrock
    exposes the built-in metadata key `x-amz-bedrock-kb-source-uri` for this, so no
    custom metadata/re-ingestion is required. A prefix `startsWith` also correctly
    captures both the original file and its extracted-text sibling for PDFs.
    When no prefixes are given, retrieval falls back to searching the whole KB.

    Args:
        grant_data: Grant information including title and description
        kb_id: Knowledge Base ID
        max_results: Maximum number of chunks to retrieve (default 20)
        agency: Agency name (for logging only, not used for filtering)
        doc_uri_prefixes: Optional list of s3:// URI prefixes to scope retrieval to

    Returns:
        List of relevant chunks with content and metadata
    """
    logger.info(f"[Proposal Agent] 🔍 Using semantic search to find relevant content...")
    if doc_uri_prefixes:
        logger.info(f"[Proposal Agent] 🔒 Scoping retrieval to {len(doc_uri_prefixes)} selected document(s)")
    else:
        logger.info(f"[Proposal Agent] ℹ️  No document scope provided — searching ALL documents")
    
    # Build rich semantic query from grant info
    query_parts = [grant_data.get('title', '')]
    
    # Add synopsis description if available (most detailed)
    # Use first 1000 chars to give OpenSearch more context for better matching
    synopsis = grant_data.get('synopsisDesc', '')
    if synopsis:
        query_parts.append(synopsis[:1000])
    elif grant_data.get('description'):
        query_parts.append(grant_data.get('description', '')[:1000])
    
    # Section-aware retrieval: blend the section's intent (section name + the agency
    # prompt's description of what that section should cover) WITH the grant context.
    # This pulls back excerpts relevant to THIS section (e.g. "broader impacts" vs
    # "intellectual merit") rather than the same grant-generic set for every section.
    # We keep the grant context in the query so results stay on-topic for the grant.
    if section_intent:
        query_parts.append(section_intent)
        logger.info(f"[Proposal Agent] 🎯 Section-aware query intent: {section_intent[:150]}")
    
    search_query = ' '.join(p for p in query_parts if p).strip()
    logger.info(f"[Proposal Agent] 📝 Search query: {search_query[:150]}...")
    
    try:
        if not kb_id:
            logger.warning(f"[Proposal Agent] ⚠️ No Knowledge Base found, skipping semantic search")
            return []
        
        # Build retrieval configuration. If a document scope was provided, filter on
        # the built-in source-URI metadata key so ONLY the selected documents'
        # chunks are considered (see function docstring).
        vector_config = {
            'numberOfResults': max_results
        }
        if doc_uri_prefixes:
            prefix_filters = [
                {'startsWith': {'key': 'x-amz-bedrock-kb-source-uri', 'value': p}}
                for p in doc_uri_prefixes
            ]
            vector_config['filter'] = (
                prefix_filters[0] if len(prefix_filters) == 1 else {'orAll': prefix_filters}
            )
        retrieval_config = {'vectorSearchConfiguration': vector_config}
        
        logger.info(f"[Proposal Agent] 🔎 Calling bedrock_agent_runtime.retrieve()...")
        logger.info(f"[Proposal Agent]    KB ID: {kb_id}")
        logger.info(f"[Proposal Agent]    Max results: {max_results}")
        logger.info(f"[Proposal Agent]    Doc scope: {len(doc_uri_prefixes) if doc_uri_prefixes else 0} prefix(es)")
        logger.info(f"[Proposal Agent]    Query length: {len(search_query)} chars")
        
        response = bedrock_agent_runtime.retrieve(
            knowledgeBaseId=kb_id,
            retrievalQuery={'text': search_query},
            retrievalConfiguration=retrieval_config
        )
        
        chunks = response.get('retrievalResults', [])
        logger.info(f"[Proposal Agent] ✅ OpenSearch returned {len(chunks)} chunks")
        
        if len(chunks) == 0:
            logger.warning(f"[Proposal Agent] ⚠️  OpenSearch returned 0 chunks!")
            logger.warning(f"[Proposal Agent]    Possible reasons:")
            logger.warning(f"[Proposal Agent]    1. Document not synced to OpenSearch yet (wait 1-2 min after upload)")
            logger.warning(f"[Proposal Agent]    2. No semantic match between query and document content")
        else:
            # Log sample of what we got
            logger.info(f"[Proposal Agent] 📊 Sample chunk details:")
            for i, chunk in enumerate(chunks[:3]):  # First 3 chunks
                score = chunk.get('score', 0)
                location = chunk.get('location', {}).get('s3Location', {})
                uri = location.get('uri', 'N/A')
                logger.info(f"[Proposal Agent]    Chunk {i+1}: score={score:.4f}, uri={uri}")
        
        return chunks
        
    except Exception as e:
        logger.error(f"[Proposal Agent] ⚠️ Error during semantic retrieval: {e}")
        import traceback
        traceback.print_exc()
        return []


def assess_content_quality(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Assess the quality of retrieved content based on semantic scores.
    
    Returns quality metrics and recommendations for customer transparency.
    """
    if not chunks:
        return {
            'level': 'CRITICAL',
            'color': 'red',
            'avgScore': 0.0,
            'maxScore': 0.0,
            'minScore': 0.0,
            'message': 'No content found',
            'recommendation': 'Upload relevant documents to your Knowledge Base',
            'chunkCount': 0
        }
    
    scores = [c.get('score', 0) for c in chunks]
    avg_score = sum(scores) / len(scores)
    max_score = max(scores)
    min_score = min(scores)
    
    # Determine quality level based on average score
    if avg_score >= 0.70:
        level = 'EXCELLENT'
        color = 'green'
        message = 'Strong semantic match - high quality content'
        recommendation = 'Content is highly relevant to this grant'
    elif avg_score >= 0.55:
        level = 'GOOD'
        color = 'green'
        message = 'Good semantic match - quality content'
        recommendation = 'Content is relevant to this grant'
    elif avg_score >= 0.40:
        level = 'MODERATE'
        color = 'yellow'
        message = 'Moderate semantic match - acceptable content'
        recommendation = 'Consider uploading more specific documents for better results'
    elif avg_score >= 0.25:
        level = 'WEAK'
        color = 'orange'
        message = 'Weak semantic match - low quality content'
        recommendation = 'Upload documents more closely related to this grant topic'
    else:
        level = 'POOR'
        color = 'red'
        message = 'Very weak semantic match - poor quality content'
        recommendation = 'Upload documents specifically about this grant topic'
    
    return {
        'level': level,
        'color': color,
        'avgScore': round(avg_score, 4),
        'maxScore': round(max_score, 4),
        'minScore': round(min_score, 4),
        'message': message,
        'recommendation': recommendation,
        'chunkCount': len(chunks)
    }


def apply_content_budget(chunks: List[Dict[str, Any]], max_chars: int = 120000) -> str:
    """
    Apply character budget to chunks, prioritizing by relevance score.
    
    Args:
        chunks: List of chunks with content and scores
        max_chars: Maximum total characters (default 120K = ~30K tokens)
    
    Returns:
        Formatted content string within budget
    """
    logger.info(f"[Proposal Agent] 💰 Applying content budget (max {max_chars:,} chars = ~{max_chars//4:,} tokens)")
    logger.info(f"[Proposal Agent] 📊 CHUNK SELECTION ANALYSIS (for customer explanation):")
    logger.info(f"[Proposal Agent]    Total chunks from OpenSearch: {len(chunks)}")
    
    # Sort chunks by relevance score (highest first)
    sorted_chunks = sorted(
        chunks,
        key=lambda x: x.get('score', 0),
        reverse=True
    )
    
    # Log score distribution
    if sorted_chunks:
        scores = [c.get('score', 0) for c in sorted_chunks]
        logger.info(f"[Proposal Agent]    Score range: {min(scores):.4f} to {max(scores):.4f}")
        logger.info(f"[Proposal Agent]    Median score: {sorted(scores)[len(scores)//2]:.4f}")
    
    content_parts = []
    total_chars = 0
    chunks_included = 0
    chunks_rejected = 0
    rejection_reason = None
    cutoff_score = None
    
    logger.info(f"[Proposal Agent] ")
    logger.info(f"[Proposal Agent] 🎯 CHUNK-BY-CHUNK DECISION LOG:")
    
    for idx, chunk in enumerate(sorted_chunks, 1):
        chunk_content = chunk.get('content', {}).get('text', '')
        chunk_chars = len(chunk_content)
        chunk_score = chunk.get('score', 0)
        
        # Get source URI for logging
        location = chunk.get('location', {}).get('s3Location', {})
        uri = location.get('uri', 'N/A')
        doc_name = uri.split('/')[-1] if uri != 'N/A' else 'unknown'
        
        # Check if adding this chunk would exceed budget
        if total_chars + chunk_chars > max_chars:
            # Try to include partial chunk if we have room
            remaining = max_chars - total_chars
            if remaining > 500:  # Only include if we have meaningful space
                logger.info(f"[Proposal Agent]    Chunk {idx:2d}: ✅ INCLUDED (PARTIAL) - score={chunk_score:.4f}, chars={remaining:,}/{chunk_chars:,}, doc={doc_name[:40]}")
                chunk_content = chunk_content[:remaining] + "..."
                chunk_chars = len(chunk_content)
                content_parts.append(chunk_content)
                total_chars += chunk_chars
                chunks_included += 1
            else:
                # Budget exhausted - log all remaining rejections
                if cutoff_score is None:
                    cutoff_score = chunk_score
                    rejection_reason = f"Budget exhausted ({total_chars:,}/{max_chars:,} chars used)"
                logger.info(f"[Proposal Agent]    Chunk {idx:2d}: ❌ REJECTED - score={chunk_score:.4f}, chars={chunk_chars:,}, reason=Budget exhausted, doc={doc_name[:40]}")
                chunks_rejected += 1
        else:
            # Include full chunk
            logger.info(f"[Proposal Agent]    Chunk {idx:2d}: ✅ INCLUDED - score={chunk_score:.4f}, chars={chunk_chars:,}, cumulative={total_chars+chunk_chars:,}, doc={doc_name[:40]}")
            content_parts.append(chunk_content)
            total_chars += chunk_chars
            chunks_included += 1
    
    logger.info(f"[Proposal Agent] ")
    logger.info(f"[Proposal Agent] 📈 FINAL SELECTION SUMMARY:")
    logger.info(f"[Proposal Agent]    ✅ Included: {chunks_included}/{len(sorted_chunks)} chunks ({total_chars:,} chars, ~{total_chars//4:,} tokens)")
    logger.info(f"[Proposal Agent]    ❌ Rejected: {chunks_rejected}/{len(sorted_chunks)} chunks")
    
    if cutoff_score is not None:
        logger.info(f"[Proposal Agent]    📍 Cutoff score: {cutoff_score:.4f} (chunks below this were rejected)")
        logger.info(f"[Proposal Agent]    💡 Rejection reason: {rejection_reason}")
    
    logger.info(f"[Proposal Agent] ")
    logger.info(f"[Proposal Agent] 🎓 CUSTOMER EXPLANATION:")
    logger.info(f"[Proposal Agent]    OpenSearch uses vector similarity to rank chunks by relevance (0.0 to 1.0)")
    logger.info(f"[Proposal Agent]    Higher scores = more semantically similar to your grant description")
    logger.info(f"[Proposal Agent]    We include chunks in order of relevance until hitting the {max_chars:,} char budget")
    logger.info(f"[Proposal Agent]    This ensures the LLM sees your MOST relevant content within token limits")
    
    return '\n\n'.join(content_parts)

def apply_content_budget(chunks: List[Dict[str, Any]], max_chars: int = 120000) -> str:
    """Sort chunks by relevance and concatenate up to a character budget.

    Shared by the grant-level retrieval and the per-section retrieval so both use
    identical budgeting (120K chars ≈ 30K tokens). Returns the combined content string.
    """
    sorted_chunks = sorted(chunks, key=lambda x: x.get('score', 0), reverse=True)
    content_parts = []
    total_chars = 0
    chunks_included = 0

    for chunk in sorted_chunks:
        chunk_content = chunk.get('content', {}).get('text', '')
        chunk_chars = len(chunk_content)
        if total_chars + chunk_chars > max_chars:
            remaining = max_chars - total_chars
            if remaining > 500:
                chunk_content = chunk_content[:remaining] + "..."
                chunk_chars = len(chunk_content)
            else:
                break
        content_parts.append(chunk_content)
        total_chars += chunk_chars
        chunks_included += 1

    logger.info(f"[Proposal Agent] ✅ Included {chunks_included}/{len(chunks)} chunks "
                f"({total_chars:,} chars, ~{total_chars//4:,} tokens)")
    return '\n\n'.join(content_parts)


def query_knowledge_base(grant_data: Dict[str, Any], selected_doc_ids: List[str], agency: str, user_id: str, kb_id: str) -> Dict[str, Any]:
    """
    Query Knowledge Base for relevant context with semantic filtering.
    Returns user documents with intelligent content extraction.
    
    BOTH MODES now use semantic search to extract relevant chunks:
    - MANUAL MODE: Semantic search within user-selected documents
    - AUTOMATIC MODE: Semantic search across all agency documents
    
    This ensures we stay within token limits while including the most relevant content.
    """
    logger.info(f"[Proposal Agent] 📚 Querying Knowledge Base with semantic filtering...")
    
    kb_context = {
        'user_documents': [],
        'agency_guidelines': []
    }
    
    # Get environment variables for document fetching
    document_table = os.environ.get('DOCUMENT_TABLE', '')
    document_bucket = os.environ.get('DOCUMENT_BUCKET', '')
    
    if not document_table or not document_bucket:
        logger.warning(f"[Proposal Agent] Missing DOCUMENT_TABLE or DOCUMENT_BUCKET env vars")
        return kb_context
    
    # Determine mode: MANUAL (user-selected) or AUTOMATIC (agency-filtered)
    document_ids = []
    mode = "MANUAL" if selected_doc_ids and len(selected_doc_ids) > 0 else "AUTOMATIC"
    
    # Step 1: Determine which documents to search
    if mode == "MANUAL":
        logger.info(f"[Proposal Agent] 🎯 MANUAL MODE: Using {len(selected_doc_ids)} user-selected documents")
        # The frontend sends selected documents as objects: {"id": "<docId>", "type": "content"|"guideline"}.
        # Normalize to plain document-id strings so the S3 source-URI prefixes are built correctly.
        # (Also tolerate plain-string ids for backward compatibility.)
        document_ids = []
        for item in selected_doc_ids:
            if isinstance(item, dict):
                doc_id = item.get('id') or item.get('documentId')
            else:
                doc_id = item
            if doc_id:
                document_ids.append(doc_id)
        logger.info(f"[Proposal Agent]    Normalized to {len(document_ids)} document id(s): {document_ids}")
    else:
        logger.info(f"[Proposal Agent] 🤖 AUTOMATIC MODE: Finding all {agency} content documents")
        
        try:
            table = dynamodb.Table(document_table)
            
            # Query for documents matching: userId + agency + category='reference'
            logger.info(f"[Proposal Agent] Scanning for documents: userId={user_id}, agency={agency}, category=reference")
            
            response = table.scan(
                FilterExpression='userId = :uid AND agency = :agency AND category = :category',
                ExpressionAttributeValues={
                    ':uid': user_id,
                    ':agency': agency,
                    ':category': 'reference'
                }
            )
            
            matching_docs = response.get('Items', [])
            logger.info(f"[Proposal Agent] Found {len(matching_docs)} matching documents")
            
            for doc in matching_docs:
                logger.info(f"[Proposal Agent]   - {doc.get('filename')} (agency: {doc.get('agency')})")
            
            document_ids = [doc.get('documentId') for doc in matching_docs]
            
            # AUTOMATIC MODE: Fail if no documents found for this agency
            if not document_ids:
                error_msg = (
                    f"No documents found for {agency}. "
                    f"To generate proposals for {agency} grants, please upload relevant documents "
                    f"(research papers, technical documentation, or reference materials) to your Knowledge Base "
                    f"and tag them with the '{agency}' agency. "
                    f"Visit the Knowledge Base page to upload documents."
                )
                logger.error(f"[Proposal Agent] ❌ {error_msg}")
                raise ValueError(error_msg)
            
        except ValueError:
            # Re-raise ValueError (our educational error)
            raise
        except Exception as e:
            logger.error(f"[Proposal Agent] Error scanning for documents: {e}")
            return kb_context
    
    if not document_ids:
        logger.info(f"[Proposal Agent] ℹ️ No documents to process")
        return kb_context
    
    # Build per-document source-URI prefixes so retrieval is scoped to exactly the
    # documents selected (manual) or matched for the agency (automatic). The KB
    # ingests objects under s3://<bucket>/user-<userId>/<documentId>/..., and Bedrock
    # exposes that path via the built-in 'x-amz-bedrock-kb-source-uri' key. A prefix
    # match captures both the original file and its extracted-text sibling (PDFs).
    doc_uri_prefixes = None
    if document_bucket and user_id:
        doc_uri_prefixes = [
            f"s3://{document_bucket}/user-{user_id}/{doc_id}/" for doc_id in document_ids if doc_id
        ]
        logger.info(f"[Proposal Agent] 🔒 {mode} mode: scoping retrieval to {len(doc_uri_prefixes)} document(s)")
    else:
        logger.warning(f"[Proposal Agent] ⚠️ Missing bucket/user; retrieval will NOT be document-scoped")
    
    # Step 2: Use semantic search to get relevant chunks (scoped to the documents above)
    max_results = 30 if mode == "AUTOMATIC" else 20  # More chunks for automatic mode
    chunks = retrieve_relevant_chunks(grant_data, kb_id, max_results, agency, doc_uri_prefixes)
    
    if not chunks:
        error_msg = (
            f"No relevant content found in Knowledge Base. "
            f"This could mean: (1) Documents are still being indexed (wait 1-2 minutes after upload), "
            f"(2) Documents don't contain content relevant to this grant, or "
            f"(3) Documents failed to sync to Knowledge Base. "
            f"Please check the Knowledge Base page to verify document status."
        )
        logger.error(f"[Proposal Agent] ❌ {error_msg}")
        raise ValueError(error_msg)
    
    # Step 2.5: Assess content quality and log for customer transparency
    quality_assessment = assess_content_quality(chunks)
    
    logger.info(f"[Proposal Agent] ")
    logger.info(f"[Proposal Agent] 📊 CONTENT QUALITY ASSESSMENT:")
    logger.info(f"[Proposal Agent]    Level: {quality_assessment['level']} ({quality_assessment['color'].upper()})")
    logger.info(f"[Proposal Agent]    Average Score: {quality_assessment['avgScore']:.4f} ({quality_assessment['chunkCount']} chunks)")
    logger.info(f"[Proposal Agent]    Score Range: {quality_assessment['minScore']:.4f} to {quality_assessment['maxScore']:.4f}")
    logger.info(f"[Proposal Agent]    Quality: {quality_assessment['message']}")
    logger.info(f"[Proposal Agent] ")
    logger.info(f"[Proposal Agent] 💡 RECOMMENDATION:")
    logger.info(f"[Proposal Agent]    {quality_assessment['recommendation']}")
    logger.info(f"[Proposal Agent] ")
    
    # Store quality assessment for later use (will be saved to DynamoDB)
    kb_context['contentQuality'] = quality_assessment
    
    # Step 3: Apply content budget (120K chars = ~30K tokens)
    # OpenSearch already found the most semantically relevant chunks - trust it!
    combined_content = apply_content_budget(chunks, max_chars=120000)
    chunks_included = len(combined_content.split('\n\n')) if combined_content else 0

    kb_context['user_documents'].append({
        'filename': f'Relevant Content ({chunks_included} chunks)',
        'content': combined_content,
        'type': 'content',
        'chunks_count': chunks_included
    })

    # Stash the retrieval parameters + this grant-level content so STEP 4 can run
    # section-aware retrieval (per-section queries) and fall back to this grant-level
    # content for any section that returns no chunks. These underscore keys are internal
    # and are not persisted anywhere.
    kb_context['_retrieval'] = {
        'kb_id': kb_id,
        'doc_uri_prefixes': doc_uri_prefixes,
        'max_results': max_results,
        'mode': mode,
        'base_content': combined_content,
    }

    logger.info(f"[Proposal Agent] ✅ Formatted {len(kb_context['user_documents'])} documents with relevant content")
    
    # Log token estimation
    total_chars = sum(len(doc['content']) for doc in kb_context['user_documents'])
    estimated_tokens = total_chars // 4
    logger.info(f"[Proposal Agent] 📊 Total content: {total_chars:,} chars (~{estimated_tokens:,} tokens)")
    
    return kb_context

def get_bedrock_prompts(agency: str) -> Dict[str, Dict[str, Any]]:
    """Retrieve agency-specific prompts from Bedrock"""
    logger.info(f"[Proposal Agent] Retrieving {agency} prompts from Bedrock")
    
    prompts = {}
    
    try:
        response = bedrock_agent.list_prompts(maxResults=100)
        prompt_summaries = response.get('promptSummaries', [])
        
        # Normalize agency name for prompt matching
        agency_no_spaces = agency.replace(' ', '')
        agency_with_hyphens = agency.replace(' ', '-')
        
        # Find prompts matching agency prefix
        agency_prompts = [
            p for p in prompt_summaries 
            if p.get('name', '').upper().startswith(f"{agency_no_spaces}-".upper()) or 
               p.get('name', '').upper().startswith(f"{agency_with_hyphens}-".upper())
        ]
        
        if agency_prompts:
            logger.info(f"[Proposal Agent] ✅ Found {len(agency_prompts)} prompt(s) for {agency}")
            for prompt_summary in agency_prompts:
                prompt_name = prompt_summary.get('name', '')
                prompt_id = prompt_summary.get('id', '')
                
                # Extract section name from prompt name
                # e.g., "European-Commission-Prompt-Excellence" -> "Excellence"
                # e.g., "NIH-Prompt-SpecificAims" -> "SpecificAims"
                section_name = 'abstract'  # default
                if '-' in prompt_name:
                    parts = prompt_name.split('-')
                    if len(parts) >= 3:
                        # Last part is the section name
                        section_name = parts[-1]
                
                try:
                    response = bedrock_agent.get_prompt(promptIdentifier=prompt_id)
                    variants = response.get('variants', [])
                    if variants:
                        template_config = variants[0].get('templateConfiguration', {})
                        text_config = template_config.get('text', {})
                        
                        prompts[section_name] = {
                            'id': prompt_id,
                            'name': prompt_name,
                            # Prompt description explains the SECTION'S INTENT (e.g. what
                            # "Broader Impacts" means for this agency). Captured so
                            # per-section retrieval can build a section-aware search
                            # query instead of a generic grant-only query.
                            'description': (
                                response.get('description', '')
                                or prompt_summary.get('description', '')
                            ),
                            'template': text_config.get('text', ''),
                            'variables': text_config.get('inputVariables', [])
                        }
                        logger.info(f"[Proposal Agent] ✅ Loaded prompt: {prompt_name} → section: {section_name}")
                except Exception as e:
                    logger.error(f"[Proposal Agent] Error loading prompt {prompt_name}: {e}")
        else:
            logger.warning(f"[Proposal Agent] ⚠️ No prompts found for agency '{agency}'")
        
    except Exception as e:
        logger.error(f"[Proposal Agent] Error retrieving prompts: {e}")
        raise RuntimeError(f"Failed to retrieve prompts from Bedrock: {e}")
    
    # If no prompts found, fail clearly — do not silently generate a useless one-page abstract
    if not prompts:
        supported = "NSF, NIH, DOD, DOE, NASA, DOT, European-Commission"
        raise RuntimeError(
            f"No proposal prompts found for agency '{agency}'. "
            f"Supported agencies: {supported}. "
            f"To add support for this agency, see install_docs/reference/ADDING_PROMPTS.md"
        )
    
    return prompts

def get_fallback_template(section: str, agency: str) -> str:
    """Fallback templates when Bedrock prompts don't exist"""
    return f"""You are an expert grant writer for {agency} proposals.

Write a compelling abstract (250 words) for this grant proposal:

GRANT INFORMATION:
{{{{grant_info}}}}

USER DOCUMENTS:
{{{{content}}}}

Write a clear, concise abstract that:
1. States the problem and its significance
2. Describes the proposed approach
3. Highlights expected outcomes and impact
4. Follows {agency} formatting requirements

Keep it under 250 words."""

def _build_grant_info_block(grant_data: Dict, agency: str) -> str:
    """Build the GRANT INFORMATION preamble block (same for every section)."""
    grant_info_parts = [
        f"Grant Title: {grant_data.get('title', 'Untitled')}",
        f"Agency: {agency}",
        f"Amount: {grant_data.get('amount', 'Not specified')}",
        f"Deadline: {grant_data.get('deadline', 'Not specified')}",
        f"\nGrant Description:\n{grant_data.get('description', '')}"
    ]
    if grant_data.get('eligibility'):
        grant_info_parts.append(f"\nEligibility:\n{grant_data.get('eligibility')}")
    return '\n'.join(grant_info_parts)


def build_section_prompt(section: str, prompt_data: Dict, grant_data: Dict, researcher_content: str, agency: str) -> str:
    """Build the final prompt for ONE section using the given researcher content.

    Uses Version B preamble architecture: inject RESEARCHER CONTENT and GRANT INFORMATION
    once as labelled blocks at the top, then replace all {{content}} / {{grant_info}}
    references in the instruction body with their label names.

    This prevents the token explosion caused by injecting large content blocks at every
    occurrence of {{content}} (which can appear 10-44 times per template): content is
    injected exactly once regardless of template reference count.

    `researcher_content` is passed in per section, so callers can inject section-aware
    retrieved content (Task 8) rather than the same block for every section.
    """
    # Model limits — conservative to handle EU/academic dense tokenization
    MAX_INPUT_TOKENS = 190000
    MAX_OUTPUT_TOKENS = 32000
    SAFETY_BUFFER = 5000
    CHARS_PER_TOKEN = 3  # conservative: EU text tokenizes denser than 4 chars/token

    grant_info = _build_grant_info_block(grant_data, agency)
    template = prompt_data['template']

    # Step 1: Replace {{content}}/{{grant_info}} in the instruction body with label names
    instruction_body = template.replace('{{content}}', 'RESEARCHER CONTENT')
    instruction_body = instruction_body.replace('{{grant_info}}', 'GRANT INFORMATION')
    instruction_body = instruction_body.replace('{{grant_title}}', grant_data.get('title', 'Untitled'))
    instruction_body = instruction_body.replace('{{grant_description}}', grant_data.get('description', ''))
    instruction_body = instruction_body.replace('{{agency}}', agency)

    # Step 2: Calculate token budget for the preamble content
    instruction_chars = len(instruction_body)
    grant_info_chars = len(grant_info)
    preamble_overhead_chars = 200  # labels + separators
    instruction_tokens = (instruction_chars + grant_info_chars + preamble_overhead_chars) // CHARS_PER_TOKEN
    available_tokens = MAX_INPUT_TOKENS - SAFETY_BUFFER - MAX_OUTPUT_TOKENS - instruction_tokens
    available_chars = available_tokens * CHARS_PER_TOKEN

    logger.info(f"[Proposal Agent] Section '{section}': instruction={instruction_tokens:,} tokens, "
                f"available for researcher content={available_tokens:,} tokens ({available_chars:,} chars)")

    # Step 3: Trim researcher content to fit budget
    if not researcher_content:
        researcher_content = "No specific user documents provided."
    if available_chars <= 0:
        logger.warning(f"[Proposal Agent] ⚠️  Template+grant_info alone near/over limit for '{section}' "
                       f"({instruction_tokens:,} tokens). Using minimal content placeholder.")
        researcher_content = "[Content omitted: prompt template exceeds token budget]"
    elif len(researcher_content) > available_chars:
        logger.warning(f"[Proposal Agent] ✂️  Trimming researcher content from {len(researcher_content):,} "
                       f"to {available_chars:,} chars for section '{section}'")
        researcher_content = researcher_content[:available_chars] + "\n...[content trimmed to fit token limit]"

    # Step 4: Build final prompt — preamble first, then instructions
    preamble = (
        f"RESEARCHER CONTENT (your primary source — refer to this throughout):\n"
        f"---\n"
        f"{researcher_content}\n"
        f"---\n\n"
        f"GRANT INFORMATION:\n"
        f"---\n"
        f"{grant_info}\n"
        f"---\n\n"
    )
    final_prompt = preamble + instruction_body
    final_tokens = len(final_prompt) // CHARS_PER_TOKEN
    logger.info(f"[Proposal Agent] ✅ Prepared prompt for '{section}': ~{final_tokens:,} tokens total "
                f"(content injected once, {template.count('{{content}}')}x {{content}} refs replaced with label)")
    return final_prompt


def _kb_context_to_content(kb_context: Dict) -> str:
    """Flatten kb_context['user_documents'] into a single researcher-content string."""
    if kb_context.get('user_documents'):
        user_docs_parts = []
        for i, doc in enumerate(kb_context['user_documents']):
            user_docs_parts.append(
                f"Document {i+1}: {doc['filename']}\n"
                f"Content:\n{doc['content']}\n"
            )
        return '\n\n'.join(user_docs_parts)
    return "No specific user documents provided."


def prepare_prompts(prompts: Dict[str, Dict], grant_data: Dict, kb_context: Dict, agency: str) -> Dict[str, str]:
    """Substitute variables in prompt templates with the shared (grant-level) content.

    Retained for callers that want the non-section-aware behavior (same researcher
    content for every section). The per-section-aware path in `invoke()` calls
    `build_section_prompt` directly with section-specific content instead.
    """
    logger.info(f"[Proposal Agent] Preparing prompts with grant data (preamble architecture)")
    full_user_documents = _kb_context_to_content(kb_context)
    prepared = {}
    for section, prompt_data in prompts.items():
        prepared[section] = build_section_prompt(section, prompt_data, grant_data, full_user_documents, agency)
    return prepared


def build_section_intent(section: str, prompt_data: Dict) -> str:
    """Build the section-intent text used to make retrieval section-aware.

    Combines the human-readable section name with the agency prompt's description
    (what that section should cover). Falls back to just the section name if the
    prompt has no description.
    """
    readable_section = section.replace('_', ' ').replace('-', ' ').strip()
    description = (prompt_data.get('description') or '').strip()
    parts = [readable_section]
    if description:
        parts.append(description)
    return ' — '.join(parts)

def _apply_guardrail_grounding(source_text: str, query_text: str, response_text: str) -> Dict[str, float]:
    """Single ApplyGuardrail call. Returns {'groundingScore':.., 'relevanceScore':..}
    or {} on any failure (fails open — see score_section_grounding docstring).
    """
    try:
        # NOTE: hardcoded 'DRAFT', deliberately NOT env-var GUARDRAIL_VERSION.
        # The numbered guardrail version (env var, used elsewhere for the
        # prompt-injection pre-screen) was snapshotted before contextual
        # grounding was added to the guardrail, and CloudFormation cannot
        # cleanly repoint/replace that cross-stack version reference (3
        # deploy failures tried — see backend.ts comment on guardrailVersion
        # for the full story). DRAFT always reflects the guardrail's current
        # live config, confirmed via `aws bedrock get-guardrail
        # --guardrail-version DRAFT` to already include the grounding filters
        # — no CloudFormation resource/export needed for this at all.
        response = bedrock_runtime.apply_guardrail(
            guardrailIdentifier=GUARDRAIL_ID,
            guardrailVersion='DRAFT',
            source='OUTPUT',
            content=[
                {'text': {'text': source_text, 'qualifiers': ['grounding_source']}},
                {'text': {'text': query_text, 'qualifiers': ['query']}},
                {'text': {'text': response_text}},
            ],
        )
        scores: Dict[str, float] = {}
        for assessment in response.get('assessments', []):
            grounding_policy = assessment.get('contextualGroundingPolicy', {})
            for f in grounding_policy.get('filters', []):
                if f.get('type') == 'GROUNDING':
                    scores['groundingScore'] = f.get('score')
                elif f.get('type') == 'RELEVANCE':
                    scores['relevanceScore'] = f.get('score')
        return scores
    except Exception as e:
        logger.warning(f"[Proposal Agent] ⚠️ ApplyGuardrail chunk call failed (non-blocking): {e}")
        return {}


def score_section_grounding(section_name: str, section_intent: str, researcher_content: str, generated_text: str) -> Dict[str, Any]:
    """Score a generated section's contextual grounding against the researcher
    content actually used for that section, via Bedrock Guardrails ApplyGuardrail.

    This does NOT block or alter generation — the guardrail's contextual
    grounding filters are configured with action=NONE (see backend.ts), so
    this call can only ever report a score, never intervene. Sections like
    Implementation legitimately contain illustrative (ungrounded) budget/
    timeline content by design, so blocking on low grounding would be wrong.
    The score is surfaced to the user so they know how much of a section is
    backed by their documents vs. generic/illustrative proposal boilerplate.

    Bedrock's contextual grounding filter requires THREE qualified content
    blocks in the same ApplyGuardrail call: grounding_source (the reference
    material), query (what was asked), and the actual model output (no
    qualifier). Omitting any one of them fails with ValidationException
    ("Grounding source, query and content to guard are required") — confirmed
    directly against the live API. `section_intent` (the section-aware search
    query already built for retrieval) doubles as the "query" here since it's
    exactly "what this section is trying to address."

    CHUNKED, WHOLE-SECTION SCORING (not just the opening):
    Bedrock's contextual grounding policy enforces hard character limits per
    content block: grounding_source <= 100,000 chars, query <= 1,000 chars,
    response (the generated text) <= 5,000 chars. Confirmed directly against
    the live API (ValidationException: "response length is too long...
    maximum allowed response length is 5 text units") — proposal sections run
    ~2,000-2,500 words (~12-15K chars), far over that response limit.
    Scoring only the first ~4,500 chars would be MISLEADING, not just
    incomplete: our section prompts are structurally front-loaded with
    grounded content (e.g. Implementation opens with Technical Approach, drawn
    from the researcher's documents) and back-loaded with unsourced
    boilerplate (budget/timeline/personnel, explicitly NOT meant to come from
    the documents — see the "[Not sourced from your documents]" attribution
    requirement in the prompts). Truncating to the opening would systematically
    sample the most-grounded part and skip the intentionally-unsourced part,
    inflating the score in exactly the direction that hides the thing a user
    should double-check.
    Instead, we split the section into ~4,000-char chunks, run ApplyGuardrail
    once per chunk (same grounding_source/query every time — only the
    response chunk changes), and return a length-weighted average across all
    chunks. This covers the entire section rather than a biased sample, at the
    cost of a few extra ApplyGuardrail calls per section (~200-300ms each,
    negligible next to the multi-second Claude generation call).
    """
    if not GUARDRAIL_ID:
        return {}

    MAX_GROUNDING_SOURCE_CHARS = 90000
    MAX_QUERY_CHARS = 900
    CHUNK_CHARS = 4000  # comfortably under the 5,000-char per-call response limit

    source_text = (researcher_content or "")[:MAX_GROUNDING_SOURCE_CHARS]
    if not source_text.strip():
        logger.info(f"[Proposal Agent] ℹ️ No researcher content to ground '{section_name}' against; skipping grounding score")
        return {}
    query_text = (section_intent or section_name or "")[:MAX_QUERY_CHARS]

    text = generated_text or ""
    chunks = [text[i:i + CHUNK_CHARS] for i in range(0, len(text), CHUNK_CHARS)] or [""]

    weighted_sums: Dict[str, float] = {}
    total_weight = 0
    chunks_scored = 0

    for chunk in chunks:
        chunk_len = len(chunk)
        if chunk_len == 0:
            continue
        chunk_scores = _apply_guardrail_grounding(source_text, query_text, chunk)
        if not chunk_scores:
            continue  # this chunk's call failed; skip it rather than skew the average with a 0
        for key, value in chunk_scores.items():
            if isinstance(value, (int, float)):
                weighted_sums[key] = weighted_sums.get(key, 0.0) + value * chunk_len
        total_weight += chunk_len
        chunks_scored += 1

    if total_weight == 0:
        logger.warning(f"[Proposal Agent] ⚠️ Grounding check failed for '{section_name}' — no chunks scored (non-blocking)")
        return {}

    scores = {key: total / total_weight for key, total in weighted_sums.items()}
    logger.info(f"[Proposal Agent] 📊 Grounding score for '{section_name}' "
                f"({chunks_scored}/{len(chunks)} chunks scored): {scores}")
    return scores


def generate_section_with_claude(prompt: str, section_name: str, max_retries: int = 3) -> str:
    """Call Bedrock Claude with STREAMING to generate one section.
    
    Retries up to max_retries times on transient internalServerException errors
    using exponential backoff (5s, 10s, 20s).
    """
    print(f"[Proposal Agent] 🤖 invoke_model_with_response_stream → {CLAUDE_MODEL_ID} for '{section_name}'", flush=True)
    logger.info(f"[Proposal Agent] Generating section: {section_name}")
    
    last_exception = None
    for attempt in range(max_retries):
        if attempt > 0:
            wait_seconds = 5 * (2 ** (attempt - 1))  # 5s, 10s, 20s
            print(f"[Proposal Agent] ⏳ Retry {attempt}/{max_retries - 1} for '{section_name}' after {wait_seconds}s...", flush=True)
            logger.warning(f"[Proposal Agent] Retry {attempt} for {section_name} after {wait_seconds}s")
            time.sleep(wait_seconds)

        try:
            response = bedrock_runtime.invoke_model_with_response_stream(
                modelId=CLAUDE_MODEL_ID,
                body=json.dumps({
                    'anthropic_version': 'bedrock-2023-05-31',
                    'max_tokens': 32000,
                    'temperature': PROPOSAL_TEMPERATURE,
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ]
                })
            )
            
            # Collect streamed response
            content = ""
            stream = response.get('body')
            
            if stream:
                for event in stream:
                    chunk = event.get('chunk')
                    if chunk:
                        chunk_data = json.loads(chunk.get('bytes').decode())
                        
                        if chunk_data['type'] == 'content_block_delta':
                            delta = chunk_data.get('delta', {})
                            if delta.get('type') == 'text_delta':
                                text = delta.get('text', '')
                                content += text
            
            word_count = len(content.split())
            print(f"[Proposal Agent] ✅ Claude returned {word_count} words for '{section_name}'", flush=True)
            logger.info(f"[Proposal Agent] ✅ Generated {word_count} words for {section_name}")
            
            return content

        except Exception as e:
            last_exception = e
            error_str = str(e)
            # Only retry on transient Bedrock errors
            if 'internalServerException' in error_str or 'throttlingException' in error_str or 'serviceUnavailableException' in error_str:
                print(f"[Proposal Agent] ⚠️ Transient error for '{section_name}' (attempt {attempt + 1}/{max_retries}): {e}", flush=True)
                logger.warning(f"[Proposal Agent] Transient error for {section_name} attempt {attempt + 1}: {e}")
                continue
            # Non-retryable error — fail immediately
            print(f"[Proposal Agent] ❌ Claude error for '{section_name}': {e}", flush=True)
            logger.error(f"[Proposal Agent] Error generating {section_name}: {e}")
            raise

    print(f"[Proposal Agent] ❌ Claude failed for '{section_name}' after {max_retries} attempts: {last_exception}", flush=True)
    logger.error(f"[Proposal Agent] Failed generating {section_name} after {max_retries} attempts: {last_exception}")
    raise last_exception

def assemble_proposal(sections: Dict[str, Dict], grant_data: Dict, agency: str) -> Dict[str, Any]:
    """Combine sections into complete proposal"""
    logger.info(f"[Proposal Agent] Assembling complete proposal")
    
    # Build HTML document
    html_parts = [
        f"<html><head><title>Proposal: {grant_data.get('title', 'Untitled')}</title>",
        "<style>",
        "body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.6; }",
        "h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }",
        "h2 { color: #34495e; margin-top: 30px; }",
        ".section { margin: 20px 0; }",
        ".metadata { background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 30px; }",
        "</style></head><body>",
        f"<h1>Grant Proposal: {grant_data.get('title', 'Untitled')}</h1>",
        f"<div class='metadata'>",
        f"<p><strong>Agency:</strong> {agency}</p>",
        f"<p><strong>Amount:</strong> {grant_data.get('amount', 'Not specified')}</p>",
        f"<p><strong>Generated:</strong> {datetime.now().strftime('%B %d, %Y')}</p>",
        f"</div>"
    ]
    
    # Add each section
    for section_name, section_data in sections.items():
        title = section_data['title']
        content = section_data['content']
        
        html_parts.append(f"<div class='section'>")
        html_parts.append(f"<h2>{title}</h2>")
        html_parts.append(f"<div>{content.replace(chr(10), '<br>')}</div>")
        html_parts.append(f"</div>")
    
    html_parts.append("</body></html>")
    
    proposal_html = '\n'.join(html_parts)
    
    # Calculate metadata
    total_words = sum(s['wordCount'] for s in sections.values())
    
    metadata = {
        'grantId': grant_data.get('grantId', 'unknown'),
        'grantTitle': grant_data.get('title', 'Untitled'),
        'agency': agency,
        'generatedAt': datetime.utcnow().isoformat(),
        'wordCount': total_words,
        'sectionCount': len(sections)
    }
    
    logger.info(f"[Proposal Agent] ✅ Assembled {len(sections)} sections, {total_words} total words")
    
    return {
        'html': proposal_html,
        'json': sections,
        'metadata': metadata
    }

def save_to_s3(proposal_id: str, user_id: str, content: Dict[str, Any], bucket: str, debug_prompts: Dict[str, str] = None) -> Dict[str, str]:
    """Save proposal to S3 and return download URL"""
    logger.info(f"[Proposal Agent] Saving proposal to S3")
    
    # S3 key structure: {userId}/{proposalId}/proposal.html
    s3_key = f"{user_id}/{proposal_id}/proposal.html"
    
    try:
        # Upload HTML
        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=content['html'].encode('utf-8'),
            ContentType='text/html',
            Metadata={
                'proposalId': proposal_id,
                'userId': user_id,
                'generatedAt': content['metadata']['generatedAt']
            }
        )
        
        # Save debug prompts if provided
        if debug_prompts:
            debug_key = f"{user_id}/{proposal_id}/debug_prompts.json"
            s3_client.put_object(
                Bucket=bucket,
                Key=debug_key,
                Body=json.dumps(debug_prompts, indent=2).encode('utf-8'),
                ContentType='application/json'
            )
            logger.info(f"[Proposal Agent] ✅ Saved debug prompts")
        
        # Generate presigned URL (7 days max)
        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': s3_key},
            ExpiresIn=604800  # 7 days
        )
        
        logger.info(f"[Proposal Agent] ✅ Saved to S3: {s3_key}")
        
        return {
            's3_key': s3_key,
            'download_url': download_url
        }
        
    except Exception as e:
        logger.error(f"[Proposal Agent] Error saving to S3: {e}")
        raise

if __name__ == '__main__':
    print("=" * 80, flush=True)
    print("[Proposal Agent] STEP 5: Starting agent runtime...", flush=True)
    print("[Proposal Agent] *** CODE VERSION: 2026-03-05-v5 — preamble prompt architecture (content injected once) ***", flush=True)
    print("=" * 80, flush=True)
    logger.info("🚀 Starting Proposal Generation Agent")
    print(f"[Proposal Agent] About to call app.run()", flush=True)
    print(f"[Proposal Agent] App has entrypoint registered: {hasattr(app, '_entrypoint')}", flush=True)
    
    try:
        print("[Proposal Agent] Calling app.run()...", flush=True)
        app.run()
        print("[Proposal Agent] app.run() returned (this should not happen)", flush=True)
    except BaseException as e:
        print(f"[Proposal Agent] ❌ ERROR in app.run(): {type(e).__name__}: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise
