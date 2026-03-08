"""
Proposal Evaluator Agent - AgentCore A2A
Evaluates proposal quality against grant guidelines and source material
Uses bedrock-agentcore SDK for proper A2A communication
"""
import sys
import os

# STEP 1: Log Python environment
print("=" * 80, flush=True)
print("[Proposal Evaluator] STEP 1: Python Environment", flush=True)
print("=" * 80, flush=True)
print(f"[Proposal Evaluator] Python version: {sys.version}", flush=True)
print(f"[Proposal Evaluator] Python executable: {sys.executable}", flush=True)
print(f"[Proposal Evaluator] Working directory: {os.getcwd()}", flush=True)
print(f"[Proposal Evaluator] AWS_REGION env: {os.environ.get('AWS_REGION', 'NOT SET')}", flush=True)
print("", flush=True)

# STEP 2: Import standard library
print("[Proposal Evaluator] STEP 2: Importing standard library modules...", flush=True)
import json
import logging
from datetime import datetime
from uuid import uuid4
print("[Proposal Evaluator] ✅ Standard library imports successful", flush=True)
print("", flush=True)

# STEP 3: Import boto3
print("[Proposal Evaluator] STEP 3: Importing boto3...", flush=True)
try:
    import boto3
    print(f"[Proposal Evaluator] ✅ boto3 imported successfully (version: {boto3.__version__})", flush=True)
except Exception as e:
    print(f"[Proposal Evaluator] ❌ Failed to import boto3: {e}", flush=True)
    raise
print("", flush=True)

# STEP 4: Import anthropic
print("[Proposal Evaluator] STEP 4: Importing anthropic...", flush=True)
try:
    import anthropic
    print(f"[Proposal Evaluator] ✅ anthropic imported successfully (version: {anthropic.__version__})", flush=True)
