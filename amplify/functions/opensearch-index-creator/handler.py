"""
CloudFormation Custom Resource Lambda
Creates OpenSearch index for Bedrock Knowledge Base
"""
import json
import os
import boto3
import requests
from requests_aws4auth import AWS4Auth
import cfnresponse

def handler(event, context):
    """Handle CloudFormation custom resource requests"""
    
    print(f"Event: {json.dumps(event)}")
    
    request_type = event['RequestType']
    properties = event['ResourceProperties']
    
    # Generate stable physical resource ID
    index_name = properties.get('IndexName', 'bedrock-knowledge-base-default-index')
    collection_endpoint = properties.get('CollectionEndpoint', 'unknown')
    physical_id = f"{collection_endpoint}/{index_name}"
    
    try:
        if request_type == 'Create':
            create_index(properties)
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {
                'Message': 'Index created successfully',
                'IndexName': index_name
            }, physicalResourceId=physical_id)
        
        elif request_type == 'Update':
            # Index already exists, nothing to do
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {
                'Message': 'Index already exists',
                'IndexName': index_name
            }, physicalResourceId=physical_id)
        
        elif request_type == 'Delete':
            # Don't delete the index on stack deletion
            # Knowledge Base data should persist
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {
                'Message': 'Index preserved (not deleted)',
                'IndexName': index_name
            }, physicalResourceId=physical_id)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        cfnresponse.send(event, context, cfnresponse.FAILED, {
            'Message': str(e)
        })

def create_index(properties):
    """Create the OpenSearch index"""
    
    collection_endpoint = properties['CollectionEndpoint']
    index_name = properties['IndexName']
    # Use region from properties, environment, or Lambda's AWS_REGION
    region = properties.get('Region') or os.environ.get('AWS_REGION', 'us-east-2')
    
    print(f"Creating index '{index_name}' at endpoint '{collection_endpoint}'")
    
    # Get AWS credentials
    session = boto3.Session()
    credentials = session.get_credentials()
    
    # Create AWS4Auth
    awsauth = AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        region,
        'aoss',
        session_token=credentials.token
    )
    
    # Index configuration for Bedrock Knowledge Base
    index_body = {
        "settings": {
            "index": {
                "knn": True,
                "knn.algo_param.ef_search": 512
            }
        },
        "mappings": {
            "properties": {
                "bedrock-knowledge-base-default-vector": {
                    "type": "knn_vector",
                    "dimension": 1024,
                    "method": {
                        "name": "hnsw",
                        "engine": "faiss",
                        "parameters": {
                            "ef_construction": 512,
                            "m": 16
                        },
                        "space_type": "l2"
                    }
                },
                "AMAZON_BEDROCK_TEXT_CHUNK": {
                    "type": "text"
                },
                "AMAZON_BEDROCK_METADATA": {
                    "type": "text",
                    "index": False
                }
            }
        }
    }
    
    # Create index
    url = f"{collection_endpoint}/{index_name}"
    
    print(f"Sending PUT request to: {url}")
    response = requests.put(
        url,
        auth=awsauth,
        json=index_body,
        headers={'Content-Type': 'application/json'},
        timeout=30
    )
    
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    if response.status_code in [200, 201]:
        print("✅ Index created successfully")
    elif response.status_code == 400 and 'resource_already_exists' in response.text:
        print("✅ Index already exists")
    else:
        raise Exception(f"Failed to create index: {response.status_code} - {response.text}")
    
    # CRITICAL: Verify index is actually queryable before returning
    # This prevents race condition where KB tries to use index before it's ready
    print("🔍 Verifying index is queryable...")
    import time
    
    # EU regions may need more time for OpenSearch propagation
    max_retries = 40  # 2 minutes total (40 * 3 seconds)
    initial_wait = 10  # Wait 10 seconds before first check (for EU regions)
    
    print(f"⏳ Initial wait of {initial_wait} seconds for OpenSearch propagation...")
    # nosemgrep: arbitrary-sleep - Intentional: OpenSearch index needs time to propagate, especially in EU regions
    time.sleep(initial_wait)
    
    for attempt in range(max_retries):
        try:
            # First verify index exists
            verify_response = requests.get(
                url,
                auth=awsauth,
                headers={'Content-Type': 'application/json'},
                timeout=15  # Increased timeout for EU regions
            )
            
            if verify_response.status_code == 200:
                print(f"✅ Index exists (attempt {attempt + 1})")
                
                # Now verify index is actually ready for queries by checking mappings
                mappings_url = f"{url}/_mapping"
                mappings_response = requests.get(
                    mappings_url,
                    auth=awsauth,
                    headers={'Content-Type': 'application/json'},
                    timeout=15
                )
                
                if mappings_response.status_code == 200:
                    mappings_data = mappings_response.json()
                    # Verify the vector field exists in mappings
                    if index_name in mappings_data:
                        properties = mappings_data[index_name].get('mappings', {}).get('properties', {})
                        if 'bedrock-knowledge-base-default-vector' in properties:
                            print(f"✅ Index fully ready with vector mappings (attempt {attempt + 1})")
                            # Extra wait to ensure OpenSearch has fully committed the index
                            print("⏳ Final 15-second wait to ensure full propagation...")
                            # nosemgrep: arbitrary-sleep - Intentional: Final wait to ensure OpenSearch index is fully committed
                            time.sleep(15)
                            print("✅ Index verification complete!")
                            return True
                        else:
                            print(f"⏳ Index exists but vector field not in mappings yet (attempt {attempt + 1}/{max_retries})")
                    else:
                        print(f"⏳ Index exists but mappings not ready (attempt {attempt + 1}/{max_retries})")
                else:
                    print(f"⏳ Index exists but mappings not queryable: {mappings_response.status_code} (attempt {attempt + 1}/{max_retries})")
            else:
                print(f"⏳ Index not ready yet: {verify_response.status_code} (attempt {attempt + 1}/{max_retries})")
        except requests.exceptions.Timeout:
            print(f"⏳ Request timeout on attempt {attempt + 1}/{max_retries} - retrying...")
        except Exception as e:
            print(f"⏳ Verification attempt {attempt + 1} failed: {e}")
        
        if attempt < max_retries - 1:
            # nosemgrep: arbitrary-sleep - Intentional: Retry interval for OpenSearch index verification polling
            time.sleep(3)  # Wait 3 seconds between retries
    
    raise Exception(f"Index created but not fully ready after {max_retries * 3 + initial_wait} seconds")
