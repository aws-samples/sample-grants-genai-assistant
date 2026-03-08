import json
import boto3
import uuid
from datetime import datetime
import os
from typing import Dict, Any, List

# AWS clients
dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')
appsync = boto3.client('appsync')
s3 = boto3.client('s3')

# Select inference profile based on region
# eu-west-1 uses EU cross-region profile; all US regions use US cross-region profile
_region = os.environ.get('AWS_REGION', 'us-east-1')
CLAUDE_MODEL_ID = 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0' if _region.startswith('eu-') else 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'

# Environment variables - All required, no fallbacks
CHAT_SESSIONS_TABLE = os.environ['CHAT_SESSIONS_TABLE']
CHAT_CONTEXT_BUCKET = os.environ['CHAT_CONTEXT_BUCKET']
APPSYNC_API_ID = os.environ['APPSYNC_API_ID']
APPSYNC_ENDPOINT = os.environ['APPSYNC_ENDPOINT']

# Guardrail configuration (optional - gracefully disabled if not set)
GUARDRAIL_ID = os.environ.get('GUARDRAIL_ID', '')
GUARDRAIL_VERSION = os.environ.get('GUARDRAIL_VERSION', '')

def handler(event, context):
    """
    Chat handler Lambda function
    Processes chat messages and streams responses via AppSync
    """
    try:
        print(f"🚀 Chat handler started - Received event: {json.dumps(event)}")
        
        # Route based on field name
        field_name = event.get('fieldName')
        
        if field_name == 'listUserChatSessions':
            return handle_list_sessions(event, context)
        elif field_name == 'sendChatMessage':
            return handle_send_message(event, context)
        else:
            raise ValueError(f"Unknown field name: {field_name}")
            
    except Exception as e:
        print(f"❌ Error in chat handler: {str(e)}")
        import traceback
        print(f"📍 Stack trace: {traceback.format_exc()}")
        raise e

def handle_list_sessions(event, context):
    """Handle listUserChatSessions query"""
    identity = event['identity']
    
    if 'sub' in identity:
        user_id = identity['sub']
    else:
        user_id = identity.get('username', 'unknown-user')
    
    print(f"📋 Listing sessions for user: {user_id}")
    
    table = dynamodb.Table(CHAT_SESSIONS_TABLE)
    
    try:
        # Query sessions for this user
        response = table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}'
            },
            ScanIndexForward=False,  # Most recent first
            Limit=event['arguments'].get('limit', 10)
        )
        
        sessions = []
        for item in response.get('Items', []):
            sessions.append({
                'sessionId': item['sessionId'],
                'userId': item['userId'],
                'userEmail': item.get('userEmail', ''),
                'createdAt': item['createdAt'],
                'updatedAt': item['updatedAt'],
                'summary': item.get('summary', ''),
                'messageCount': len(item.get('messages', []))
            })
        
        return sessions
        
    except Exception as e:
        print(f"❌ Error listing sessions: {str(e)}")
        return []

