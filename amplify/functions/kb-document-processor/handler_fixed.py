"""
Fixed version - invokes kbDocumentManager Lambda directly instead of trying HTTP calls
"""

def publish_status_update(document: Dict[str, Any]) -> None:
    """
    Publish document status update by invoking the kbDocumentManager Lambda
    which will trigger the GraphQL mutation and subscription
    
    Args:
        document: Document metadata from DynamoDB
    """
    if not APPSYNC_ENDPOINT:
        print("⚠️  AppSync endpoint not configured, skipping real-time notification")
        return
    
    try:
        # Get the kbDocumentManager Lambda function name from environment
        # This should be set in backend.ts
        kb_manager_function = os.environ.get('KB_MANAGER_FUNCTION_NAME')
        
        if not kb_manager_function:
            print("⚠️  KB_MANAGER_FUNCTION_NAME not set, skipping notification")
            return
        
        lambda_client = boto3.client('lambda')
        
        # Build the GraphQL event that kbDocumentManager expects
        event = {
            "typeName": "Mutation",
            "fieldName": "updateDocumentStatus",
            "arguments": {
                "input": {
                    "documentId": document.get('documentId'),
                    "userId": document.get('userId'),
                    "filename": document.get('filename'),
                    "status": document.get('status'),
                    "updatedAt": document.get('updatedAt'),
                    "vectorIndexed": document.get('vectorIndexed', False)
                }
            },
            "identity": {
                "sourceIp": ["127.0.0.1"],
                "userArn": "arn:aws:sts::123456789012:assumed-role/LambdaRole/lambda",
                "accountId": "123456789012",
                "caller": "AIDAI",
                "cognitoIdentityPoolId": None,
                "cognitoIdentityId": None,
                "userAgent": "AWS Lambda",
                "user": "lambda"
            }
        }
        
        # Add error message if present
        if document.get('errorMessage'):
            event["arguments"]["input"]["errorMessage"] = document['errorMessage']
        
        # Invoke the kbDocumentManager Lambda asynchronously
        response = lambda_client.invoke(
            FunctionName=kb_manager_function,
            InvocationType='Event',  # Async invocation
            Payload=json.dumps(event)
        )
        
        print(f"✅ Triggered notification via kbDocumentManager Lambda for document {document.get('documentId')}: {document.get('status')}")
            
    except Exception as e:
        # Log error but don't fail the processing
        print(f"❌ Error triggering notification: {str(e)}")
        import traceback
        traceback.print_exc()
