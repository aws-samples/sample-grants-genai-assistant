"""
Lambda handler for downloading proposals via proxy
Eliminates presigned URL issues by streaming S3 content directly
"""
import json
import os
import boto3
import base64
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

def handler(event, context):
    """
    Download proposal file by streaming from S3
    Verifies user ownership before allowing download
    """
    print(f"📥 Event: {json.dumps(event)}")
    
    # Get parameters
    field_name = event.get('fieldName') or event.get('info', {}).get('fieldName')
    arguments = event.get('arguments', {})
    
    proposal_id = arguments.get('proposalId')
    file_format = arguments.get('format', 'html')  # 'html' or 'pdf'
    
    # Get authenticated user from Cognito
    identity = event.get('identity', {})
    user_id = identity.get('sub') or identity.get('username')
    
    if not user_id:
        return {
            'statusCode': 401,
            'body': json.dumps({'error': 'Unauthorized - no user identity'})
        }
    
    if not proposal_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'proposalId is required'})
        }
    
    try:
        # Get proposal from DynamoDB to verify ownership
        table_name = os.environ.get('PROPOSAL_TABLE_NAME')
        if not table_name:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'PROPOSAL_TABLE_NAME not configured'})
            }
        
        table = dynamodb.Table(table_name)
        response = table.get_item(Key={'id': proposal_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Proposal not found'})
            }
        
        proposal = response['Item']
        
        # Verify ownership
        if proposal.get('userId') != user_id:
            print(f"❌ Access denied: proposal.userId={proposal.get('userId')}, user_id={user_id}")
            return {
                'statusCode': 403,
                'body': json.dumps({'error': 'Access denied - you do not own this proposal'})
            }
        
        # Get S3 key based on format
        bucket_name = os.environ.get('PROPOSALS_BUCKET_NAME')
        if not bucket_name:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'PROPOSALS_BUCKET_NAME not configured'})
            }
        
        # Determine S3 key based on format
        if file_format == 'pdf':
            # Check for PDF S3 key in metadata
            metadata = proposal.get('metadata', {})
            if not isinstance(metadata, dict):
                metadata = {}
            
            s3_key = metadata.get('pdfS3Key') or proposal.get('pdfS3Key')
            
            if not s3_key:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'PDF not available for this proposal'})
                }
            
            content_type = 'application/pdf'
            filename = f"proposal-{proposal_id}.pdf"
        else:
            # HTML format
            metadata = proposal.get('metadata', {})
            if not isinstance(metadata, dict):
                metadata = {}
            
            s3_key = metadata.get('s3Key') or proposal.get('s3Key')
            
            if not s3_key:
                # Construct S3 key from userId and proposalId
                s3_key = f"{proposal.get('userId')}/{proposal_id}/proposal.html"
            
            content_type = 'text/html'
            filename = f"proposal-{proposal_id}.html"
        
        print(f"📦 Fetching from S3: bucket={bucket_name}, key={s3_key}")
        
        # Get object from S3
        try:
            s3_response = s3.get_object(Bucket=bucket_name, Key=s3_key)
            content = s3_response['Body'].read()
            
            print(f"✅ Retrieved {len(content)} bytes from S3")
            
            # Return base64-encoded content for binary safety
            # AppSync will decode this automatically
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': content_type,
                    'Content-Disposition': f'attachment; filename="{filename}"'
                },
                'body': base64.b64encode(content).decode('utf-8'),
                'isBase64Encoded': True
            }
            
        except ClientError as s3_error:
            error_code = s3_error.response['Error']['Code']
            if error_code == 'NoSuchKey':
                print(f"❌ S3 key not found: {s3_key}")
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': f'File not found in S3: {s3_key}'})
                }
            else:
                print(f"❌ S3 error: {s3_error}")
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': f'S3 error: {str(s3_error)}'})
                }
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