def handle_send_message(event, context):
    """Handle sendChatMessage mutation"""
    # Extract user info from identity (handle both Cognito and IAM)
    identity = event['identity']
    
    if 'sub' in identity:
        # Cognito User Pool authentication
        user_id = identity['sub']
        user_email = identity.get('email', 'unknown@example.com')
    else:
        # IAM/AWS SSO authentication
        user_id = identity.get('username', 'unknown-user')
        # Extract email from userArn if available
        user_arn = identity.get('userArn', '')
        if '@' in user_arn:
            user_email = user_arn.split(':')[-1]  # Extract email from ARN
        else:
            user_email = f"{user_id}@example.com"
    
    print(f"👤 Processing request for user: {user_email} (ID: {user_id})")
    print(f"🔐 Authentication type: {'Cognito' if 'sub' in identity else 'IAM/SSO'}")
    
    # Extract input - handle both old and new argument formats
    if 'input' in event['arguments']:
        # Old format: { input: { message: "...", sessionId: "..." } }
        input_data = event['arguments']['input']
        message = input_data['message']
        session_id = input_data.get('sessionId')
    else:
        # New format: { message: "...", sessionId: "..." }
        message = event['arguments']['message']
        session_id = event['arguments'].get('sessionId')
    print(f"💬 Message: {message[:100]}{'...' if len(message) > 100 else ''}")
    
    # Create new session if none provided
    if not session_id:
        session_id = str(uuid.uuid4())
        print(f"🆕 Creating new session: {session_id}")
        create_new_session(session_id, user_id, user_email)
    else:
        print(f"📂 Using existing session: {session_id}")
    
    # Load chat history for context
    print("📚 Loading chat history...")
    chat_history = load_chat_history(session_id, user_id)
    print(f"📖 Found {len(chat_history)} previous messages")
    
    # Check if this is a "how do I" question and fetch relevant documentation
    context_docs = []
    if is_help_question(message):
        print("❓ Detected help question - fetching relevant documentation...")
        context_docs = fetch_relevant_documentation(message)
        print(f"📚 Found {len(context_docs)} relevant documentation sections")
    
    # Generate response using Claude
    print("🤖 Calling Claude Sonnet...")
    response_content = generate_claude_response(message, chat_history, user_email, context_docs)
    print(f"✅ Claude response received: {len(response_content)} characters")
    
    # Save user message and assistant response
    print("💾 Saving messages to database...")
    user_message_id = save_message(session_id, user_id, "user", message)
    assistant_message_id = save_message(session_id, user_id, "assistant", response_content)
    print(f"📝 Messages saved - User: {user_message_id}, Assistant: {assistant_message_id}")
    
    # Stream response via AppSync subscription
    print("📡 Streaming response via AppSync...")
    stream_response(session_id, assistant_message_id, response_content, True)
    
    response_data = {
        'sessionId': session_id,
        'messageId': assistant_message_id,
        'content': response_content,
        'isComplete': True,
        'toolCalls': []
    }
    
    print("🎉 Chat handler completed successfully")
    print(f"📤 Returning response: {json.dumps(response_data, indent=2)}")
    return response_data

def create_new_session(session_id: str, user_id: str, user_email: str):
    """Create a new chat session"""
    table = dynamodb.Table(CHAT_SESSIONS_TABLE)
    
    now = datetime.utcnow().isoformat() + 'Z'
    
    table.put_item(
        Item={
            'PK': f'USER#{user_id}',
            'SK': f'SESSION#{session_id}',
            'GSI1PK': session_id,
            'GSI2PK': user_id,
            'GSI2SK': now,
            'sessionId': session_id,
            'userId': user_id,
            'userEmail': user_email,
            'createdAt': now,
            'updatedAt': now,
            'messages': [],
            'context': {},
            'summary': ''
        }
    )

def load_chat_history(session_id: str, user_id: str) -> List[Dict]:
    """Load recent chat history for context"""
    table = dynamodb.Table(CHAT_SESSIONS_TABLE)
    
    try:
        response = table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': f'SESSION#{session_id}'
            }
        )
        
        if 'Item' in response:
            return response['Item'].get('messages', [])
        return []
        
    except Exception as e:
        print(f"Error loading chat history: {str(e)}")
        return []

