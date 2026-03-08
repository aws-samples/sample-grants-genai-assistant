"""
Unit tests for Knowledge Base Document Processor Lambda Function
"""

import json
import os
import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Set environment variables before importing handler
os.environ['KNOWLEDGE_BASE_ID'] = 'test-kb-id'
os.environ['DATA_SOURCE_ID'] = 'test-ds-id'
os.environ['DOCUMENT_TABLE'] = 'test-document-table'

import handler


class TestDocumentProcessor(unittest.TestCase):
    """Test cases for document processor Lambda function"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.sample_s3_event = {
            'Records': [
                {
                    'eventName': 'ObjectCreated:Put',
                    's3': {
                        'bucket': {
                            'name': 'test-bucket'
                        },
                        'object': {
                            'key': 'user-test-user/test-doc-id/test-file.pdf',
                            'size': 1024000
                        }
                    }
                }
            ]
        }
        
        self.context = Mock()
        self.context.function_name = 'test-function'
        self.context.invoked_function_arn = 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
    
    def test_extract_document_info_valid(self):
        """Test extracting user ID and document ID from valid S3 key"""
        s3_key = 'user-abc123/doc-uuid-456/document.pdf'
        user_id, doc_id = handler.extract_document_info(s3_key)
        self.assertEqual(user_id, 'abc123')
        self.assertEqual(doc_id, 'doc-uuid-456')
    
    def test_extract_document_info_invalid(self):
        """Test extracting document info from invalid S3 key"""
        s3_key = 'invalid-key'
        user_id, doc_id = handler.extract_document_info(s3_key)
        self.assertIsNone(user_id)
        self.assertIsNone(doc_id)
    
    @patch('handler.bedrock_agent')
    def test_start_ingestion_job_success(self, mock_bedrock):
        """Test successful ingestion job start"""
        mock_bedrock.start_ingestion_job.return_value = {
            'ingestionJob': {
                'ingestionJobId': 'test-job-id',
                'status': 'STARTING'
            }
        }
        
        job_id = handler.start_ingestion_job('user-test/doc-id/file.pdf')
        
        self.assertEqual(job_id, 'test-job-id')
        mock_bedrock.start_ingestion_job.assert_called_once()
    
    @patch('handler.bedrock_agent')
    def test_start_ingestion_job_failure(self, mock_bedrock):
        """Test ingestion job start failure"""
        from botocore.exceptions import ClientError
        
        mock_bedrock.start_ingestion_job.side_effect = ClientError(
            {'Error': {'Code': 'ThrottlingException', 'Message': 'Rate exceeded'}},
            'StartIngestionJob'
        )
        
        with self.assertRaises(ClientError):
            handler.start_ingestion_job('user-test/doc-id/file.pdf')
    
    @patch('handler.bedrock_agent')
    @patch('handler.time.sleep')
    def test_wait_for_ingestion_job_complete(self, mock_sleep, mock_bedrock):
        """Test waiting for ingestion job to complete"""
        mock_bedrock.get_ingestion_job.return_value = {
            'ingestionJob': {
                'ingestionJobId': 'test-job-id',
                'status': 'COMPLETE',
                'statistics': {
                    'numberOfDocumentsScanned': 1,
                    'numberOfDocumentsIndexed': 1
                }
            }
        }
        
        status = handler.wait_for_ingestion_job('test-job-id')
        
        self.assertEqual(status, 'COMPLETE')
        mock_bedrock.get_ingestion_job.assert_called_once()
    
    @patch('handler.bedrock_agent')
    @patch('handler.time.sleep')
    @patch('handler.time.time')
    def test_wait_for_ingestion_job_timeout(self, mock_time, mock_sleep, mock_bedrock):
        """Test ingestion job timeout"""
        # Simulate time passing beyond SYNC_MAX_WAIT
        mock_time.side_effect = [0, handler.SYNC_MAX_WAIT + 1]
        
        mock_bedrock.get_ingestion_job.return_value = {
            'ingestionJob': {
                'ingestionJobId': 'test-job-id',
                'status': 'IN_PROGRESS'
            }
        }
        
        with self.assertRaises(TimeoutError):
            handler.wait_for_ingestion_job('test-job-id')
    
    @patch('handler.bedrock_agent')
    @patch('handler.time.sleep')
    def test_wait_for_ingestion_job_failed(self, mock_sleep, mock_bedrock):
        """Test ingestion job failure"""
        mock_bedrock.get_ingestion_job.return_value = {
            'ingestionJob': {
                'ingestionJobId': 'test-job-id',
                'status': 'FAILED',
                'failureReasons': ['Invalid document format']
            }
        }
        
        status = handler.wait_for_ingestion_job('test-job-id')
        
        self.assertEqual(status, 'FAILED')
    
    @patch('handler.dynamodb')
    def test_update_document_status_success(self, mock_dynamodb):
        """Test successful document status update"""
        mock_table = Mock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.update_item.return_value = {
            'Attributes': {
                'userId': 'test-user-id',
                'documentId': 'test-doc-id',
                'status': 'ready'
            }
        }
        
        handler.update_document_status(
            user_id='test-user-id',
            document_id='test-doc-id',
            status='ready',
            vector_indexed=True
        )
        
        mock_table.update_item.assert_called_once()
        call_args = mock_table.update_item.call_args
        self.assertEqual(call_args[1]['Key'], {
            'userId': 'test-user-id',
            'documentId': 'test-doc-id'
        })
    
    @patch('handler.dynamodb')
    def test_update_document_status_with_error(self, mock_dynamodb):
        """Test document status update with error message"""
        mock_table = Mock()
        mock_dynamodb.Table.return_value = mock_table
        
        handler.update_document_status(
            user_id='test-user-id',
            document_id='test-doc-id',
            status='failed',
            error_message='Test error'
        )
        
        mock_table.update_item.assert_called_once()
        call_args = mock_table.update_item.call_args
        self.assertIn(':error_message', call_args[1]['ExpressionAttributeValues'])
    
    @patch('handler.process_s3_record')
    def test_lambda_handler_success(self, mock_process):
        """Test successful Lambda handler execution"""
        mock_process.return_value = {
            'success': True,
            'documentId': 'test-doc-id',
            'status': 'ready'
        }
        
        response = handler.lambda_handler(self.sample_s3_event, self.context)
        
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertEqual(body['successful'], 1)
        self.assertEqual(body['failed'], 0)
    
    @patch('handler.process_s3_record')
    def test_lambda_handler_partial_failure(self, mock_process):
        """Test Lambda handler with partial failures"""
        mock_process.side_effect = [
            {'success': True, 'documentId': 'doc-1'},
            {'success': False, 'documentId': 'doc-2', 'error': 'Test error'}
        ]
        
        event = {
            'Records': [
                self.sample_s3_event['Records'][0],
                self.sample_s3_event['Records'][0]
            ]
        }
        
        response = handler.lambda_handler(event, self.context)
        
        self.assertEqual(response['statusCode'], 207)  # Multi-status
        body = json.loads(response['body'])
        self.assertEqual(body['successful'], 1)
        self.assertEqual(body['failed'], 1)
    
    @patch('handler.update_document_status')
    @patch('handler.start_ingestion_job')
    @patch('handler.wait_for_ingestion_job')
    def test_process_s3_record_success(self, mock_wait, mock_start, mock_update):
        """Test successful S3 record processing"""
        mock_start.return_value = 'test-job-id'
        mock_wait.return_value = 'COMPLETE'
        
        result = handler.process_s3_record(self.sample_s3_event['Records'][0])
        
        self.assertTrue(result['success'])
        self.assertEqual(result['documentId'], 'test-doc-id')
        self.assertEqual(result['status'], 'ready')
        
        # Verify status updates
        self.assertEqual(mock_update.call_count, 2)
        # First call: processing
        self.assertEqual(mock_update.call_args_list[0][1]['status'], 'processing')
        # Second call: ready
        self.assertEqual(mock_update.call_args_list[1][1]['status'], 'ready')
    
    @patch('handler.update_document_status')
    @patch('handler.start_ingestion_job')
    @patch('handler.time.sleep')
    def test_process_s3_record_retry_logic(self, mock_sleep, mock_start, mock_update):
        """Test retry logic with exponential backoff"""
        from botocore.exceptions import ClientError
        
        # Fail twice, then succeed
        mock_start.side_effect = [
            ClientError(
                {'Error': {'Code': 'ThrottlingException', 'Message': 'Rate exceeded'}},
                'StartIngestionJob'
            ),
            ClientError(
                {'Error': {'Code': 'ThrottlingException', 'Message': 'Rate exceeded'}},
                'StartIngestionJob'
            ),
            'test-job-id'
        ]
        
        with patch('handler.wait_for_ingestion_job', return_value='COMPLETE'):
            result = handler.process_s3_record(self.sample_s3_event['Records'][0])
        
        self.assertTrue(result['success'])
        self.assertEqual(mock_start.call_count, 3)
        self.assertEqual(mock_sleep.call_count, 2)
    
    @patch('handler.update_document_status')
    @patch('handler.start_ingestion_job')
    @patch('handler.time.sleep')
    def test_process_s3_record_max_retries_exceeded(self, mock_sleep, mock_start, mock_update):
        """Test max retries exceeded"""
        from botocore.exceptions import ClientError
        
        # Fail all attempts
        mock_start.side_effect = ClientError(
            {'Error': {'Code': 'ThrottlingException', 'Message': 'Rate exceeded'}},
            'StartIngestionJob'
        )
        
        result = handler.process_s3_record(self.sample_s3_event['Records'][0])
        
        self.assertFalse(result['success'])
        self.assertIn('error', result)
        self.assertEqual(mock_start.call_count, handler.MAX_RETRIES)
        
        # Verify final status update to failed
        final_update = mock_update.call_args_list[-1]
        self.assertEqual(final_update[1]['status'], 'failed')


def run_integration_test():
    """
    Integration test with sample S3 event
    
    Note: This requires actual AWS credentials and resources
    """
    print("Running integration test...")
    
    sample_event = {
        'Records': [
            {
                'eventName': 'ObjectCreated:Put',
                's3': {
                    'bucket': {
                        'name': os.environ.get('TEST_BUCKET', 'test-bucket')
                    },
                    'object': {
                        'key': 'user-test-user/test-doc-id/test-file.pdf',
                        'size': 1024000
                    }
                }
            }
        ]
    }
    
    context = Mock()
    context.function_name = 'test-function'
    
    try:
        response = handler.lambda_handler(sample_event, context)
        print(f"Response: {json.dumps(response, indent=2)}")
        return response
    except Exception as e:
        print(f"Integration test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == '__main__':
    # Run unit tests
    print("Running unit tests...")
    unittest.main(argv=[''], exit=False, verbosity=2)
    
    # Optionally run integration test
    if os.environ.get('RUN_INTEGRATION_TEST') == 'true':
        print("\n" + "="*80)
        run_integration_test()
