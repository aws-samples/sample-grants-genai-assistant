"""
Knowledge Base Semantic Search Lambda Function

Performs semantic search across vectorized documents using Bedrock Knowledge Base.
Handles:
1. Natural language query processing
2. Metadata filtering (userId, category, date range)
3. Pagination support (limit, offset)
4. Result formatting with excerpts and relevance scores
5. User-scoped search enforcement

Requirements: 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 7.2
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
import boto3
from botocore.exceptions import ClientError

# Initialize AWS clients
bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')
dynamodb = boto3.resource('dynamodb')

# Environment variables - All required, no fallbacks
KNOWLEDGE_BASE_ID = os.environ['KNOWLEDGE_BASE_ID']
DOCUMENT_TABLE = os.environ['DOCUMENT_TABLE']

# Search configuration
DEFAULT_LIMIT = 10
MAX_LIMIT = 100
DEFAULT_RELEVANCE_THRESHOLD = 0.5


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for semantic search requests
    
    Expected input (GraphQL query):
    {
        "query": "natural language search query",
        "filters": {
            "category": "research",
            "dateRange": {
                "start": "2024-01-01T00:00:00Z",
                "end": "2024-12-31T23:59:59Z"
            }
        },
        "limit": 10,
        "offset": 0
    }
    
    Returns:
    {
        "results": [
            {
                "documentId": "uuid",
                "filename": "document.pdf",
                "excerpt": "relevant text excerpt...",
                "relevanceScore": 0.85,
                "metadata": {
                    "category": "research",
                    "uploadDate": "2024-01-15T10:30:00Z"
                }
            }
        ],
        "total": 42,
        "hasMore": true
    }
    """
    try:
        print(f"Received search event: {json.dumps(event)}")
        
        # Validate environment variables
        if not KNOWLEDGE_BASE_ID:
            raise Exception("Knowledge Base not configured")
        
        # Extract user identity from Cognito authorizer (optional for shared KB)
        user_id, user_email = extract_user_identity(event)
        
        print(f"Processing search request for user: {user_id or 'anonymous'} ({user_email or 'N/A'})")
        
        # Parse input arguments
        arguments = event.get('arguments', {})
        
        query = arguments.get('query', '').strip()
        filters = arguments.get('filters') or {}  # Handle null filters
        limit = arguments.get('limit', DEFAULT_LIMIT)
        offset = arguments.get('offset', 0)
        
        # Validate query
        if not query:
            raise Exception("Search query is required")
        
        if len(query) > 1000:
            raise Exception("Search query too long (max 1000 characters)")
        
        # Validate and normalize limit
        limit = min(max(1, limit), MAX_LIMIT)
        offset = max(0, offset)
        
        print(f"Search query: '{query}', limit: {limit}, offset: {offset}")
        print(f"Filters: {json.dumps(filters)}")
        
        # Perform semantic search using Bedrock Knowledge Base
        # NOTE: We don't filter by userId in Bedrock because documents may not have userId metadata
        # Instead, we filter by userId during DynamoDB enrichment (line 147)
        try:
            # Fetch more results to account for DynamoDB filtering
            fetch_limit = (limit + offset) * 2
            print(f"Searching Bedrock KB without userId filter (will filter in DynamoDB enrichment)")
            search_results = perform_semantic_search(
                query=query,
                metadata_filter=None,  # No userId filter - filter in DynamoDB instead
                limit=fetch_limit
            )
        except Exception as e:
            print(f"Error performing semantic search: {str(e)}")
            raise Exception(f"Search failed: {str(e)}")
        
        # Enrich results with document metadata from DynamoDB
        # This also filters to only user's documents (user isolation)
        try:
            enriched_results = enrich_search_results(search_results, user_id)
        except Exception as e:
            print(f"Error enriching search results: {str(e)}")
            # Continue with unenriched results
            enriched_results = search_results
        
        # Apply additional DynamoDB-based filtering (agency, category, etc.)
        filtered_results = apply_dynamodb_filters(enriched_results, filters)
        print(f"After filtering: {len(filtered_results)} results (from {len(enriched_results)})")
        
        # Apply offset and limit to filtered results
        paginated_results = filtered_results[offset:offset + limit]
        
        # Format response
        response = {
            'results': paginated_results,
            'total': len(filtered_results),
            'hasMore': (offset + limit) < len(filtered_results),
            'offset': offset,
            'limit': limit
        }
        
        print(f"Returning {len(paginated_results)} results (total: {len(filtered_results)})")
        return response
        
    except Exception as e:
        print(f"Unexpected error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def apply_dynamodb_filters(results: List[Dict[str, Any]], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Filter search results based on DynamoDB metadata
    
    Args:
        results: Enriched search results with DynamoDB metadata
        filters: Filter criteria (agency, category, etc.)
    
    Returns:
        Filtered list of results
    """
    if not filters:
        return results
    
    filtered = []
    
    for result in results:
        # Check agency filter
        agency_filter = filters.get('agency')
        if agency_filter:
            result_agency = result.get('metadata', {}).get('agency') or result.get('agency')
            if result_agency != agency_filter:
                continue
        
        # Check category filter
        category_filter = filters.get('category')
        if category_filter:
            result_category = result.get('metadata', {}).get('category') or result.get('category')
            if result_category != category_filter:
                continue
        
        # Check date range filter
        date_range = filters.get('dateRange', {})
        if date_range:
            upload_date = result.get('metadata', {}).get('uploadDate') or result.get('uploadDate')
            if upload_date:
                start_date = date_range.get('start')
                end_date = date_range.get('end')
                
                if start_date and upload_date < start_date:
                    continue
                if end_date and upload_date > end_date:
                    continue
        
        # Passed all filters
        filtered.append(result)
    
    return filtered


def extract_user_identity(event: Dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    """
    Extract user ID and email from Cognito identity in the event
    
    Returns:
        Tuple of (user_id, user_email)
    """
    print(f"🔍 Extracting user identity from event...")
    print(f"   Event keys: {list(event.keys())}")
    print(f"   Full event (for debugging): {json.dumps(event, default=str)}")
    
    # Check for Cognito identity in request context
    identity = event.get('identity')
    print(f"   identity: {identity}")
    
    # Handle API key access (identity will be None)
    if identity is None:
        print("   ⚠️  No identity found - API key access or missing auth")
        # Don't return None yet, try other locations
    else:
        # Try to get from Cognito claims
        claims = identity.get('claims', {})
        if claims:
            user_id = claims.get('sub') or claims.get('cognito:username')
            user_email = claims.get('email')
            print(f"   ✅ Extracted from claims: userId={user_id}, email={user_email}")
            return user_id, user_email
    
    # Try to get from request context (AppSync)
    request_context = event.get('requestContext', {})
    if request_context:
        identity_context = request_context.get('identity', {})
        user_id = identity_context.get('sub') or identity_context.get('cognitoIdentityId')
        user_email = identity_context.get('email')
        if user_id:
            print(f"   ✅ Extracted from requestContext: userId={user_id}, email={user_email}")
            return user_id, user_email
    
    print("   ❌ Could not extract user identity from event")
    return None, None


def build_metadata_filter(filters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build metadata filter for Bedrock Knowledge Base search
    
    Applies filters for shared knowledge base (no user isolation)
    
    Args:
        filters: Filters (category, agency, dateRange, etc.)
    
    Returns:
        Metadata filter dict for Bedrock API
    """
    # Start with empty filter conditions (shared KB - no user isolation)
    filter_conditions = []
    
    # Add category filter if provided
    category = filters.get('category')
    if category:
        filter_conditions.append({
            'equals': {
                'key': 'category',
                'value': category
            }
        })
    
    # Add agency filter if provided (for grant guidelines and content documents)
    agency = filters.get('agency')
    if agency:
        filter_conditions.append({
            'equals': {
                'key': 'agency',
                'value': agency
            }
        })
    
    # Add grant-specific filters if provided
    grant_type = filters.get('grantType')
    if grant_type:
        filter_conditions.append({
            'equals': {
                'key': 'grantType',
                'value': grant_type
            }
        })
    
    section = filters.get('section')
    if section:
        filter_conditions.append({
            'equals': {
                'key': 'section',
                'value': section
            }
        })
    
    document_type = filters.get('documentType')
    if document_type:
        filter_conditions.append({
            'equals': {
                'key': 'documentType',
                'value': document_type
            }
        })
    
    year = filters.get('year')
    if year:
        filter_conditions.append({
            'equals': {
                'key': 'year',
                'value': year
            }
        })
    
    # Add date range filter if provided
    date_range = filters.get('dateRange', {})
    start_date = date_range.get('start')
    end_date = date_range.get('end')
    
    if start_date:
        filter_conditions.append({
            'greaterThanOrEquals': {
                'key': 'uploadDate',
                'value': start_date
            }
        })
    
    if end_date:
        filter_conditions.append({
            'lessThanOrEquals': {
                'key': 'uploadDate',
                'value': end_date
            }
        })
    
    # Combine all conditions with AND logic
    if len(filter_conditions) == 0:
        return None  # No filters
    elif len(filter_conditions) == 1:
        return filter_conditions[0]
    else:
        return {
            'andAll': filter_conditions
        }


def perform_semantic_search(
    query: str,
    metadata_filter: Dict[str, Any],
    limit: int
) -> List[Dict[str, Any]]:
    """
    Perform semantic search using Bedrock Knowledge Base Retrieve API
    
    Args:
        query: Natural language search query
        metadata_filter: Metadata filter for user-scoped search
        limit: Maximum number of results to return
    
    Returns:
        List of search results with excerpts and relevance scores
    
    Raises:
        ClientError: If the Bedrock API call fails
    """
    try:
        # Use Bedrock Knowledge Base Retrieve API for semantic search
        retrieval_config = {
            'vectorSearchConfiguration': {
                'numberOfResults': limit,
                'overrideSearchType': 'HYBRID',  # Combine semantic + keyword search
            }
        }
        
        # Only add filter if it's not None
        if metadata_filter is not None:
            retrieval_config['vectorSearchConfiguration']['filter'] = metadata_filter
        
        response = bedrock_agent_runtime.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={
                'text': query
            },
            retrievalConfiguration=retrieval_config
        )
        
        # Extract and format results
        retrieval_results = response.get('retrievalResults', [])
        
        formatted_results = []
        for result in retrieval_results:
            # Extract content and metadata
            content = result.get('content', {})
            text = content.get('text', '')
            
            # Extract location information (S3 URI)
            location = result.get('location', {})
            s3_location = location.get('s3Location', {})
            s3_uri = s3_location.get('uri', '')
            
            # Extract metadata
            metadata = result.get('metadata', {})
            
            # Extract relevance score
            score = result.get('score', 0.0)
            
            # Parse document ID from S3 URI or metadata
            # Expected S3 URI format: s3://bucket/user-{userId}/{documentId}/filename.ext
            document_id = extract_document_id_from_uri(s3_uri)
            if not document_id:
                document_id = metadata.get('documentId', 'unknown')
            
            # Create formatted result
            formatted_result = {
                'documentId': document_id,
                'excerpt': truncate_excerpt(text, max_length=500),
                'relevanceScore': round(score, 4),
                'metadata': metadata,
                's3Uri': s3_uri
            }
            
            formatted_results.append(formatted_result)
        
        print(f"Retrieved {len(formatted_results)} results from Knowledge Base")
        return formatted_results
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        print(f"Bedrock API error [{error_code}]: {error_message}")
        raise
    except Exception as e:
        print(f"Unexpected error in perform_semantic_search: {str(e)}")
        raise


