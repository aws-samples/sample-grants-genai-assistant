"""
Unit tests for Knowledge Base Document Manager Lambda Function

Tests cover:
- List documents with various filters
- Delete document with ownership verification
- Get document status
- Error handling scenarios
- User authorization checks
"""

import json
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import pytest

# Mock AWS services before importing handler
sys.modules['boto3'] = MagicMock()

# Set environment variables for testing
os.environ['DOCUMENT_BUCKET'] = 'test-document-bucket'
os.environ['DOCUMENT_TABLE'] = 'test-document-table'
os.environ['KNOWLEDGE_BASE_ID'] = 'test-kb-id'
os.environ['DATA_SOURCE_ID'] = 'test-ds-id'

# Import handler after mocking
import handler


class TestDocumentManager:
    """Test suite for document management operations"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.user_id = 'test-user-123'
        self.user_email = 'test@example.com'
        self.document_id = 'doc-123'
        
        # Sample document metadata
        self.sample_document = {
            'userId': self.user_id,
            'documentId': self.document_id,
            'filename': 'test-document.pdf',
            'contentType': 'application/pdf',
            'fileSize': 1024000,
            'status': 'ready',
            'uploadDate': '2024-01-15T10:30:00Z',
            'processedAt': '2024-01-15T10:35:00Z',
            's3Key': f'user-{self.user_id}/{self.document_id}/test-document.pdf',
            's3Bucket': 'test-document-bucket',
            'vectorIndexed': True,
            'category': 'research'
        }
    
    def create_event(self, field_name: str, arguments: dict) -> dict:
        """Create a test event with Cognito identity"""
        return {
            'info': {
                'fieldName': field_name
            },
            'arguments': arguments,
            'identity': {
                'claims': {
                    'sub': self.user_id,
                    'email': self.user_email
                }
            }
        }
    
    # Test: List Documents
    
    @patch('handler.dynamodb')
    def test_list_documents_success(self, mock_dynamodb):
        """Test successful document listing"""
        # Mock DynamoDB response
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': [self.sample_document],
            'Count': 1
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event
        event = self.create_event('listDocuments', {
            'limit': 20,
            'offset': 0
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert len(body['documents']) == 1
        assert body['documents'][0]['documentId'] == self.document_id
        assert body['total'] == 1
        assert body['hasMore'] is False
    
    @patch('handler.dynamodb')
    def test_list_documents_with_category_filter(self, mock_dynamodb):
        """Test document listing with category filter"""
        # Mock DynamoDB response
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': [self.sample_document],
            'Count': 1
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event with category filter
        event = self.create_event('listDocuments', {
            'filters': {
                'category': 'research'
            },
            'limit': 20,
            'offset': 0
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert len(body['documents']) == 1
        
        # Verify query was called with filter
        mock_table.query.assert_called_once()
        call_args = mock_table.query.call_args[1]
        assert 'FilterExpression' in call_args
    
    @patch('handler.dynamodb')
    def test_list_documents_with_status_filter(self, mock_dynamodb):
        """Test document listing with status filter"""
        # Mock DynamoDB response
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': [self.sample_document],
            'Count': 1
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event with status filter
        event = self.create_event('listDocuments', {
            'filters': {
                'status': 'ready'
            },
            'limit': 20,
            'offset': 0
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert len(body['documents']) == 1
        assert body['documents'][0]['status'] == 'ready'
    
    @patch('handler.dynamodb')
    def test_list_documents_with_date_range_filter(self, mock_dynamodb):
        """Test document listing with date range filter"""
        # Mock DynamoDB response
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': [self.sample_document],
            'Count': 1
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event with date range filter
        event = self.create_event('listDocuments', {
            'filters': {
                'dateRange': {
                    'start': '2024-01-01T00:00:00Z',
                    'end': '2024-12-31T23:59:59Z'
                }
            },
            'limit': 20,
            'offset': 0
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert len(body['documents']) == 1
    
    @patch('handler.dynamodb')
    def test_list_documents_pagination(self, mock_dynamodb):
        """Test document listing with pagination"""
        # Create multiple documents
        documents = [
            {**self.sample_document, 'documentId': f'doc-{i}'}
            for i in range(30)
        ]
        
        # Mock DynamoDB response
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': documents,
            'Count': 30
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event with pagination
        event = self.create_event('listDocuments', {
            'limit': 10,
            'offset': 0
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert len(body['documents']) == 10
        assert body['total'] == 30
        assert body['hasMore'] is True
        assert body['offset'] == 0
        assert body['limit'] == 10
    
    @patch('handler.dynamodb')
    def test_list_documents_empty_result(self, mock_dynamodb):
        """Test document listing with no results"""
        # Mock DynamoDB response
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': [],
            'Count': 0
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event
        event = self.create_event('listDocuments', {
            'limit': 20,
            'offset': 0
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert len(body['documents']) == 0
        assert body['total'] == 0
        assert body['hasMore'] is False
    
    # Test: Delete Document
    
    @patch('handler.bedrock_agent')
    @patch('handler.s3_client')
    @patch('handler.dynamodb')
    def test_delete_document_success(self, mock_dynamodb, mock_s3, mock_bedrock):
        """Test successful document deletion"""
        # Mock DynamoDB get_item
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': self.sample_document
        }
        mock_table.delete_item.return_value = {}
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock S3 delete
        mock_s3.delete_object.return_value = {}
        
        # Mock Bedrock sync
        mock_bedrock.start_ingestion_job.return_value = {
            'ingestionJob': {
                'ingestionJobId': 'sync-job-123'
            }
        }
        
        # Create event
        event = self.create_event('deleteDocument', {
            'documentId': self.document_id
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] is True
        assert body['documentId'] == self.document_id
        
        # Verify S3 delete was called
        mock_s3.delete_object.assert_called_once_with(
            Bucket='test-document-bucket',
            Key=self.sample_document['s3Key']
        )
        
        # Verify DynamoDB delete was called
        mock_table.delete_item.assert_called_once()
        
        # Verify Bedrock sync was triggered
        mock_bedrock.start_ingestion_job.assert_called_once()
    
    @patch('handler.dynamodb')
    def test_delete_document_not_found(self, mock_dynamodb):
        """Test deleting non-existent document"""
        # Mock DynamoDB get_item returning no item
        mock_table = MagicMock()
        mock_table.get_item.return_value = {}
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event
        event = self.create_event('deleteDocument', {
            'documentId': 'non-existent-doc'
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 404
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'not found' in body['error'].lower()
    
    @patch('handler.dynamodb')
    def test_delete_document_missing_id(self, mock_dynamodb):
        """Test deleting without document ID"""
        # Create event without documentId
        event = self.create_event('deleteDocument', {})
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'required' in body['error'].lower()
    
    @patch('handler.s3_client')
    @patch('handler.dynamodb')
    def test_delete_document_s3_already_deleted(self, mock_dynamodb, mock_s3):
        """Test deleting document when S3 object already deleted"""
        # Mock DynamoDB get_item
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': self.sample_document
        }
        mock_table.delete_item.return_value = {}
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock S3 delete with NoSuchKey error
        from botocore.exceptions import ClientError
        mock_s3.delete_object.side_effect = ClientError(
            {'Error': {'Code': 'NoSuchKey', 'Message': 'Not found'}},
            'delete_object'
        )
        
        # Create event
        event = self.create_event('deleteDocument', {
            'documentId': self.document_id
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response - should still succeed
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['success'] is True
    
    # Test: Get Document Status
    
    @patch('handler.dynamodb')
    def test_get_document_status_success(self, mock_dynamodb):
        """Test successful document status retrieval"""
        # Mock DynamoDB get_item
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': self.sample_document
        }
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event
        event = self.create_event('getDocumentStatus', {
            'documentId': self.document_id
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['documentId'] == self.document_id
        assert body['status'] == 'ready'
        assert body['vectorIndexed'] is True
    
    @patch('handler.dynamodb')
    def test_get_document_status_not_found(self, mock_dynamodb):
        """Test getting status of non-existent document"""
        # Mock DynamoDB get_item returning no item
        mock_table = MagicMock()
        mock_table.get_item.return_value = {}
        mock_dynamodb.Table.return_value = mock_table
        
        # Create event
        event = self.create_event('getDocumentStatus', {
            'documentId': 'non-existent-doc'
        })
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 404
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'not found' in body['error'].lower()
    
    @patch('handler.dynamodb')
    def test_get_document_status_missing_id(self, mock_dynamodb):
        """Test getting status without document ID"""
        # Create event without documentId
        event = self.create_event('getDocumentStatus', {})
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'required' in body['error'].lower()
    
    # Test: User Authorization
    
    def test_unauthorized_no_identity(self):
        """Test request without user identity"""
        # Create event without identity
        event = {
            'info': {'fieldName': 'listDocuments'},
            'arguments': {}
        }
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 401
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'unauthorized' in body['error'].lower()
    
    def test_unknown_operation(self):
        """Test request with unknown operation"""
        # Create event with unknown field name
        event = self.create_event('unknownOperation', {})
        
        # Call handler
        response = handler.lambda_handler(event, None)
        
        # Verify response
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert 'unknown operation' in body['error'].lower()
    
    # Test: Extract User Identity
    
    def test_extract_user_identity_from_claims(self):
        """Test extracting user identity from Cognito claims"""
        event = {
            'identity': {
                'claims': {
                    'sub': self.user_id,
                    'email': self.user_email
                }
            }
        }
        
        user_id, user_email = handler.extract_user_identity(event)
        
        assert user_id == self.user_id
        assert user_email == self.user_email
    
    def test_extract_user_identity_from_request_context(self):
        """Test extracting user identity from request context"""
        event = {
            'requestContext': {
                'identity': {
                    'sub': self.user_id,
                    'email': self.user_email
                }
            }
        }
        
        user_id, user_email = handler.extract_user_identity(event)
        
        assert user_id == self.user_id
        assert user_email == self.user_email
    
    def test_extract_user_identity_not_found(self):
        """Test extracting user identity when not present"""
        event = {}
        
        user_id, user_email = handler.extract_user_identity(event)
        
        assert user_id is None
        assert user_email is None


if __name__ == '__main__':
    # Run tests
    pytest.main([__file__, '-v'])
