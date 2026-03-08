"""
Lambda function for managing Bedrock prompts.
Provides CRUD operations for prompt management.
"""
import json
import boto3
import os
from datetime import datetime

# Use region from environment variable (set in backend.ts)
REGION = os.environ.get('REGION', 'us-east-2')
bedrock_agent = boto3.client('bedrock-agent', region_name=REGION)

def handler(event, context):
    """Handle prompt management operations from AppSync."""
    print(f"Event: {json.dumps(event)}")
    
    try:
        # Extract field name (query name) from AppSync event
        field_name = event.get('fieldName')
        arguments = event.get('arguments', {})
        
        print(f"Field: {field_name}, Arguments: {json.dumps(arguments)}")
        
        # Route to appropriate operation based on GraphQL field name
        if field_name == 'listPrompts':
            return list_prompts()
        elif field_name == 'getPrompt':
            prompt_id = arguments.get('promptId')
            return get_prompt(prompt_id)
        elif field_name == 'testPrompt':
            prompt_id = arguments.get('promptId')
            test_input = arguments.get('testInput', {})
            return test_prompt(prompt_id, test_input)
        
        # Fallback for direct Lambda invocation (for testing)
        operation = event.get('operation')
        
        if operation == 'listPrompts':
            return list_prompts()
        elif operation == 'getPrompt':
            prompt_id = event.get('promptId')
            return get_prompt(prompt_id)
        elif operation == 'testPrompt':
            prompt_id = event.get('promptId')
            test_input = event.get('testInput', {})
            return test_prompt(prompt_id, test_input)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Unknown operation: {operation}'})
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        raise

def list_prompts():
    """List all available prompts."""
    try:
        response = bedrock_agent.list_prompts(maxResults=50)
        
        prompts = []
        for prompt_summary in response.get('promptSummaries', []):
            prompts.append({
                'id': prompt_summary.get('id'),
                'arn': prompt_summary.get('arn'),
                'name': prompt_summary.get('name'),
                'description': prompt_summary.get('description', ''),
                'createdAt': prompt_summary.get('createdAt').isoformat() if prompt_summary.get('createdAt') else None,
                'updatedAt': prompt_summary.get('updatedAt').isoformat() if prompt_summary.get('updatedAt') else None,
                'version': prompt_summary.get('version', 'DRAFT')
            })
        
        return {
            'prompts': prompts,
            'count': len(prompts)
        }
        
    except Exception as e:
        print(f"Error listing prompts: {str(e)}")
        raise

def get_prompt(prompt_id):
    """Get detailed information about a specific prompt."""
    if not prompt_id:
        raise Exception('promptId is required')
    
    try:
        response = bedrock_agent.get_prompt(promptIdentifier=prompt_id)
        
        prompt_data = {
            'id': response.get('id'),
            'arn': response.get('arn'),
            'name': response.get('name'),
            'description': response.get('description', ''),
            'createdAt': response.get('createdAt').isoformat() if response.get('createdAt') else None,
            'updatedAt': response.get('updatedAt').isoformat() if response.get('updatedAt') else None,
            'version': response.get('version', 'DRAFT'),
            'variants': []
        }
        
        # Extract variants (different versions of the prompt)
        for variant in response.get('variants', []):
            variant_data = {
                'name': variant.get('name'),
                'templateType': variant.get('templateType'),
                'modelId': variant.get('modelId'),
                'inferenceConfiguration': variant.get('inferenceConfiguration', {})
            }
            
            # Extract the actual prompt text
            if variant.get('templateConfiguration'):
                text_config = variant['templateConfiguration'].get('text', {})
                variant_data['text'] = text_config.get('text', '')
                variant_data['inputVariables'] = text_config.get('inputVariables', [])
            
            prompt_data['variants'].append(variant_data)
        
        return {'prompt': prompt_data}
        
    except Exception as e:
        print(f"Error getting prompt: {str(e)}")
        raise

def test_prompt(prompt_id, test_input):
    """Test a prompt with sample input."""
    if not prompt_id:
        raise Exception('promptId is required')
    
    try:
        # Parse test_input if it's a JSON string
        if isinstance(test_input, str):
            test_input = json.loads(test_input)
        
        # Get the prompt details first
        prompt_response = bedrock_agent.get_prompt(promptIdentifier=prompt_id)
        
        # Extract model ID and prompt text from first variant
        variants = prompt_response.get('variants', [])
        if not variants:
            raise Exception('No variants found for this prompt')
        
        variant = variants[0]
        model_id = variant.get('modelId', 'anthropic.claude-3-sonnet-20240229-v1:0')
        
        # Get the prompt text
        template_config = variant.get('templateConfiguration', {})
        text_config = template_config.get('text', {})
        prompt_text = text_config.get('text', '')
        
        # Replace variables in prompt text with test input
        for key, value in test_input.items():
            prompt_text = prompt_text.replace(f'{{{{{key}}}}}', str(value))
        
        # Call Bedrock Runtime to test the prompt
        bedrock_runtime = boto3.client('bedrock-runtime', region_name=REGION)
        
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 500,
                'messages': [{
                    'role': 'user',
                    'content': prompt_text
                }]
            })
        )
        
        response_body = json.loads(response['body'].read())
        
        return {
            'result': response_body.get('content', [{}])[0].get('text', ''),
            'usage': response_body.get('usage', {}),
            'modelId': model_id
        }
        
    except Exception as e:
        print(f"Error testing prompt: {str(e)}")
        raise