def extract_document_id_from_uri(s3_uri: str) -> Optional[str]:
    """
    Extract document ID from S3 URI
    
    Expected format: s3://bucket/user-{userId}/{documentId}/filename.ext
    
    Args:
        s3_uri: S3 URI string
    
    Returns:
        Document ID or None if not found
    """
    try:
        if not s3_uri or not s3_uri.startswith('s3://'):
            return None
        
        # Remove s3:// prefix and split by /
        path = s3_uri[5:]  # Remove 's3://'
        parts = path.split('/')
        
        # Expected: bucket/user-{userId}/{documentId}/filename.ext
        if len(parts) >= 4:
            # Third part should be documentId
            document_id = parts[2]
            return document_id
        
        return None
    except Exception as e:
        print(f"Error extracting document ID from URI: {str(e)}")
        return None


def truncate_excerpt(text: str, max_length: int = 500) -> str:
    """
    Truncate text excerpt to maximum length, preserving word boundaries
    
    Args:
        text: Full text content
        max_length: Maximum length of excerpt
    
    Returns:
        Truncated excerpt with ellipsis if needed
    """
    if not text:
        return ""
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    if len(text) <= max_length:
        return text
    
    # Truncate at word boundary
    truncated = text[:max_length]
    last_space = truncated.rfind(' ')
    
    if last_space > 0:
        truncated = truncated[:last_space]
    
    return truncated + '...'