except Exception as e:
    print(f"[Proposal Evaluator] ❌ Failed to import anthropic: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise
print("", flush=True)

# STEP 5: Import AgentCore SDK
print("[Proposal Evaluator] STEP 5: Importing bedrock-agentcore SDK...", flush=True)
try:
    from bedrock_agentcore.runtime import BedrockAgentCoreApp
    print("[Proposal Evaluator] ✅ bedrock-agentcore SDK imported successfully", flush=True)
except Exception as e:
    print(f"[Proposal Evaluator] ❌ Failed to import bedrock-agentcore: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise
print("", flush=True)

# STEP 6: Configure logging
print("[Proposal Evaluator] STEP 6: Configuring logging...", flush=True)
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
logger.info("[Proposal Evaluator] ✅ Logging configured")
print("", flush=True)

# STEP 7: Initialize AgentCore app
print("[Proposal Evaluator] STEP 7: Initializing AgentCore app...", flush=True)
try:
    app = BedrockAgentCoreApp()
    logger.info("[Proposal Evaluator] ✅ AgentCore app initialized")
    print("[Proposal Evaluator] ✅ AgentCore app initialized", flush=True)
except Exception as e:
    print(f"[Proposal Evaluator] ❌ Failed to initialize AgentCore app: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise
print("", flush=True)

# STEP 8: Initialize AWS clients
print("[Proposal Evaluator] STEP 8: Initializing AWS clients...", flush=True)
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-2')
logger.info(f"[Proposal Evaluator] Using AWS region: {AWS_REGION}")
print(f"[Proposal Evaluator] Using AWS region: {AWS_REGION}", flush=True)

try:
    bedrock_runtime = boto3.client('bedrock-runtime', region_name=AWS_REGION)
    logger.info("[Proposal Evaluator] ✅ Bedrock Runtime client initialized")
    print("[Proposal Evaluator] ✅ Bedrock Runtime client initialized", flush=True)
except Exception as e:
    print(f"[Proposal Evaluator] ❌ Failed to initialize Bedrock client: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise
print("", flush=True)

print("=" * 80, flush=True)
print("[Proposal Evaluator] ✅ ALL INITIALIZATION STEPS COMPLETED", flush=True)
print("=" * 80, flush=True)
print("", flush=True)

@app.entrypoint
def invoke(payload: dict) -> dict:
    """
    Main entrypoint - receives payload from invoke_agent_runtime
    
    Args:
        payload: Dict with proposalContent, prompt, contentQuality, grantInfo
    
    Returns:
        Dict with evaluation scores, strengths, weaknesses, recommendations
    """
    print("=" * 80, flush=True)
    print("[Proposal Evaluator] 🚀 ENTRYPOINT INVOKED", flush=True)
    print("=" * 80, flush=True)
    
    try:
        logger.info("=" * 80)
        logger.info("[Proposal Evaluator] 🚀 AGENT INVOKED")
        logger.info("=" * 80)
        print(f"[Proposal Evaluator] 📊 Received evaluation request", flush=True)
        logger.info(f"[Proposal Evaluator] 📊 Received evaluation request")
        logger.info(f"[Proposal Evaluator] Payload type: {type(payload)}")
        logger.info(f"[Proposal Evaluator] Payload keys: {list(payload.keys()) if isinstance(payload, dict) else 'NOT A DICT'}")
        
        # Extract parameters
        proposal_id = payload.get('proposalId')
        user_id = payload.get('userId')
        proposal_content = payload.get('proposalContent', {})
        prompt = payload.get('prompt', {})
        content_quality = payload.get('contentQuality', {})
        grant_info = payload.get('grantInfo', {})
        
        if not proposal_id:
            raise ValueError("Missing required parameter: proposalId")
        if not proposal_content:
            raise ValueError("Missing required parameter: proposalContent")
        
        logger.info(f"[Proposal Evaluator] Evaluating proposal {proposal_id} for user {user_id}")
        logger.info(f"[Proposal Evaluator] Grant: {grant_info.get('grantId')} - {grant_info.get('title')}")
        logger.info(f"[Proposal Evaluator] Content quality level: {content_quality.get('level', 'UNKNOWN')}")
        
        # EVALUATION STEP 1: Content Quality Score (30%)
        logger.info(f"[Proposal Evaluator] 📊 Step 1: Evaluating content quality...")
        content_quality_score = evaluate_content_quality(content_quality)
        logger.info(f"[Proposal Evaluator] ✅ Content quality score: {content_quality_score['score']:.2f}")
        
        # EVALUATION STEP 2: Guideline Adherence (40%)
        logger.info(f"[Proposal Evaluator] 📊 Step 2: Evaluating guideline adherence...")
        guideline_score = evaluate_guideline_adherence(proposal_content, prompt, bedrock_runtime)
        logger.info(f"[Proposal Evaluator] ✅ Guideline adherence score: {guideline_score['score']:.2f}")
        
        # EVALUATION STEP 3: Completeness (20%)
        logger.info(f"[Proposal Evaluator] 📊 Step 3: Evaluating completeness...")
        completeness_score = evaluate_completeness(proposal_content)
        logger.info(f"[Proposal Evaluator] ✅ Completeness score: {completeness_score['score']:.2f}")
        
        # EVALUATION STEP 4: Source Utilization (10%)
        logger.info(f"[Proposal Evaluator] 📊 Step 4: Evaluating source utilization...")
        source_score = evaluate_source_utilization(content_quality)
        logger.info(f"[Proposal Evaluator] ✅ Source utilization score: {source_score['score']:.2f}")
        
        # Calculate overall score
        overall_score = (
            content_quality_score['weightedScore'] +
            guideline_score['weightedScore'] +
            completeness_score['weightedScore'] +
            source_score['weightedScore']
        )
        
        overall_grade = calculate_grade(overall_score)
        confidence = determine_confidence(content_quality_score, guideline_score, completeness_score, source_score)
        
        # Collect strengths, weaknesses, recommendations
        strengths = []
        weaknesses = []
        recommendations = []
        red_flags = []
        
        # Aggregate from all evaluation components
        strengths.extend(content_quality_score.get('strengths', []))
        strengths.extend(guideline_score.get('strengths', []))
        strengths.extend(completeness_score.get('strengths', []))
        strengths.extend(source_score.get('strengths', []))
        
        weaknesses.extend(content_quality_score.get('weaknesses', []))
        weaknesses.extend(guideline_score.get('weaknesses', []))
        weaknesses.extend(completeness_score.get('weaknesses', []))
        weaknesses.extend(source_score.get('weaknesses', []))
        
        recommendations.extend(content_quality_score.get('recommendations', []))
        recommendations.extend(guideline_score.get('recommendations', []))
        recommendations.extend(completeness_score.get('recommendations', []))
        recommendations.extend(source_score.get('recommendations', []))
        
        red_flags.extend(guideline_score.get('redFlags', []))
        red_flags.extend(completeness_score.get('redFlags', []))
        
        # Build result
        result = {
            "evaluationId": str(uuid4()),
            "proposalId": proposal_id,
            "evaluatedAt": datetime.utcnow().isoformat() + 'Z',
            "overallScore": round(overall_score, 2),
            "overallGrade": overall_grade,
            "confidence": confidence,
            "scores": {
                "contentQuality": content_quality_score,
                "guidelineAdherence": guideline_score,
                "completeness": completeness_score,
                "sourceUtilization": source_score
            },
            "strengths": strengths[:5],  # Top 5
            "weaknesses": weaknesses[:5],  # Top 5
            "recommendations": recommendations[:5],  # Top 5
            "redFlags": red_flags
        }
        
        logger.info(f"[Proposal Evaluator] ✅ Evaluation complete for {proposal_id}")
        logger.info(f"[Proposal Evaluator]    Overall Score: {overall_score:.2f} ({overall_grade})")
        logger.info(f"[Proposal Evaluator]    Confidence: {confidence}")
        logger.info(f"[Proposal Evaluator]    Red Flags: {len(red_flags)}")
        
        return result
        
    except ValueError as e:
        logger.error(f"[Proposal Evaluator] ❌ Invalid parameters: {e}")
        raise
        
    except Exception as e:
        logger.error(f"[Proposal Evaluator] ❌ Error evaluating proposal: {e}")
        import traceback
        traceback.print_exc()
        raise


def evaluate_content_quality(content_quality: dict) -> dict:
    """
    Evaluate based on semantic search scores (30% weight)
    
    Scoring:
    - RED (0.0-0.25): 0.25 score - Major penalty
    - ORANGE (0.26-0.35): 0.50 score - Moderate penalty  
    - YELLOW (0.36-0.50): 0.70 score - Minor penalty
    - GREEN (0.51+): 0.90 score - Good quality
    """
    logger.info("[Proposal Evaluator] Analyzing content quality from semantic scores...")
    
    level = content_quality.get('level', 'UNKNOWN')
    avg_score = content_quality.get('avgScore', 0)
    color = content_quality.get('color', 'red')
    
    # Map color to score
    score_map = {
        'red': 0.25,
        'orange': 0.50,
        'yellow': 0.70,
        'green': 0.90
    }
    
    score = score_map.get(color, 0.25)
    weight = 0.30
    weighted_score = score * weight
    grade = calculate_grade(score)
    
    strengths = []
    weaknesses = []
    recommendations = []
    
    if color == 'green':
        strengths.append("Strong source material with high semantic relevance")
        reasoning = f"Excellent content quality ({level}). Semantic scores are strong (avg: {avg_score:.2f})."
    elif color == 'yellow':
        weaknesses.append("Source material quality is moderate")
        recommendations.append("Consider uploading more relevant documents to improve semantic scores")
        reasoning = f"Moderate content quality ({level}). Semantic scores are acceptable (avg: {avg_score:.2f}) but could be stronger."
    elif color == 'orange':
        weaknesses.append("Source material quality is questionable")
        recommendations.append("Upload more relevant documents - current sources may not be ideal")
        reasoning = f"Questionable content quality ({level}). Semantic scores are low (avg: {avg_score:.2f})."
    else:  # red
        weaknesses.append("Source material quality is weak - proposal built on poor foundations")
        recommendations.append("CRITICAL: Upload highly relevant documents before generating proposals")
        reasoning = f"Weak content quality ({level}). Semantic scores are very low (avg: {avg_score:.2f})."
    
    return {
        "score": score,
        "weight": weight,
        "weightedScore": weighted_score,
        "grade": grade,
        "reasoning": reasoning,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations
    }


def evaluate_guideline_adherence(proposal_content: dict, prompt: dict, bedrock_client) -> dict:
    """
    Evaluate how well proposal follows grant guidelines (40% weight)
    Uses Claude to analyze against success criteria
    """
    logger.info("[Proposal Evaluator] Analyzing guideline adherence with Claude...")
    
    # Extract proposal HTML and prompt content
    html = proposal_content.get('html', '')
    prompt_content = prompt.get('content', '')
    success_criteria = prompt.get('successCriteria', [])
    
    # Build evaluation prompt for Claude
    evaluation_prompt = f"""You are evaluating a grant proposal against specific guidelines.

GRANT GUIDELINES AND SUCCESS CRITERIA:
{prompt_content}

PROPOSAL CONTENT (HTML):
{html[:10000]}  

Analyze how well the proposal addresses each success criterion. For each criterion:
1. Is it addressed? (yes/no)
2. How well? (strong/moderate/weak/missing)
3. Provide brief evidence from the proposal

Return your analysis as JSON with this structure:
{{
  "overallScore": 0.85,
  "criteria": [
    {{
      "criterion": "Must address innovation clearly",
      "addressed": true,
      "quality": "strong",
      "evidence": "Section 2 provides detailed innovation approach..."
    }}
  ],
  "strengths": ["Clear innovation section", "Strong methodology"],
  "weaknesses": ["Missing budget justification"],
  "recommendations": ["Add explicit budget section"],
  "redFlags": ["Budget section completely missing"]
}}

Be critical but fair. Focus on what's actually in the proposal."""

    try:
        # Call Claude via Bedrock
        response = bedrock_client.invoke_model(
            modelId='us.anthropic.claude-sonnet-4-5-20250929-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
                "messages": [{
                    "role": "user",
                    "content": evaluation_prompt
                }]
            })
        )
        
        response_body = json.loads(response['body'].read())
        claude_response = response_body['content'][0]['text']
        
        # Parse Claude's JSON response
        # Extract JSON from markdown code blocks if present
        if '```json' in claude_response:
            claude_response = claude_response.split('```json')[1].split('```')[0].strip()
        elif '```' in claude_response:
            claude_response = claude_response.split('```')[1].split('```')[0].strip()
        
        analysis = json.loads(claude_response)
        
        score = analysis.get('overallScore', 0.70)
        weight = 0.40
        weighted_score = score * weight
        grade = calculate_grade(score)
        
        return {
            "score": score,
            "weight": weight,
            "weightedScore": weighted_score,
            "grade": grade,
            "reasoning": f"Analyzed {len(analysis.get('criteria', []))} success criteria. {len([c for c in analysis.get('criteria', []) if c.get('addressed')])} addressed.",
            "criteria": analysis.get('criteria', []),
            "strengths": analysis.get('strengths', []),
            "weaknesses": analysis.get('weaknesses', []),
            "recommendations": analysis.get('recommendations', []),
            "redFlags": analysis.get('redFlags', [])
        }
        
    except Exception as e:
        logger.error(f"[Proposal Evaluator] Error calling Claude: {e}")
        # Fallback to simple heuristic
        return {
            "score": 0.70,
            "weight": 0.40,
            "weightedScore": 0.28,
            "grade": "C+",
            "reasoning": "Unable to perform detailed analysis. Using heuristic evaluation.",
            "criteria": [],
            "strengths": [],
            "weaknesses": ["Could not perform detailed guideline analysis"],
            "recommendations": ["Manual review recommended"],
            "redFlags": []
        }


def evaluate_completeness(proposal_content: dict) -> dict:
    """
    Evaluate proposal completeness (20% weight)
    Check for required sections and adequate content
    """
    logger.info("[Proposal Evaluator] Analyzing completeness...")
    
    # FIXED: sections are in 'json' key, not 'sections'
    sections = proposal_content.get('json', {})
    html = proposal_content.get('html', '')
    metadata = proposal_content.get('metadata', {})
    
    # Use metadata if available (more reliable)
    total_sections = metadata.get('sectionCount', len(sections))
    total_words = metadata.get('wordCount', sum(s.get('wordCount', 0) for s in sections.values()))
    
    # Simple scoring based on sections and word count
    section_score = min(total_sections / 5.0, 1.0)  # Expect ~5 sections
    word_score = min(total_words / 3000.0, 1.0)  # Expect ~3000 words
    
    score = (section_score * 0.6 + word_score * 0.4)
    weight = 0.20
    weighted_score = score * weight
    grade = calculate_grade(score)
    
    strengths = []
    weaknesses = []
    recommendations = []
    red_flags = []
    
    if total_sections >= 5:
        strengths.append(f"All major sections present ({total_sections} sections)")
    elif total_sections >= 3:
        weaknesses.append(f"Some sections may be missing (only {total_sections} sections)")
    else:
        weaknesses.append(f"Proposal appears incomplete (only {total_sections} sections)")
        red_flags.append("Very few sections - proposal may be incomplete")
    
    if total_words >= 3000:
        strengths.append(f"Adequate detail provided ({total_words:,} words)")
    elif total_words >= 1500:
        weaknesses.append(f"Proposal is somewhat brief ({total_words:,} words)")
        recommendations.append("Consider expanding key sections with more detail")
    else:
        weaknesses.append(f"Proposal is very brief ({total_words:,} words)")
        recommendations.append("Significantly expand content - proposals typically need 3000+ words")
    
    reasoning = f"{total_sections} sections with {total_words:,} total words."
    
    return {
        "score": score,
        "weight": weight,
        "weightedScore": weighted_score,
        "grade": grade,
        "reasoning": reasoning,
        "sections": [
            {
                "name": name,
                "present": True,
                "wordCount": data.get('wordCount', 0),
                "status": "GOOD" if data.get('wordCount', 0) >= 500 else "SHORT"
            }
            for name, data in sections.items()
        ],
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "redFlags": red_flags
    }


def evaluate_source_utilization(content_quality: dict) -> dict:
    """
    Evaluate how well source materials were utilized (10% weight)
    """
    logger.info("[Proposal Evaluator] Analyzing source utilization...")
    
    # FIXED: field is 'chunkCount' not 'totalChunks'
    chunks_used = content_quality.get('chunkCount', 0)
    avg_score = content_quality.get('avgScore', 0)
    
    # Score based on number of chunks and their quality
    chunk_score = min(chunks_used / 20.0, 1.0)  # Expect ~20 chunks
    quality_score = min(avg_score / 0.50, 1.0)  # Expect avg >= 0.50
    
    score = (chunk_score * 0.5 + quality_score * 0.5)
    weight = 0.10
    weighted_score = score * weight
    grade = calculate_grade(score)
    
    strengths = []
    weaknesses = []
    recommendations = []
    
    if chunks_used >= 20:
        strengths.append(f"Good diversity of sources ({chunks_used} chunks used)")
    elif chunks_used >= 10:
        weaknesses.append(f"Moderate source diversity ({chunks_used} chunks)")
        recommendations.append("Consider using more diverse source materials")
    else:
        weaknesses.append(f"Limited source diversity ({chunks_used} chunks)")
        recommendations.append("Upload more documents to provide richer source material")
    
    reasoning = f"Used {chunks_used} chunks with average semantic score of {avg_score:.2f}."
    
    return {
        "score": score,
        "weight": weight,
        "weightedScore": weighted_score,
        "grade": grade,
        "reasoning": reasoning,
        "chunksUsed": chunks_used,
        "avgSemanticScore": avg_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations
    }


def calculate_grade(score: float) -> str:
    """Convert numeric score to letter grade"""
    if score >= 0.93:
        return "A"
    elif score >= 0.90:
        return "A-"
    elif score >= 0.87:
        return "B+"
    elif score >= 0.83:
        return "B"
    elif score >= 0.80:
        return "B-"
    elif score >= 0.77:
        return "C+"
    elif score >= 0.73:
        return "C"
    elif score >= 0.70:
        return "C-"
    elif score >= 0.67:
        return "D+"
    elif score >= 0.63:
        return "D"
    elif score >= 0.60:
        return "D-"
    else:
        return "F"


def determine_confidence(content_quality_score, guideline_score, completeness_score, source_score) -> str:
    """Determine confidence level in the evaluation"""
    # High confidence if all scores are consistent
    scores = [
        content_quality_score['score'],
        guideline_score['score'],
        completeness_score['score'],
        source_score['score']
    ]
    
    avg = sum(scores) / len(scores)
    variance = sum((s - avg) ** 2 for s in scores) / len(scores)
    
    if variance < 0.01:
        return "HIGH"
    elif variance < 0.05:
        return "MEDIUM"
    else:
        return "LOW"


if __name__ == '__main__':
    print("=" * 80, flush=True)
    print("[Proposal Evaluator] 🎬 STARTING AGENT RUNTIME", flush=True)
    print("[Proposal Evaluator] *** CODE VERSION: 2026-03-05-v1 — stdout logging ***", flush=True)
    print("=" * 80, flush=True)
    logger.info("🎬 Starting Proposal Evaluator Agent Runtime")
    
    try:
        print("[Proposal Evaluator] Calling app.run()...", flush=True)
        logger.info("[Proposal Evaluator] Calling app.run()...")
        app.run()
        print("[Proposal Evaluator] app.run() returned (should not happen)", flush=True)
        logger.info("[Proposal Evaluator] app.run() returned (should not happen)")
    except Exception as e:
        print(f"[Proposal Evaluator] ❌ FATAL ERROR in app.run(): {e}", flush=True)
        logger.error(f"[Proposal Evaluator] ❌ FATAL ERROR in app.run(): {e}")
        import traceback
        traceback.print_exc()
        raise
