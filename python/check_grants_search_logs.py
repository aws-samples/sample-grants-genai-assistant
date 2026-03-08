#!/usr/bin/env python3
"""
Check recent logs for grants-search-v2 Lambda function.
"""
import boto3
import json
from datetime import datetime, timedelta

# Initialize clients
logs_client = boto3.client('logs', region_name='us-east-2')
lambda_client = boto3.client('lambda', region_name='us-east-2')

def get_function_name():
    """Get the grants-search-v2 function name."""
    try:
        # List functions and find grants-search-v2
        response = lambda_client.list_functions()
        for func in response['Functions']:
            if 'GrantsSearchV2' in func['FunctionName']:
                return func['FunctionName']
        return None
    except Exception as e:
        print(f"Error listing functions: {e}")
        return None

def check_recent_logs(function_name, minutes=5):
    """Check recent logs for the function."""
    log_group = f'/aws/lambda/{function_name}'
    
    try:
        # Get logs from last N minutes
        start_time = int((datetime.now() - timedelta(minutes=minutes)).timestamp() * 1000)
        
        print(f"\n{'='*80}")
        print(f"Checking logs for: {function_name}")
        print(f"Log Group: {log_group}")
        print(f"Time Range: Last {minutes} minutes")
        print(f"{'='*80}\n")
        
        # Get log events
        response = logs_client.filter_log_events(
            logGroupName=log_group,
            startTime=start_time,
            limit=100
        )
        
        if not response.get('events'):
            print("❌ No log events found in the specified time range")
            return
        
        print(f"✅ Found {len(response['events'])} log events\n")
        
        # Print events
        for event in response['events']:
            timestamp = datetime.fromtimestamp(event['timestamp'] / 1000)
            message = event['message'].strip()
            
            # Highlight errors
            if 'ERROR' in message or 'Error' in message or 'error' in message:
                print(f"🔴 [{timestamp}] {message}")
            elif 'AccessDenied' in message or 'Unauthorized' in message:
                print(f"🚫 [{timestamp}] {message}")
            elif 'START' in message or 'END' in message or 'REPORT' in message:
                print(f"ℹ️  [{timestamp}] {message}")
            else:
                print(f"   [{timestamp}] {message}")
            print()
        
    except logs_client.exceptions.ResourceNotFoundException:
        print(f"❌ Log group not found: {log_group}")
    except Exception as e:
        print(f"❌ Error checking logs: {e}")

def main():
    print("\n🔍 Grants Search V2 Lambda Diagnostics\n")
    
    # Get function name
    function_name = get_function_name()
    if not function_name:
        print("❌ Could not find GrantsSearchV2 function")
        return
    
    print(f"✅ Found function: {function_name}\n")
    
    # Check recent logs
    check_recent_logs(function_name, minutes=10)

if __name__ == '__main__':
    main()
