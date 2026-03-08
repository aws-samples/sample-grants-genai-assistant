"""
Unit and integration tests for Knowledge Base Semantic Search Lambda Function
"""

import json
import os
import sys
from unittest.mock import Mock, patch, MagicMock
import pytest

# Add handler to path
sys.path.insert(0, os.path.dirname(__file__))
import handler


class TestExtractUserIdentity:
    """Test user identity extraction"""
    
    def test_extract_from_claims(self):
        """Test extracting user ID from Cognito claims"""
        event = {
            'identity': {
                'claims': {
                    'sub': 'user-123',
                    'email': 'test@example.com'
                }
            }
        }
        
        user_id, email = handler.extract_user_identity(event)
        assert user_id == 'user-123'
        assert email == 'test@example.com'
    
    def test_extract_from_request_context(self):
        """Test extracting user ID from request context"""
        event = {
            'requestContext': {
                'identity': {
                    'sub': 'user-456',
                    'email': 'user@example.com'
                }
            }
        }
        
        user_id, email = handler.extract_user_identity(event)
        assert user_id == 'user-456'
        assert email == 'user@example.com'
    
    def test_no_identity(self):
        """Test handling missing identity"""
        event = {}
        
        user_id, email = handler.extract_user_identity(event)
        assert user_id is None
        assert email is None


class TestBuildMetadataFilter:
    """Test metadata filter construction"""
    
    def test_user_id_only(self):
        """Test filter with only user ID"""
        filter_dict = handler.build_metadata_filter('user-123', {})
        
        assert filter_dict == {
            'equals': {
                'key': 'userId',
                'value': 'user-123'
            }
        }
    
    def test_with_category(self):
        """Test filter with category"""
        filters = {'category': 'research'}
        filter_dict = handler.build_metadata_filter('user-123', filters)
        
        assert 'andAll' in filter_dict
        conditions = filter_dict['andAll']
        assert len(conditions) == 2
        
        # Check user ID condition
        assert any(
            c.get('equals', {}).get('key') == 'userId'
            for c in conditions
        )
        
        # Check category condition
        assert any(
            c.get('equals', {}).get('key') == 'category'
            for c in conditions
        )
    
    def test_with_date_range(self):
        """Test filter with date range"""
        filters = {
            'dateRange': {
                'start': '2024-01-01T00:00:00Z',
                'end': '2024-12-31T23:59:59Z'
            }
        }
        filter_dict = handler.build_metadata_filter('user-123', filters)
        
        assert 'andAll' in filter_dict
        conditions = filter_dict['andAll']
        assert len(conditions) == 3
        
        # Check for date conditions
        assert any(
            c.get('greaterThanOrEquals', {}).get('key') == 'uploadDate'
            for c in conditions
        )
        assert any(
            c.get('lessThanOrEquals', {}).get('key') == 'uploadDate'
            for c in conditions
        )
    
    def test_with_all_filters(self):
        """Test filter with all options"""
        filters = {
            'category': 'research',
            'dateRange': {
                'start': '2024-01-01T00:00:00Z',
                'end': '2024-12-31T23:59:59Z'
            }
        }
        filter_dict = handler.build_metadata_filter('user-123', filters)
        
        assert 'andAll' in filter_dict
        conditions = filter_dict['andAll']
        assert len(conditions) == 4  # userId + category + 2 date conditions


class TestExtractDocumentIdFromUri:
    """Test document ID extraction from S3 URI"""
    
    def test_valid_uri(self):
        """Test extracting from valid S3 URI"""
        uri = 's3://bucket/user-123/doc-456/file.pdf'
        doc_id = handler.extract_document_id_from_uri(uri)
        assert doc_id == 'doc-456'
    
    def test_invalid_uri(self):
        """Test handling invalid URI"""
        assert handler.extract_document_id_from_uri('') is None
        assert handler.extract_document_id_from_uri('not-s3-uri') is None
        assert handler.extract_document_id_from_uri('s3://bucket/file.pdf') is None


class TestTruncateExcerpt:
    """Test excerpt truncation"""
    
    def test_short_text(self):
        """Test text shorter than max length"""
        text = "This is a short text."
        result = handler.truncate_excerpt(text, max_length=100)
        assert result == text
    
    def test_long_text(self):
        """Test text longer than max length"""
        text = "This is a very long text " * 50
        result = handler.truncate_excerpt(text, max_length=100)
        
        assert len(result) <= 104  # 100 + "..."
        assert result.endswith('...')
        assert not result[:-3].endswith(' ')  # No trailing space before ...
    
    def test_empty_text(self):
        """Test empty text"""
        result = handler.truncate_excerpt('', max_length=100)
        assert result == ''
    
    def test_whitespace_normalization(self):
        """Test whitespace is normalized"""
        text = "This  has   multiple    spaces"
        result = handler.truncate_excerpt(text, max_length=100)
        assert '  ' not in result


