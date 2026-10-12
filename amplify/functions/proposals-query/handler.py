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

def get_identity_user_id(event):
    """Cognito user ID from the VERIFIED identity on the request, or None.

    AppSync populates `identity` itself from the validated JWT, so this cannot be
    forged by the caller the way a GraphQL argument can. Mirrors
    extract_user_identity() in kb-document-manager and the identity handling in
    proposal-download, so all three resolvers agree on where identity comes from.

    Returns None for an unauthenticated request, which callers must treat as a
    rejection rather than falling back to an argument.
    """
    identity = event.get('identity') or {}

    # Direct Lambda resolver with Cognito user pool auth.
    user_id = identity.get('sub') or identity.get('username')
    if user_id:
        return user_id

    # Some resolver configurations nest the JWT claims instead.
    claims = identity.get('claims') or {}
    return claims.get('sub') or claims.get('cognito:username')


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
            # Derive the user from the VERIFIED Cognito identity, never from the
            # caller's arguments.
            #
            # This previously read `arguments.get('userId')`, so any caller could
            # list any other user's proposals by passing their ID. Sibling
            # handlers (proposal-download, kb-document-manager) already did it
            # this way; this one was the outlier.
            user_id = get_identity_user_id(event)
            if not user_id:
                print("❌ Rejected: no verified Cognito identity on the request")
                return {'error': 'Unauthorized'}

            # A userId argument is accepted for backwards compatibility with the
            # existing clients, but it is only honoured when it matches the
            # caller. Anything else is a request for someone else's data.
            requested_user_id = arguments.get('userId')
            if requested_user_id and requested_user_id != user_id:
                print(
                    "❌ Rejected: caller "
                    f"{user_id} requested proposals for {requested_user_id}"
                )
                return {'error': 'Unauthorized'}

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
