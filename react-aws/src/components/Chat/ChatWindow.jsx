import React, { useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import ReactMarkdown from 'react-markdown';
import './ChatWindow.css';

const client = generateClient();

// GraphQL operations
const SEND_CHAT_MESSAGE = `
  mutation SendChatMessage($sessionId: String, $message: String!) {
    sendChatMessage(sessionId: $sessionId, message: $message) {
      sessionId
      messageId
      content
      isComplete
      toolCalls {
        toolName
        parameters
        result
      }
    }
  }
`;

// Subscription query (currently unused but kept for future implementation)
// const ON_CHAT_RESPONSE = `
//   subscription OnChatResponse($sessionId: ID!) {
//     onChatResponse(sessionId: $sessionId) {
//       sessionId
//       messageId
//       content
//       isComplete
//       toolCalls {
//         toolName
//         parameters
//         result
//       }
//     }
//   }
// `;

const GET_CHAT_SESSION = `
  query GetChatSession($sessionId: ID!) {
  getChatSession(sessionId: $sessionId) {
    sessionId
    userId
    userEmail
    createdAt
    updatedAt
      messages {
      messageId
      role
      content
      timestamp
        toolCalls {
        toolName
        parameters
        result
      }
    }
    context
    summary
  }
}
`;

const LIST_USER_CHAT_SESSIONS = `
  query ListUserChatSessions($limit: Int, $nextToken: String) {
  listUserChatSessions(limit: $limit, nextToken: $nextToken) {
    sessionId
    userEmail
    createdAt
    updatedAt
    summary
  }
}
`;

const ChatWindow = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [chatSessions, setChatSessions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadUserInfo();
    loadChatSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUserInfo = async () => {
    try {
      const user = await getCurrentUser();
      setUserEmail(user.signInDetails?.loginId || user.username || 'User');
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadChatSessions = async () => {
    try {
      const response = await client.graphql({
        query: LIST_USER_CHAT_SESSIONS,
        variables: { limit: 10 }
      });

      // Check for GraphQL errors
      if (response.errors && response.errors.length > 0) {
        const errorMsg = response.errors[0].message;
        console.error('GraphQL error loading chat sessions:', errorMsg);
        // Don't show alert - just log the error
        setChatSessions([]);
        return;
      }

      const sessions = response.data.listUserChatSessions;

      // Handle case where Lambda returns JSON string instead of array
      if (typeof sessions === 'string') {
        try {
          const parsed = JSON.parse(sessions);
          setChatSessions(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error('Failed to parse chat sessions:', e);
          // Don't show alert - just log the error
          setChatSessions([]);
        }
      } else {
        setChatSessions(sessions || []);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      // Don't show alert - just log the error
      setChatSessions([]);
    }
  };

  const loadChatSession = async (sessionId) => {
    try {
      const response = await client.graphql({
        query: GET_CHAT_SESSION,
        variables: { sessionId }
      });

      // Check for GraphQL errors
      if (response.errors && response.errors.length > 0) {
        const errorMsg = response.errors[0].message;
        console.error('GraphQL error loading chat session:', errorMsg);
        alert(`⚠️ Failed to load chat session: ${errorMsg} `);
        return;
      }

      if (response.data.getChatSession) {
        const session = response.data.getChatSession;

        // Handle case where messages might be a JSON string
        let messages = session.messages || [];
        if (typeof messages === 'string') {
          try {
            messages = JSON.parse(messages);
          } catch (e) {
            console.error('Failed to parse messages:', e);
            messages = [];
          }
        }

        setMessages(Array.isArray(messages) ? messages : []);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
      alert(`⚠️ Failed to load chat session: ${error.message || 'Unknown error'} `);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      messageId: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await client.graphql({
        query: SEND_CHAT_MESSAGE,
        variables: {
          sessionId: currentSessionId,
          message: inputMessage
        }
      });

      const assistantMessage = {
        messageId: response.data.sendChatMessage.messageId,
        role: 'assistant',
        content: response.data.sendChatMessage.content,
        timestamp: new Date().toISOString(),
        toolCalls: response.data.sendChatMessage.toolCalls || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentSessionId(response.data.sendChatMessage.sessionId);

      // Refresh sessions list
      loadChatSessions();

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        messageId: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Debug log
  console.log('ChatWindow render - isOpen:', isOpen);

  if (!isOpen) {
    return (
      <div className="chat-toggle" onClick={onToggle}>
        <div className="chat-icon">💬</div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-user-info">
          <span className="user-icon">👤</span>
          <span className="user-email">{userEmail}</span>
          <button onClick={onToggle} className="close-chat-btn" title="Close chat">
            ✕
          </button>
        </div>
        <div className="chat-controls">
          <button onClick={startNewChat} className="new-chat-btn">
            + New Chat
          </button>
        </div>
      </div>

      <div className="chat-sessions">
        {chatSessions.length > 0 && (
          <select
            onChange={(e) => e.target.value && loadChatSession(e.target.value)}
            value={currentSessionId || ''}
            className="session-selector"
          >
            <option value="">Select a previous chat...</option>
            {chatSessions.map(session => (
              <option key={session.sessionId} value={session.sessionId}>
                {session.summary || `Chat from ${new Date(session.createdAt).toLocaleDateString()} `}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.messageId} className={`message ${message.role} `}>
            <div className="message-content">
              {message.role === 'assistant'
                ? <ReactMarkdown>{message.content}</ReactMarkdown>
                : message.content
              }
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="tool-calls">
                  {message.toolCalls.map((tool, index) => (
                    <div key={index} className="tool-call">
                      🔧 Used tool: {tool.toolName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="message-timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me how to set up your profile, configure agent discovery, manage your knowledge base, generate a proposal, or understand your evaluation scores..."
          disabled={isLoading}
          rows={2}
        />
        <button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || isLoading}
          className="send-btn"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;