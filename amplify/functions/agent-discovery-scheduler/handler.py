#!/usr/bin/env python3
"""
Agent Discovery Scheduler Lambda
Triggered by EventBridge, starts Step Function executions for all active users
"""

import json
import os
import boto3
import logging
from datetime import datetime, timezone

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb', region_name=os.environ['AWS_REGION'])
sfn_client = boto3.client('stepfunctions', region_name=os.environ['AWS_REGION'])

def handler(event, context):
    """
    EventBridge trigger handler - starts Step Function for each active user
    """
    try:
        logger.info(f"Scheduler triggered: {json.dumps(event)}")
        
        # Check if this is a manual force run (from force_run_agent_discovery.py)
        is_force_run = event.get('source') == 'manual-force-run'
        logger.info(f"Force run mode: {is_force_run}")
        
        # Get Step Function ARN from environment
        state_machine_arn = os.environ['STATE_MACHINE_ARN']
        
        # Get AgentConfig table name from environment
        agent_config_table = os.environ['AGENT_CONFIG_TABLE']
        table = dynamodb.Table(agent_config_table)
        
        # Scan for active configs
        response = table.scan(
            FilterExpression='autoOn = :true AND isActive = :true',
            ExpressionAttributeValues={
                ':true': True
            }
        )
        
        configs = response.get('Items', [])
        logger.info(f"Found {len(configs)} active AgentConfig records")
        
        if not configs:
            return {
                'statusCode': 200,
                'message': 'No active agent configs found',
                'executionsStarted': 0
            }
        
        # Check each config to see if it's time to run
        executions_started = []
        now = datetime.now(timezone.utc)
        
        for config in configs:
            config_id = config.get('id')
            user_id = config.get('userId')
            time_interval = int(config.get('timeInterval', 24))  # Hours
            last_run = config.get('lastRun')
            
            # Determine if should run
            should_run = False
            reason = ""
            
            # If force run, skip timestamp checks
            if is_force_run:
                should_run = True
                reason = "manual force run"
            elif not last_run:
                should_run = True
                reason = "never run before"
            else:
                # Parse lastRun timestamp
                from dateutil import parser
                last_run_dt = parser.parse(last_run)
                hours_since_last_run = (now - last_run_dt).total_seconds() / 3600
                
                if hours_since_last_run >= time_interval:
                    should_run = True
                    reason = f"{hours_since_last_run:.1f} hours since last run (interval: {time_interval}h)"
                else:
                    logger.info(f"Skipping config {config_id}: only {hours_since_last_run:.1f}h since last run (interval: {time_interval}h)")
            
            if should_run:
                # Start Step Function execution for this user
                input_data = {
                    "source": "eventbridge-scheduler",
                    "triggerType": "autonomous-discovery",
                    "input": {
                        "forceRun": True,  # Force run to bypass checkConfig timestamp checks
                        "configId": config_id,
                        "userId": user_id
                    },
                    "timestamp": now.isoformat().replace('+00:00', 'Z')
                }
                
                execution_name = f"scheduled-{user_id[:8]}-{int(now.timestamp())}"
                
                logger.info(f"Starting execution for user {user_id}: {reason}")
                
                response = sfn_client.start_execution(
                    stateMachineArn=state_machine_arn,
                    name=execution_name,
                    input=json.dumps(input_data)
                )
                
                executions_started.append({
                    'userId': user_id,
                    'configId': config_id,
                    'executionArn': response['executionArn'],
                    'reason': reason
                })
        
        logger.info(f"Started {len(executions_started)} Step Function executions")
        
        return {
            'statusCode': 200,
            'message': f'Started {len(executions_started)} agent discovery executions',
            'executionsStarted': len(executions_started),
            'executions': executions_started
        }
        
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}", exc_info=True)
        raise