def generate_claude_response(message: str, chat_history: List[Dict], user_email: str, context_docs: List[Dict] = None) -> str:
    """Generate response using Claude Sonnet"""
    
    print(f"🧠 Building conversation context with {len(chat_history)} previous messages")
    
    # Build conversation context
    conversation = []
    
    # Build comprehensive system prompt for research assistant
    system_prompt = f"""You are a specialized Research Funding Assistant helping {user_email} discover and secure research funding opportunities. You are an expert in:

🎯 FUNDING AGENCIES & PROGRAMS:
• NIH (National Institutes of Health) - All institutes and centers (NCI, NIMH, NHLBI, etc.)
• NSF (National Science Foundation) - All directorates and programs
• DOD/DARPA - Defense research and advanced projects
• DOE (Department of Energy) - Basic and applied energy research
• NASA - Space and aeronautics research
• European funding (Horizon Europe, ERC, Marie Curie)
• Private foundations (Gates, Wellcome, Howard Hughes, etc.)

🔬 RESEARCH DOMAINS:
• Biomedical and health sciences
• Engineering and physical sciences  
• Computer science and AI/ML
• Environmental and climate research
• Social sciences and humanities
• Interdisciplinary and translational research

💡 YOUR CAPABILITIES:
• Analyze researcher profiles and match to relevant opportunities
• Explain funding mechanisms (R01, R21, SBIR, CAREER, etc.)
• Provide strategic advice on proposal development
• Help with eligibility requirements and application processes
• Suggest collaboration opportunities and team building
• Offer insights on review criteria and success strategies

🎯 YOUR APPROACH:
• Be proactive in suggesting relevant opportunities
• Provide specific, actionable guidance
• Consider career stage, institution type, and research focus
• Highlight deadlines and application requirements
• Explain complex funding landscapes in accessible terms
• Connect researchers to appropriate resources and tools

You have access to comprehensive grant databases, user research profiles, and real-time funding opportunity data. Always be helpful, accurate, and strategic in your recommendations.

🚀 IMPORTANT: When users ask about finding grants relevant to them, ALWAYS guide them to use the platform's features:
• Direct them to the Grant Search functionality for active searching
• Explain the Agent Selected Grants feature for automated discovery
• Emphasize the importance of setting up their User Profile for personalized matching
• Mention the Bayesian matching system that scores relevance based on their profile
• Suggest using the autonomous discovery capabilities rather than manual information gathering

Focus on empowering users to leverage the platform's AI-powered capabilities rather than asking them to provide information manually."""
    
    # Add documentation context if available
    if context_docs:
        system_prompt += "\n\n📚 PLATFORM DOCUMENTATION:\nYou have access to detailed documentation about this grant research platform:\n\n"
        for doc in context_docs:
            system_prompt += f"=== {doc['title']} ===\n{doc['content']}\n\n"
        system_prompt += """
🔧 PLATFORM GUIDANCE:
• Use this documentation to provide accurate, step-by-step instructions
• Reference specific scripts, tools, and features by name
• Help users navigate the platform effectively
• Explain technical concepts in the context of grant research
• Connect platform features to research funding strategies"""
    
    # Add recent chat history for context
    for msg in chat_history[-10:]:  # Last 10 messages for context
        conversation.append({
            "role": msg['role'],
            "content": msg['content']
        })
    
    # Add current message
    conversation.append({
        "role": "user",
        "content": message
    })
    
    print(f"📝 Conversation has {len(conversation)} messages")
    
    # Call Claude
    try:
        print("🔄 Invoking Bedrock model...")
        
        # Pre-screen user input with guardrail before sending to Claude
        if GUARDRAIL_ID and GUARDRAIL_VERSION:
            print(f"🛡️ Guardrail enabled: {GUARDRAIL_ID} v{GUARDRAIL_VERSION}")
            guardrail_response = bedrock.apply_guardrail(
                guardrailIdentifier=GUARDRAIL_ID,
                guardrailVersion=GUARDRAIL_VERSION,
                source='INPUT',
                content=[{'text': {'text': message}}]
            )
            if guardrail_response.get('action') == 'GUARDRAIL_INTERVENED':
                print(f"🛡️ Guardrail BLOCKED request from {user_email}")
                return 'Your request was blocked for security reasons. Please rephrase your question about research grants.'
            print("🛡️ Guardrail passed - input is safe")
        
        response = bedrock.invoke_model(
            modelId=CLAUDE_MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "system": system_prompt,
                "messages": conversation
            })
        )
        
        print("📥 Parsing Bedrock response...")
        response_body = json.loads(response['body'].read())
        
        content = response_body['content'][0]['text']
        print(f"✅ Claude response: {len(content)} characters")
        print(f"🗣️ Claude full response: {content}")
        return content
        
    except Exception as e:
        print(f"❌ Error calling Claude: {str(e)}")
        import traceback
        print(f"📍 Claude error stack trace: {traceback.format_exc()}")
        return "I apologize, but I'm having trouble processing your request right now. Please try again."