class TestLambdaHandler:
    """Test main Lambda handler"""
    
    @patch('handler.bedrock_agent_runtime')
    @patch('handler.dynamodb')
    def test_successful_search(self, mock_dynamodb, mock_bedrock):
        """Test successful search request"""
        # Mock Bedrock response
        mock_bedrock.retrieve.return_value = {
            'retrievalResults': [
                {
                    'content': {'text': 'This is a test document about AI.'},
                    'location': {
                        's3Location': {
                            'uri': 's3://bucket/user-123/doc-1/test.pdf'
                        }
                    },
                    'metadata': {'category': 'research'},
                    'score': 0.85
                }
            ]
        }
        
        # Mock DynamoDB response
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': {
                'documentId': 'doc-1',
                'filename': 'test.pdf',
                'contentType': 'application/pdf',
                'fileSize': 1024,
                'uploadDate': '2024-01-15T10:30:00Z',
                'category': 'research'
            }
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Create test event
        event = {
            'identity': {
                'claims': {
                    'sub': 'user-123',
                    'email': 'test@example.com'
                }
            },
            'arguments': {
                'query': 'artificial intelligence',
                'limit': 10,
                'offset': 0
            }
        }
        
        # Set environment variables
        os.environ['KNOWLEDGE_BASE_ID'] = 'kb-123'
        os.environ['DOCUMENT_TABLE'] = 'Documents'
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert 'results' in body
        assert len(body['results']) == 1
        assert body['results'][0]['filename'] == 'test.pdf'
        assert body['results'][0]['relevanceScore'] == 0.85
    
    def test_missing_query(self):
        """Test error when query is missing"""
        event = {
            'identity': {
                'claims': {
                    'sub': 'user-123',
                    'email': 'test@example.com'
                }
            },
            'arguments': {}
        }
        
        os.environ['KNOWLEDGE_BASE_ID'] = 'kb-123'
        
        response = handler.lambda_handler(event, None)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
    
    def test_unauthorized(self):
        """Test error when user identity is missing"""
        event = {
            'arguments': {
                'query': 'test query'
            }
        }
        
        os.environ['KNOWLEDGE_BASE_ID'] = 'kb-123'
        
        response = handler.lambda_handler(event, None)
        
        assert response['statusCode'] == 401
        body = json.loads(response['body'])
        assert 'Unauthorized' in body['error']
    
    def test_query_too_long(self):
        """Test error when query exceeds max length"""
        event = {
            'identity': {
                'claims': {
                    'sub': 'user-123',
                    'email': 'test@example.com'
                }
            },
            'arguments': {
                'query': 'x' * 1001  # Exceeds 1000 char limit
            }
        }
        
        os.environ['KNOWLEDGE_BASE_ID'] = 'kb-123'
        
        response = handler.lambda_handler(event, None)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'too long' in body['error']


def test_integration():
    """
    Integration test with real AWS services
    
    Note: This requires:
    - Valid AWS credentials
    - Existing Knowledge Base with documents
    - KNOWLEDGE_BASE_ID and DOCUMENT_TABLE environment variables
    
    Run with: python test_handler.py
    """
    # Check if running as integration test
    if os.environ.get('RUN_INTEGRATION_TEST') != 'true':
        print("Skipping integration test (set RUN_INTEGRATION_TEST=true to run)")
        return
    
    # Verify environment variables
    kb_id = os.environ.get('KNOWLEDGE_BASE_ID')
    doc_table = os.environ.get('DOCUMENT_TABLE')
    
    if not kb_id or not doc_table:
        print("Missing required environment variables:")
        print("  KNOWLEDGE_BASE_ID")
        print("  DOCUMENT_TABLE")
        return
    
    # Create test event
    event = {
        'identity': {
            'claims': {
                'sub': 'test-user-123',
                'email': 'test@example.com'
            }
        },
        'arguments': {
            'query': 'test search query',
            'limit': 5,
            'offset': 0
        }
    }
    
    # Call handler
    print(f"\nTesting search with Knowledge Base: {kb_id}")
    print(f"Query: {event['arguments']['query']}")
    
    response = handler.lambda_handler(event, None)
    
    print(f"\nResponse status: {response['statusCode']}")
    
    if response['statusCode'] == 200:
        body = json.loads(response['body'])
        print(f"Results found: {body['total']}")
        print(f"Results returned: {len(body['results'])}")
        
        for i, result in enumerate(body['results'][:3], 1):
            print(f"\nResult {i}:")
            print(f"  Document: {result.get('filename', 'Unknown')}")
            print(f"  Score: {result.get('relevanceScore', 0):.4f}")
            print(f"  Excerpt: {result.get('excerpt', '')[:100]}...")
    else:
        body = json.loads(response['body'])
        print(f"Error: {body.get('error', 'Unknown error')}")


if __name__ == '__main__':
    # Run integration test if requested
    test_integration()
    
    # Run unit tests
    print("\nRunning unit tests...")
    pytest.main([__file__, '-v'])