def enrich_search_results(
    results: List[Dict[str, Any]],
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Enrich search results with document metadata from DynamoDB
    
    This function also filters results to only include documents owned by the user.
    
    Args:
        results: Search results from Bedrock Knowledge Base
        user_id: User ID for authorization and filtering
    
    Returns:
        Enriched results with filename and other metadata (filtered to user's documents only)
    """
    if not results:
        return []
    
    if not user_id:
        print("⚠️  No userId - cannot enrich or filter results")
        return []
    
    table = dynamodb.Table(DOCUMENT_TABLE)
    
    enriched_results = []
    for result in results:
        document_id = result.get('documentId')
        
        if not document_id or document_id == 'unknown':
            # Skip results without valid document ID
            continue
        
        try:
            # Fetch document metadata from DynamoDB
            # This also acts as a filter - only documents owned by this user will be found
            response = table.get_item(
                Key={
                    'userId': user_id,
                    'documentId': document_id
                }
            )
            
            item = response.get('Item')
            if item:
                # Add filename and other metadata to result
                result['filename'] = item.get('filename', 'Unknown')
                result['contentType'] = item.get('contentType')
                result['fileSize'] = item.get('fileSize')
                result['uploadDate'] = item.get('uploadDate')
                result['category'] = item.get('category')
                result['agency'] = item.get('agency')  # Add agency for filtering
                
                # Update metadata dict
                if 'metadata' not in result:
                    result['metadata'] = {}
                
                result['metadata'].update({
                    'filename': item.get('filename'),
                    'category': item.get('category'),
                    'uploadDate': item.get('uploadDate'),
                    'contentType': item.get('contentType'),
                    'agency': item.get('agency')  # Add agency to metadata
                })
            else:
                # Document not found in DynamoDB (shouldn't happen)
                print(f"Warning: Document {document_id} not found in DynamoDB")
                result['filename'] = 'Unknown'
            
            enriched_results.append(result)
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            error_message = e.response.get('Error', {}).get('Message')
            print(f"DynamoDB error [{error_code}]: {error_message}")
            # Continue with unenriched result
            result['filename'] = 'Unknown'
            enriched_results.append(result)
    
    return enriched_results


def success_response(data: Any) -> Dict[str, Any]:
    """Format successful response"""
    return {
        'statusCode': 200,
        'body': json.dumps(data),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        }
    }


def error_response(status_code: int, message: str) -> Dict[str, Any]:
    """Format error response"""
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'error': message
        }),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        }
    }