def save_message(session_id: str, user_id: str, role: str, content: str) -> str:
    """Save a message to the chat session"""
    table = dynamodb.Table(CHAT_SESSIONS_TABLE)
    message_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + 'Z'
    
    # Create message object
    message = {
        'messageId': message_id,
        'sessionId': session_id,
        'userId': user_id,
        'role': role,
        'content': content,
        'timestamp': now,
        'toolCalls': []
    }
    
    # Update session with new message
    try:
        table.update_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': f'SESSION#{session_id}'
            },
            UpdateExpression='SET messages = list_append(if_not_exists(messages, :empty_list), :new_message), updatedAt = :now',
            ExpressionAttributeValues={
                ':new_message': [message],
                ':empty_list': [],
                ':now': now
            }
        )
        
        return message_id
        
    except Exception as e:
        print(f"Error saving message: {str(e)}")
        raise e

def is_help_question(message: str) -> bool:
    """Detect if the message is asking for help about the application features"""
    message_lower = message.lower()
    
    # High-priority keywords that should always trigger platform documentation
    platform_keywords = [
        # Development/testing keywords
        'python scripts', 'test scripts', 'testing scripts', 'debug scripts',
        'development tools', 'testing tools', 'debugging tools',
        'test the chat', 'test chat system', 'chat system test',
        'test grant search', 'grant search test', 'test infrastructure',
        'debug infrastructure', 'infrastructure debug', 'scripts available',
        'available scripts', 'python test', 'test python',
        # Platform usage keywords
        'find grants relevant to me', 'find relevant grants', 'grants for me',
        'how to search grants', 'how to find grants', 'search for grants',
        'grant search feature', 'use the search', 'agent selected grants',
        'autonomous discovery', 'how does the platform work', 'platform features',
        'how to use this', 'getting started', 'find opportunities'
    ]
    
    # Check for high-priority platform keywords first
    if any(keyword in message_lower for keyword in platform_keywords):
        print(f"🎯 Platform keyword detected: {message_lower}")
        return True
    
    # Question triggers that indicate user wants to learn about the application
    help_triggers = [
        'how do i', 'how can i', 'how to', 'how does', 'how do you',
        'explain how', 'show me how', 'what is', 'what does', 'what are',
        'what can', 'tell me about', 'explain', 'describe', 'show me',
        'list', 'available', 'help with'
    ]
    
    # Specific application features and UI elements
    app_features = [
        'agent config', 'agent configuration', 'autonomous agent',
        'profile manager', 'user profile', 'profiles',
        'grant search', 'search feature', 'search grants',
        'agent selected grants', 'selected grants', 'discovered grants',
        'proposal generation', 'proposals',
        'navigation', 'left nav', 'menu',
        'bayesian matching', 'bayesian model', 'bayesian', 'relevance scoring', 'scoring algorithm',
        'autonomous discovery', 'agent discovery',
        'real-time search', 'streaming results',
        'filter', 'filtering', 'filters',
        # Development and testing features
        'test', 'testing', 'debug', 'debugging', 'scripts', 'python',
        'chat system', 'chat bot', 'lambda', 'infrastructure', 'utilities',
        'eu grants', 'cleanup', 'logging', 'development'
    ]
    
    # Exclude general research questions that aren't about the app
    exclusions = [
        'grant writing', 'proposal writing', 'research proposal', 'write a proposal',
        'funding opportunities', 'available grants', 'grant deadlines',
        'nih grants', 'nsf grants', 'dod grants',
        'budget', 'timeline', 'methodology',
        'weather', 'cooking', 'general knowledge',
        'quantum computing theory', 'machine learning theory', 'biomedical research theory'
    ]
    
    # Check if message contains help triggers
    has_help_trigger = any(trigger in message_lower for trigger in help_triggers)
    
    # Check if message mentions specific application features
    has_app_feature = any(feature in message_lower for feature in app_features)
    
    # Check if it's a general research question (should NOT trigger docs)
    is_general_research = any(exclusion in message_lower for exclusion in exclusions)
    
    # Special handling for development questions
    if any(dev_word in message_lower for dev_word in ['test', 'debug', 'script', 'python', 'development']):
        # For development questions, be more lenient
        if has_help_trigger or has_app_feature:
            print(f"🔧 Development question detected: {message_lower}")
            return True
    
    # Special case: "search for grants" should trigger if it's about the search feature
    if 'search' in message_lower and any(trigger in message_lower for trigger in ['how do i', 'how can i', 'how to']):
        has_app_feature = True
        is_general_research = False
    
    # Standard logic: trigger if it has help trigger AND app feature AND is not general research
    result = has_help_trigger and has_app_feature and not is_general_research
    
    if result:
        print(f"✅ Help question detected: {message_lower}")
    else:
        print(f"❌ Not a help question: trigger={has_help_trigger}, feature={has_app_feature}, general={is_general_research}")
    
    return result

