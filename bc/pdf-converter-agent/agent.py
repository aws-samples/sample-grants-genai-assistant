"""
PDF Converter Agent - AgentCore A2A
Converts HTML proposals to PDF format and uploads to S3
Uses bedrock-agentcore SDK for proper A2A communication
"""
import sys
import os

# STEP 1: Log Python environment
print("=" * 80, flush=True)
print("[PDF Converter] STEP 1: Python Environment", flush=True)
print("=" * 80, flush=True)
print(f"[PDF Converter] Python version: {sys.version}", flush=True)
print(f"[PDF Converter] Python executable: {sys.executable}", flush=True)
print(f"[PDF Converter] Working directory: {os.getcwd()}", flush=True)
print(f"[PDF Converter] AWS_REGION env: {os.environ.get('AWS_REGION', 'NOT SET')}", flush=True)
print("", flush=True)

# STEP 2: Import standard library
print("[PDF Converter] STEP 2: Importing standard library modules...", flush=True)
import json
import logging
from datetime import datetime
print("[PDF Converter] ✅ Standard library imports successful", flush=True)
print("", flush=True)

# STEP 3: Import boto3
print("[PDF Converter] STEP 3: Importing boto3...", flush=True)
try:
    import boto3
    print(f"[PDF Converter] ✅ boto3 imported successfully (version: {boto3.__version__})", flush=True)
except Exception as e:
    print(f"[PDF Converter] ❌ Failed to import boto3: {e}", flush=True)
    raise
print("", flush=True)

# STEP 4: Import weasyprint
print("[PDF Converter] STEP 4: Importing weasyprint...", flush=True)
try:
    import weasyprint
    print(f"[PDF Converter] ✅ weasyprint imported successfully (version: {weasyprint.__version__})", flush=True)
