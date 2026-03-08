"""
Lambda handler for querying proposals
Updated: 2026-02-01 - Removed presigned URL generation (now using Lambda proxy for downloads)
"""
import json
import os
import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

def decimal_to_float(obj):
    """
    Recursively convert all Decimal values to float in nested structures
    """
    if isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: decimal_to_float(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    else:
        return obj

def handler(event, context):
    """
    Handle proposal queries
    """
    print(f"📥 Event: {json.dumps(event)}")
    
    # Get table name from environment
    table_name = os.environ.get('PROPOSAL_TABLE_NAME')
    if not table_name:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'PROPOSAL_TABLE_NAME not configured'})
        }
    
    table = dynamodb.Table(table_name)
    
    # Get the field name and arguments
    # AppSync Direct Lambda resolvers have fieldName at top level
    field_name = event.get('fieldName') or event.get('info', {}).get('fieldName')
    arguments = event.get('arguments', {})
    
    print(f"🔍 Field: {field_name}, Arguments: {arguments}")
    
    try:
        if field_name == 'listProposalsByUser':
            user_id = arguments.get('userId')
            if not user_id:
                return json.dumps({'error': 'userId is required'})
            
            # Query using GSI
            response = table.query(
                IndexName='proposalsByUserId',
                KeyConditionExpression=Key('userId').eq(user_id),
                ScanIndexForward=False  # Sort by most recent first
            )
            
            items = response.get('Items', [])
            print(f"✅ Found {len(items)} proposals for user {user_id}")
            
            # Convert ALL Decimal values to float (DynamoDB returns Decimals, but JSON doesn't support them)
            items = decimal_to_float(items)
            print(f"✅ Converted all Decimal values to float")
            
            # Note: Presigned URLs removed - downloads now use Lambda proxy (downloadProposal query)
            # This eliminates credential expiration issues and works with Block Public Access
            
            return {
                'items': items
            }
        
        else:
            return json.dumps({'error': f'Unknown field: {field_name}'})
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return json.dumps({'error': str(e)})
