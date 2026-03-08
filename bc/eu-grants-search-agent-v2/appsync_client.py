"""
AppSync GraphQL client for V2 agent
Publishes mutations to trigger UI subscriptions
"""

import os
import json
import logging
import time
import requests
import boto3
from datetime import datetime
from aws_requests_auth.aws_auth import AWSRequestsAuth

logger = logging.getLogger(__name__)

class AppSyncClient:
    """Client for publishing GraphQL mutations to AppSync"""
    
    def __init__(self):
        self.endpoint = os.environ.get('APPSYNC_ENDPOINT')
        self.region = os.environ.get('AWS_REGION', 'us-east-2')
        self.api_id = os.environ.get('GRAPHQL_API_ID')
        
        if not self.endpoint:
            raise ValueError("APPSYNC_ENDPOINT environment variable is required")
        
        if not self.api_id:
            raise ValueError("GRAPHQL_API_ID environment variable is required")
        
        logger.info(f"[V2] AppSync client initialized with IAM auth")
        logger.info(f"[V2] AppSync endpoint: {self.endpoint}")
    

    def _execute_mutation(self, mutation, variables):
        """Execute a GraphQL mutation"""
        try:
            payload = {
                'query': mutation,
                'variables': variables
            }
            
            # Log the actual payload being sent
            logger.info(f"[V2] 🔍 Sending mutation with variables: {json.dumps(variables, indent=2)}")
            
            headers = {'Content-Type': 'application/json'}
            
            # Use IAM auth with boto3 credentials
            session = boto3.Session()
            credentials = session.get_credentials()
            
            auth = AWSRequestsAuth(
                aws_access_key=credentials.access_key,
                aws_secret_access_key=credentials.secret_key,
                aws_token=credentials.token,
                aws_host=self.endpoint.replace('https://', '').replace('/graphql', ''),
                aws_region=self.region,
                aws_service='appsync'
            )
            response = requests.post(
                self.endpoint,
                auth=auth,
                json=payload,
                headers=headers
            )
            
            if response.status_code != 200:
                logger.error(f"[V2] AppSync mutation failed: {response.status_code} - {response.text}")
                return None
            
            result = response.json()
            
            # Log the response
            logger.info(f"[V2] 🔍 AppSync response: {json.dumps(result, indent=2)}")
            
            if 'errors' in result:
                logger.error(f"[V2] AppSync GraphQL errors: {result['errors']}")
                return None
            
            return result.get('data')
            
        except Exception as e:
            logger.error(f"[V2] AppSync mutation exception: {str(e)}")
            return None
    
    def create_search_event(self, session_id, event_type, data=None, cognito_user_id=None):
        """Publish a SearchEvent via AppSync mutation"""
        try:
            import time
            
            mutation = """
            mutation CreateSearchEvent($input: CreateSearchEventInput!) {
                createSearchEvent(input: $input) {
                    id
                    sessionId
                    eventType
                }
            }
            """
            
            # Calculate TTL (3 days from now)
            ttl_seconds = int(time.time()) + (3 * 86400)
            
            # AWSJSON type expects a JSON string, not an object
            variables = {
                'input': {
                    'sessionId': session_id,
                    'eventType': event_type,
                    'data': json.dumps(data or {}),  # Must be JSON string for AWSJSON type
                    'ttl': ttl_seconds
                    # timestamp is auto-generated - don't send it!
                }
            }
            
            logger.info(f"[V2] Publishing SearchEvent via AppSync: {event_type}")
            result = self._execute_mutation(mutation, variables)
            
            if result:
                logger.info(f"[V2] ✅ SearchEvent published: {event_type}")
                return True
            else:
                logger.error(f"[V2] ❌ Failed to publish SearchEvent: {event_type}")
                return False
                
        except Exception as e:
            logger.error(f"[V2] Error publishing SearchEvent: {str(e)}")
            return False
    
    def create_grant_record(self, grant_data):
        """Publish a GrantRecord via AppSync mutation"""
        try:
            import time
            
            logger.info(f"[V2] ========== APPSYNC: CREATE GRANT RECORD ==========")
            logger.info(f"[V2] 📥 Received grant_data keys: {list(grant_data.keys())}")
            logger.info(f"[V2] 📥 Grant data values:")
            logger.info(f"[V2]    - sessionId: {grant_data.get('sessionId')}")
            logger.info(f"[V2]    - grantId: {grant_data.get('grantId')}")
            logger.info(f"[V2]    - title: {grant_data.get('title', '')[:60]}...")
            logger.info(f"[V2]    - agency: {grant_data.get('agency')}")
            logger.info(f"[V2]    - amount: {grant_data.get('amount')}")
            logger.info(f"[V2]    - deadline: {grant_data.get('deadline')}")
            logger.info(f"[V2]    - description length: {len(grant_data.get('description', ''))}")
            logger.info(f"[V2]    - eligibility length: {len(grant_data.get('eligibility', ''))}")
            logger.info(f"[V2]    - applicationProcess length: {len(grant_data.get('applicationProcess', ''))}")
            logger.info(f"[V2]    - source: {grant_data.get('source')}")
            logger.info(f"[V2]    - relevanceScore: {grant_data.get('relevanceScore')}")
            logger.info(f"[V2]    - profileMatchScore: {grant_data.get('profileMatchScore')}")
            logger.info(f"[V2]    - keywordScore: {grant_data.get('keywordScore')}")
            
            mutation = """
            mutation CreateGrantRecord($input: CreateGrantRecordInput!) {
                createGrantRecord(input: $input) {
                    id
                    sessionId
                    grantId
                    title
                    agency
                    amount
                    deadline
                    description
                    relevanceScore
                    profileMatchScore
                    keywordScore
                }
            }
            """
            
            # Calculate TTL (3 days from now)
            ttl_seconds = int(time.time()) + (3 * 86400)  # 3 days * seconds_per_day
            
            # Get current timestamp
            current_time = datetime.utcnow().isoformat() + 'Z'
            
            # Include ALL fields including createdAt and ttl (like V1 processor does)
            filtered_input = {
                'sessionId': grant_data.get('sessionId'),
                'grantId': grant_data.get('grantId'),
                'title': grant_data.get('title'),
                'agency': grant_data.get('agency'),
                'amount': grant_data.get('amount'),
                'deadline': grant_data.get('deadline'),
                'description': grant_data.get('description'),
                'eligibility': grant_data.get('eligibility'),
                'applicationProcess': grant_data.get('applicationProcess'),
                'source': grant_data.get('source'),
                'relevanceScore': grant_data.get('relevanceScore'),
                'profileMatchScore': grant_data.get('profileMatchScore'),
                'keywordScore': grant_data.get('keywordScore'),
                'matchedKeywords': grant_data.get('matchedKeywords', []),
                'tags': grant_data.get('tags', []),
                'createdAt': current_time,  # CRITICAL: Must include this
                'ttl': ttl_seconds  # CRITICAL: Must include this
            }
            
            logger.info(f"[V2] 📤 Mutation input prepared:")
            logger.info(f"[V2]    - agency in input: {filtered_input['agency']}")
            logger.info(f"[V2]    - amount in input: {filtered_input['amount']}")
            logger.info(f"[V2]    - description length in input: {len(filtered_input['description'])}")
            
            variables = {
                'input': filtered_input
            }
            
            result = self._execute_mutation(mutation, variables)
            
            if result:
                logger.info(f"[V2] ✅ Successfully created GrantRecord: {grant_data.get('grantId')}")
                return True
            else:
                logger.error(f"[V2] ❌ Failed to create GrantRecord: {grant_data.get('grantId')}")
                logger.error(f"[V2] Input was: {filtered_input}")
                return False
                
        except Exception as e:
            logger.error(f"[V2] Error creating GrantRecord: {str(e)}")
            return False

    def create_eu_grant_record(self, grant_data):
        """Create an EuGrantRecord via AppSync mutation"""
        try:
            mutation = """
            mutation CreateEuGrantRecord($input: CreateEuGrantRecordInput!) {
                createEuGrantRecord(input: $input) {
                    id
                    sessionId
                    grantId
                    title
                    agency
                    amount
                    deadline
                    description
                    relevanceScore
                    profileMatchScore
                    keywordScore
                }
            }
            """
            
            # Calculate TTL (3 days from now)
            ttl_seconds = int(time.time()) + (3 * 86400)
            
            # Get current timestamp
            current_time = datetime.utcnow().isoformat() + 'Z'
            
            # Include ALL EU-specific fields
            filtered_input = {
                'sessionId': grant_data.get('sessionId'),
                'grantId': grant_data.get('grantId'),
                'title': grant_data.get('title'),
                'agency': grant_data.get('agency'),
                'amount': grant_data.get('amount'),
                'awardCeiling': grant_data.get('awardCeiling'),
                'awardFloor': grant_data.get('awardFloor'),
                'deadline': grant_data.get('deadline'),
                'description': grant_data.get('description'),
                'eligibility': grant_data.get('eligibility'),
                'applicationProcess': grant_data.get('applicationProcess'),
                'source': grant_data.get('source'),
                'relevanceScore': grant_data.get('relevanceScore'),
                'profileMatchScore': grant_data.get('profileMatchScore'),
                'keywordScore': grant_data.get('keywordScore'),
                'matchedKeywords': grant_data.get('matchedKeywords', []),
                'tags': grant_data.get('tags', []),
                'euReference': grant_data.get('euReference'),
                'euIdentifier': grant_data.get('euIdentifier'),
                'euCallIdentifier': grant_data.get('euCallIdentifier'),
                'euCallTitle': grant_data.get('euCallTitle'),
                'euFrameworkProgramme': grant_data.get('euFrameworkProgramme'),
                'euProgrammePeriod': grant_data.get('euProgrammePeriod'),
                'euStatus': grant_data.get('euStatus'),
                'euDeadlineModel': grant_data.get('euDeadlineModel'),
                'euKeywords': grant_data.get('euKeywords', []),
                'euCrossCuttingPriorities': grant_data.get('euCrossCuttingPriorities', []),
                'euTypesOfAction': grant_data.get('euTypesOfAction', []),
                'euLanguage': grant_data.get('euLanguage'),
                'euUrl': grant_data.get('euUrl'),
                'hasDetailedInfo': grant_data.get('hasDetailedInfo', False),
                'euConditions': grant_data.get('euConditions'),
                'euSupportInfo': grant_data.get('euSupportInfo'),
                'euLatestUpdates': grant_data.get('euLatestUpdates'),
                'euAllDeadlines': grant_data.get('euAllDeadlines'),
                'euBudgetOverview': grant_data.get('euBudgetOverview'),
                'euCallDetails': grant_data.get('euCallDetails'),
                'euPortalUrl': grant_data.get('euPortalUrl'),
                'createdAt': current_time,
                'ttl': ttl_seconds
            }
            
            variables = {
                'input': filtered_input
            }
            
            result = self._execute_mutation(mutation, variables)
            
            if result and 'createEuGrantRecord' in result:
                logger.info(f"[V2] ✅ EuGrantRecord created: {grant_data.get('grantId')}")
                return True
            else:
                logger.error(f"[V2] ❌ Failed to create EuGrantRecord: {grant_data.get('grantId')}")
                return False
                
        except Exception as e:
            logger.error(f"[V2] ❌ Error creating EuGrantRecord: {str(e)}")
            return False