def fetch_relevant_documentation(message: str) -> List[Dict]:
    """Fetch relevant documentation from S3 based on the message content"""
    if not CHAT_CONTEXT_BUCKET:
        print("⚠️ No chat context bucket configured")
        return []
    
    try:
        # First, try to get the help index
        print(f"📋 Fetching help index from bucket: {CHAT_CONTEXT_BUCKET}")
        relevant_docs = []
        message_lower = message.lower()
        
        try:
            index_response = s3.get_object(
                Bucket=CHAT_CONTEXT_BUCKET,
                Key='help-index.json'
            )
            index_data = json.loads(index_response['Body'].read())
            
            # Check documents in the new index format
            for doc_info in index_data.get('documents', []):
                keywords = doc_info.get('keywords', [])
                filename = doc_info.get('filename', '')
                
                if any(keyword in message_lower for keyword in keywords):
                    print(f"📄 Found relevant doc: {filename}")
                    
                    # Fetch the document content
                    try:
                        doc_response = s3.get_object(
                            Bucket=CHAT_CONTEXT_BUCKET,
                            Key=filename
                        )
                        content = doc_response['Body'].read().decode('utf-8')
                        
                        relevant_docs.append({
                            'title': doc_info.get('title', filename.replace('.md', '').replace('-', ' ').title()),
                            'content': content,
                            'keywords': keywords
                        })
                        
                    except Exception as e:
                        print(f"❌ Error fetching document {filename}: {str(e)}")
            
        except Exception as e:
            print(f"❌ CRITICAL: Could not fetch help-index.json: {str(e)}")
            print(f"   Bucket: {CHAT_CONTEXT_BUCKET}")
            print(f"   This means documentation context is NOT available!")
            # No fallback - if the index doesn't work, we need to know about it
            
            # Check for Bayesian documentation
            if any(keyword in message_lower for keyword in ['bayesian', 'matching', 'scoring', 'algorithm']):
                try:
                    print("📄 Fetching Bayesian matching documentation")
                    doc_response = s3.get_object(
                        Bucket=CHAT_CONTEXT_BUCKET,
                        Key='bayesian-matching.md'
                    )
                    content = doc_response['Body'].read().decode('utf-8')
                    
                    relevant_docs.append({
                        'title': 'Bayesian Matching System',
                        'content': content,
                        'keywords': ['bayesian', 'matching', 'scoring', 'algorithm']
                    })
                    
                except Exception as e:
                    print(f"❌ Error fetching Bayesian documentation: {str(e)}")
        
        print(f"✅ Retrieved {len(relevant_docs)} relevant documents")
        return relevant_docs
        
    except Exception as e:
        print(f"❌ Error fetching documentation: {str(e)}")
        return []

def stream_response(session_id: str, message_id: str, content: str, is_complete: bool):
    """Stream response via AppSync subscription"""
    # This would be implemented with AppSync real-time subscriptions
    # For now, we'll return the response directly
    pass