except Exception as e:
    print(f"[PDF Converter] ❌ Failed to import weasyprint: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise
print("", flush=True)

# STEP 5: Import AgentCore SDK
print("[PDF Converter] STEP 5: Importing bedrock-agentcore SDK...", flush=True)
try:
    from bedrock_agentcore.runtime import BedrockAgentCoreApp
    print("[PDF Converter] ✅ bedrock-agentcore SDK imported successfully", flush=True)
except Exception as e:
    print(f"[PDF Converter] ❌ Failed to import bedrock-agentcore: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise
print("", flush=True)

# STEP 6: Configure logging
print("[PDF Converter] STEP 6: Configuring logging...", flush=True)
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
logger.info("[PDF Converter] ✅ Logging configured")
print("", flush=True)

# STEP 7: Initialize AgentCore app
print("[PDF Converter] STEP 7: Initializing AgentCore app...", flush=True)
try:
    app = BedrockAgentCoreApp()
    logger.info("[PDF Converter] ✅ AgentCore app initialized")
    print("[PDF Converter] ✅ AgentCore app initialized", flush=True)
except Exception as e:
    print(f"[PDF Converter] ❌ Failed to initialize AgentCore app: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise
print("", flush=True)

# STEP 8: Initialize AWS clients
print("[PDF Converter] STEP 8: Initializing AWS clients...", flush=True)
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-2')
logger.info(f"[PDF Converter] Using AWS region: {AWS_REGION}")
print(f"[PDF Converter] Using AWS region: {AWS_REGION}", flush=True)

try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    logger.info("[PDF Converter] ✅ S3 client initialized")
    print("[PDF Converter] ✅ S3 client initialized", flush=True)
except Exception as e:
    print(f"[PDF Converter] ❌ Failed to initialize S3 client: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise
print("", flush=True)

print("=" * 80, flush=True)
print("[PDF Converter] ✅ ALL INITIALIZATION STEPS COMPLETED", flush=True)
print("=" * 80, flush=True)
print("", flush=True)

@app.entrypoint
def invoke(payload: dict) -> dict:
    """
    Main entrypoint - receives payload from invoke_agent_runtime
    
    Args:
        payload: Dict with html, proposalId, userId, bucket
    
    Returns:
        Dict with pdfUrl, s3Key, s3Bucket, convertedAt, pdfSize
    """
    print("=" * 80, flush=True)
    print("[PDF Converter] 🚀 ENTRYPOINT INVOKED", flush=True)
    print("=" * 80, flush=True)
    
    try:
        logger.info("=" * 80)
        logger.info("[PDF Converter] 🚀 AGENT INVOKED")
        logger.info("=" * 80)
        print(f"[PDF Converter] 📄 Received conversion request", flush=True)
        logger.info(f"[PDF Converter] 📄 Received conversion request")
        logger.info(f"[PDF Converter] Payload type: {type(payload)}")
        logger.info(f"[PDF Converter] Payload keys: {list(payload.keys()) if isinstance(payload, dict) else 'NOT A DICT'}")
        logger.debug(f"[PDF Converter] Full payload: {payload}")
        
        # Extract parameters
        html_content = payload.get('html')
        proposal_id = payload.get('proposalId')
        user_id = payload.get('userId')
        bucket = payload.get('bucket', 'amplify-grow2-hesct-sandbo-proposalsbucket4b0168c3-yyrxsdlfyybc')
        
        if not html_content:
            raise ValueError("Missing required parameter: html")
        if not proposal_id:
            raise ValueError("Missing required parameter: proposalId")
        if not user_id:
            raise ValueError("Missing required parameter: userId")
        
        logger.info(f"[PDF Converter] Converting proposal {proposal_id} for user {user_id}")
        logger.info(f"[PDF Converter] HTML content length: {len(html_content)} chars")
        logger.info(f"[PDF Converter] Target bucket: {bucket}")
        
        # Convert HTML to PDF using WeasyPrint
        logger.info(f"[PDF Converter] 🔧 Generating PDF with WeasyPrint...")
        pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
        
        logger.info(f"[PDF Converter] ✅ PDF generated, size: {len(pdf_bytes):,} bytes")
        
        # Upload to S3
        s3_key = f"{user_id}/{proposal_id}/proposal.pdf"
        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType='application/pdf',
            Metadata={
                'proposalId': proposal_id,
                'userId': user_id,
                'convertedAt': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"[PDF Converter] ✅ PDF uploaded to S3: s3://{bucket}/{s3_key}")
        
        # Generate presigned URL (valid for 7 days)
        pdf_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': s3_key},
            ExpiresIn=604800  # 7 days
        )
        
        # Return simple dict (AgentCore handles serialization)
        result = {
            "pdfUrl": pdf_url,
            "s3Key": s3_key,
            "s3Bucket": bucket,
            "convertedAt": datetime.utcnow().isoformat(),
            "pdfSize": len(pdf_bytes)
        }
        
        logger.info(f"[PDF Converter] ✅ PDF conversion successful for {proposal_id}")
        logger.info(f"[PDF Converter]    S3 Key: {s3_key}")
        logger.info(f"[PDF Converter]    Size: {len(pdf_bytes):,} bytes")
        
        return result
        
    except ValueError as e:
        logger.error(f"[PDF Converter] ❌ Invalid parameters: {e}")
        raise
        
    except Exception as e:
        logger.error(f"[PDF Converter] ❌ Error converting PDF: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == '__main__':
    print("=" * 80, flush=True)
    print("[PDF Converter] 🎬 STARTING AGENT RUNTIME", flush=True)
    print("[PDF Converter] *** CODE VERSION: 2026-03-05-v1 — stdout logging ***", flush=True)
    print("=" * 80, flush=True)
    logger.info("🎬 Starting PDF Converter Agent Runtime")
    
    try:
        print("[PDF Converter] Calling app.run()...", flush=True)
        logger.info("[PDF Converter] Calling app.run()...")
        app.run()
        print("[PDF Converter] app.run() returned (should not happen)", flush=True)
        logger.info("[PDF Converter] app.run() returned (should not happen)")
    except Exception as e:
        print(f"[PDF Converter] ❌ FATAL ERROR in app.run(): {e}", flush=True)
        logger.error(f"[PDF Converter] ❌ FATAL ERROR in app.run(): {e}")
        import traceback
        traceback.print_exc()
        raise
