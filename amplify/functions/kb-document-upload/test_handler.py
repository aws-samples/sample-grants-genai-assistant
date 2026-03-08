"""
Unit tests for Knowledge Base Document Upload Lambda Function

Tests cover:
- File validation (type, size, name)
- User authentication and authorization
- Presigned URL generation
- DynamoDB metadata creation
- Error handling
"""

import json
import os
import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Mock environment variables before importing handler
os.environ['DOCUMENT_BUCKET'] = 'test-bucket'
os.environ['DOCUMENT_TABLE'] = 'test-table'
os.environ['PRESIGNED_URL_EXPIRATION'] = '3600'

# Import handler after setting environment variables
import handler


class TestDocumentUploadHandler(unittest.TestCase):
    """Test cases for document upload Lambda handler"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.valid_event = {
            'identity': {
                'claims': {
                    'sub': 'test-user-123',
                    'email': 'test@example.com'
                }
            },
            'arguments': {
                'input': {
                    'filename': 'test-document.pdf',
                    'contentType': 'application/pdf',
                    'fileSize': 1024000,
                    'category': 'research'
                }
            }
        }
    
    def test_extract_user_identity_from_claims(self):
        """Test extracting user identity from Cognito claims"""
        event = {
            'identity': {
                'claims': {
                    'sub': 'user-123',
                    'email': 'user@example.com'
                }
            }
        }
        
        user_id, user_email = handler.extract_user_identity(event)
        
        self.assertEqual(user_id, 'user-123')
        self.assertEqual(user_email, 'user@example.com')
    
    def test_extract_user_identity_from_request_context(self):
        """Test extracting user identity from request context"""
        event = {
            'requestContext': {
                'identity': {
                    'sub': 'user-456',
                    'email': 'user2@example.com'
                }
            }
        }
        
        user_id, user_email = handler.extract_user_identity(event)
        
        self.assertEqual(user_id, 'user-456')
        self.assertEqual(user_email, 'user2@example.com')
    
    def test_extract_user_identity_missing(self):
        """Test handling missing user identity"""
        event = {}
        
        user_id, user_email = handler.extract_user_identity(event)
        
        self.assertIsNone(user_id)
        self.assertIsNone(user_email)
    
    def test_validate_file_valid_pdf(self):
        """Test validation of valid PDF file"""
        error = handler.validate_file('document.pdf', 'application/pdf', 1024000)
        self.assertIsNone(error)
    
    def test_validate_file_valid_docx(self):
        """Test validation of valid DOCX file"""
        error = handler.validate_file('document.docx', 
                                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                     2048000)
        self.assertIsNone(error)
    
    def test_validate_file_valid_txt(self):
        """Test validation of valid text file"""
        error = handler.validate_file('notes.txt', 'text/plain', 512000)
        self.assertIsNone(error)
    
    def test_validate_file_invalid_content_type(self):
        """Test rejection of invalid content type"""
        error = handler.validate_file('image.jpg', 'image/jpeg', 1024000)
        self.assertIsNotNone(error)
        self.assertIn('Invalid content type', error)
    
    def test_validate_file_mismatched_extension(self):
        """Test rejection of mismatched file extension"""
        error = handler.validate_file('document.txt', 'application/pdf', 1024000)
        self.assertIsNotNone(error)
        self.assertIn('extension does not match', error)
    
    def test_validate_file_too_large(self):
        """Test rejection of file exceeding size limit"""
        error = handler.validate_file('large.pdf', 'application/pdf', 100 * 1024 * 1024)
        self.assertIsNotNone(error)
        self.assertIn('too large', error)
    
    def test_validate_file_too_small(self):
        """Test rejection of empty file"""
        error = handler.validate_file('empty.pdf', 'application/pdf', 0)
        self.assertIsNotNone(error)
        self.assertIn('too small', error)
    
    def test_validate_file_path_traversal(self):
        """Test rejection of path traversal attempts"""
        error = handler.validate_file('../../../etc/passwd', 'text/plain', 1024)
        self.assertIsNotNone(error)
        self.assertIn('path traversal', error)
    
    def test_validate_file_invalid_characters(self):
        """Test rejection of filenames with invalid characters"""
        error = handler.validate_file('file/with/slashes.pdf', 'application/pdf', 1024)
        self.assertIsNotNone(error)
        self.assertIn('path traversal', error)
    
    @patch('handler.s3_client')
    def test_generate_presigned_upload_url(self, mock_s3):
        """Test presigned URL generation"""
        mock_s3.generate_presigned_url.return_value = 'https://s3.amazonaws.com/presigned-url'
        
        url = handler.generate_presigned_upload_url(
            bucket='test-bucket',
            key='user-123/doc.pdf',
            content_type='application/pdf',
            expiration=3600
        )
        
        self.assertEqual(url, 'https://s3.amazonaws.com/presigned-url')
        mock_s3.generate_presigned_url.assert_called_once()
    
    @patch('handler.dynamodb')
    def test_create_document_metadata(self, mock_dynamodb):
        """Test document metadata creation in DynamoDB"""
        mock_table = Mock()
        mock_dynamodb.Table.return_value = mock_table
        
        handler.create_document_metadata(
            document_id='doc-123',
            user_id='user-456',
            filename='test.pdf',
            content_type='application/pdf',
            file_size=1024000,
            s3_key='user-456/doc-123/test.pdf',
            s3_bucket='test-bucket',
            category='research'
        )
        
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args
        item = call_args[1]['Item']
        
        self.assertEqual(item['documentId'], 'doc-123')
        self.assertEqual(item['userId'], 'user-456')
        self.assertEqual(item['filename'], 'test.pdf')
        self.assertEqual(item['status'], 'uploading')
        self.assertEqual(item['category'], 'research')
        self.assertFalse(item['vectorIndexed'])
    
    @patch('handler.s3_client')
    @patch('handler.dynamodb')
    def test_lambda_handler_success(self, mock_dynamodb, mock_s3):
        """Test successful document upload request"""
        # Mock S3 presigned URL generation
        mock_s3.generate_presigned_url.return_value = 'https://s3.amazonaws.com/upload-url'
        
        # Mock DynamoDB table
        mock_table = Mock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Call handler
        response = handler.lambda_handler(self.valid_event, None)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('documentId', body)
        self.assertIn('uploadUrl', body)
        self.assertEqual(body['status'], 'uploading')
        self.assertIn('s3Key', body)
        self.assertEqual(body['expiresIn'], 3600)
    
    def test_lambda_handler_missing_user_identity(self):
        """Test handling of missing user identity"""
        event = {
            'arguments': {
                'input': {
                    'filename': 'test.pdf',
                    'contentType': 'application/pdf',
                    'fileSize': 1024000
                }
            }
        }
        
        response = handler.lambda_handler(event, None)
        
        self.assertEqual(response['statusCode'], 401)
        body = json.loads(response['body'])
        self.assertIn('Unauthorized', body['error'])
    
    def test_lambda_handler_missing_required_fields(self):
        """Test handling of missing required fields"""
        event = {
            'identity': {
                'claims': {
                    'sub': 'user-123',
                    'email': 'test@example.com'
                }
            },
            'arguments': {
                'input': {
                    'filename': 'test.pdf'
                    # Missing contentType and fileSize
                }
            }
        }
        
        response = handler.lambda_handler(event, None)
        
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertIn('Missing required fields', body['error'])
    
    def test_lambda_handler_invalid_file_type(self):
        """Test handling of invalid file type"""
        event = {
            'identity': {
                'claims': {
                    'sub': 'user-123',
                    'email': 'test@example.com'
                }
            },
            'arguments': {
                'input': {
                    'filename': 'image.jpg',
                    'contentType': 'image/jpeg',
                    'fileSize': 1024000
                }
            }
        }
        
        response = handler.lambda_handler(event, None)
        
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertIn('Invalid content type', body['error'])
    
    def test_lambda_handler_file_too_large(self):
        """Test handling of oversized file"""
        event = {
            'identity': {
                'claims': {
                    'sub': 'user-123',
                    'email': 'test@example.com'
                }
            },
            'arguments': {
                'input': {
                    'filename': 'huge.pdf',
                    'contentType': 'application/pdf',
                    'fileSize': 100 * 1024 * 1024  # 100 MB
                }
            }
        }
        
        response = handler.lambda_handler(event, None)
        
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertIn('too large', body['error'])
    
    def test_success_response_format(self):
        """Test success response formatting"""
        data = {'key': 'value'}
        response = handler.success_response(data)
        
        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(json.loads(response['body']), data)
        self.assertIn('Content-Type', response['headers'])
    
    def test_error_response_format(self):
        """Test error response formatting"""
        response = handler.error_response(400, 'Test error')
        
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertEqual(body['error'], 'Test error')
        self.assertIn('Content-Type', response['headers'])


if __name__ == '__main__':
    unittest.main()
