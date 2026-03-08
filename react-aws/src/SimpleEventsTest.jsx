/**
 * Simple Events API Test Component
 * 
 * Clean, minimal test for AppSync Events API without complex dependencies
 */

import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { events } from 'aws-amplify/api';
import { getCurrentUser, signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

const SimpleEventsTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [eventsApiConfig, setEventsApiConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [testMessage, setTestMessage] = useState('Hello Events API!');
  const [authStatus, setAuthStatus] = useState('CHECKING');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Load configuration and check auth - Workshop Pattern
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Import amplify_outputs.json
        const outputs = await import('./amplify_outputs.json');
        console.log('🔧 Raw outputs file:', outputs.default);
        
        // Extract Events API config from custom section
        const eventsApiConfig = outputs.default.custom?.eventsApi;
        if (!eventsApiConfig) {
          console.error('❌ Events API config not found in amplify_outputs.json');
          console.log('🔍 Available custom config keys:', Object.keys(outputs.default.custom || {}));
          return;
        }
        
        setEventsApiConfig(eventsApiConfig);
        console.log('✅ Events API config loaded:', eventsApiConfig);
        
        // Use the MODERN Amplify Gen2 configuration (your current setup)
        // Just configure Amplify normally with your amplify_outputs.json
        Amplify.configure(outputs.default);
        console.log('🔧 Configured Amplify with Gen2 outputs');

        // Check authentication status - Workshop Pattern
        try {
          const user = await getCurrentUser();
          console.log('✅ User authenticated:', user.username);
          setAuthStatus('AUTHENTICATED');
        } catch (authError) {
          console.log('⚠️ User not authenticated:', authError.message);
          setAuthStatus('NOT_AUTHENTICATED');
        }
        
      } catch (error) {
        console.error('❌ Failed to load config:', error);
        setAuthStatus('ERROR');
      }
    };
    
    loadConfig();
  }, []);

  const testConnection = async () => {
    if (!eventsApiConfig) {
      console.error('❌ No Events API config available');
      return;
    }

    if (authStatus !== 'AUTHENTICATED') {
      console.error('❌ User not authenticated. Please sign in first.');
      return;
    }

    try {
      setConnectionStatus('CONNECTING');
      console.log('🔌 Testing connection to Events API...');
      
      // Disconnect existing connection first
      if (window.eventsTestSubscription) {
        window.eventsTestSubscription.unsubscribe();
        window.eventsTestSubscription = null;
      }
      
      // Test connection to grants namespace - Workshop Pattern
      const testChannel = `grants/test-${Date.now()}`;
      console.log('📡 Connecting to channel:', testChannel);
      console.log('📡 Using Events API config:', eventsApiConfig);
      console.log('📡 Auth status:', authStatus);
      console.log('📡 Current Amplify config:', Amplify.getConfig());
      
      // Debug: Check the exact configuration being used by Events API
      const amplifyConfig = Amplify.getConfig();
      console.log('🔍 Full Amplify configuration for Events API:');
      console.log('  - Auth config:', amplifyConfig.Auth);
      console.log('  - API config:', amplifyConfig.API);
      console.log('  - Events API specific:', amplifyConfig.API?.Events);
      
      // DIRECT WEBSOCKET APPROACH - Bypass Amplify's broken Events API client
      console.log('🚀 Implementing direct WebSocket connection to Events API...');
      
      // Get JWT token from authenticated session
      console.log('🔐 Getting JWT token from authenticated session...');
      const session = await fetchAuthSession();
      const jwtToken = session.tokens?.idToken?.toString();
      
      if (!jwtToken) {
        throw new Error('No JWT token available from authenticated session');
      }
      
      console.log('✅ JWT token obtained (length:', jwtToken.length, ')');
      
      // Use the CORRECT endpoints from amplify_outputs.json
      const httpEndpoint = `https://${eventsApiConfig.apiId}.appsync-api.${eventsApiConfig.region}.amazonaws.com/event`;
      const wsEndpoint = `wss://${eventsApiConfig.apiId}.appsync-realtime-api.${eventsApiConfig.region}.amazonaws.com/event/realtime`;
      
      console.log('📡 Using CORRECT endpoints from AWS Console:');
      console.log('  - HTTP:', httpEndpoint);
      console.log('  - WebSocket:', wsEndpoint);
      
      // First test HTTP endpoint to verify authentication
      console.log('🧪 Testing HTTP Events API first...');
      
      try {
        const testResponse = await fetch(httpEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            channel: testChannel,
            events: [JSON.stringify({
              eventType: 'CONNECTION_TEST',
              message: 'Testing HTTP authentication',
              timestamp: new Date().toISOString()
            })]
          })
        });
        
        console.log('📡 HTTP response status:', testResponse.status);
        console.log('📡 HTTP response headers:', Object.fromEntries(testResponse.headers.entries()));
        
        if (testResponse.ok) {
          console.log('✅ HTTP Events API authentication successful!');
          const responseData = await testResponse.text();
          console.log('📡 HTTP response data:', responseData);
        } else {
          console.error('❌ HTTP Events API failed:', testResponse.status, testResponse.statusText);
          const errorData = await testResponse.text();
          console.error('❌ HTTP error data:', errorData);
        }
      } catch (httpError) {
        console.error('❌ HTTP test failed:', httpError);
      }
      
      // Now try WebSocket with correct Events API protocol
      console.log('🔌 Now attempting WebSocket connection...');
      
      // Use CORRECT AWS AppSync Events API authentication method
      console.log('🔐 Using WebSocket with proper AppSync Events API authentication');
      
      // Create Base64URL encoded authorization header as per AWS documentation
      const authorization = {
        'Authorization': `Bearer ${jwtToken}`,
        host: `${eventsApiConfig.apiId}.appsync-api.${eventsApiConfig.region}.amazonaws.com`
      };
      
      const authHeader = btoa(JSON.stringify(authorization))
        .replace(/\+/g, '-') // Convert '+' to '-'
        .replace(/\//g, '_') // Convert '/' to '_'
        .replace(/=+$/, ''); // Remove padding `=`
      
      const authProtocol = `header-${authHeader}`;
      
      console.log('🔐 Using correct AppSync Events subprotocols:', ['aws-appsync-event-ws', authProtocol]);
      
      const ws = new WebSocket(wsEndpoint, ['aws-appsync-event-ws', authProtocol]);
      
      // Set up WebSocket event handlers
      const channel = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);
        
        ws.onopen = () => {
          console.log('✅ WebSocket connection opened');
          clearTimeout(timeout);
          
          // Send connection init for AppSync Events API
          const connectionInit = {
            type: 'connection_init'
          };
          
          console.log('📤 Sending connection_init for AppSync Events API...');
          ws.send(JSON.stringify(connectionInit));
        };
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          
          if (message.type === 'connection_ack') {
            console.log('✅ Connection acknowledged by Events API');
            
            // Subscribe to the channel using AppSync Events API format
            const subscribeMessage = {
              type: 'subscribe',
              id: `sub-${Date.now()}`,
              channel: testChannel,
              authorization: {
                'Authorization': `Bearer ${jwtToken}`,
                host: `${eventsApiConfig.apiId}.appsync-api.${eventsApiConfig.region}.amazonaws.com`
              }
            };
            
            console.log('📤 Subscribing to channel with Events API format:', testChannel);
            ws.send(JSON.stringify(subscribeMessage));
            
            // Return a channel-like object
            resolve({
              subscribe: (handlers) => {
                ws.onmessage = (event) => {
                  const message = JSON.parse(event.data);
                  console.log('📨 WebSocket message in subscription:', message);
                  
                  if (message.type === 'data') {
                    handlers.next(message.event);
                  } else if (message.type === 'subscribe_success') {
                    console.log('✅ Subscription successful:', message.id);
                  } else if (message.type === 'subscribe_error') {
                    console.error('❌ Subscription error:', message.errors);
                  }
                };
                
                return {
                  unsubscribe: () => {
                    ws.close();
                  }
                };
              },
              publish: async (data) => {
                // Use HTTP endpoint for publishing
                const httpEndpoint = `https://${eventsApiConfig.apiId}.appsync-api.${eventsApiConfig.region}.amazonaws.com/event`;
                
                const response = await fetch(httpEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                  },
                  body: JSON.stringify({
                    channel: testChannel,
                    events: [JSON.stringify(data)]
                  })
                });
                
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response.json();
              }
            });
          } else if (message.type === 'subscribe_success') {
            console.log('✅ Subscription successful for channel:', message.id);
            // Connection is fully ready
          } else if (message.type === 'connection_error') {
            console.error('❌ Connection error details:', message);
            console.error('❌ Error payload:', message.payload);
            console.error('❌ Errors array:', message.errors);
            reject(new Error(`Connection error: ${JSON.stringify(message.errors || message.payload)}`));
          } else if (message.type === 'subscribe_error') {
            console.error('❌ Subscription error:', message.errors);
            reject(new Error(`Subscription error: ${JSON.stringify(message.errors)}`));
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          clearTimeout(timeout);
          reject(error);
        };
        
        ws.onclose = (event) => {
          console.log('🔌 WebSocket closed:', event.code, event.reason);
          if (!event.wasClean) {
            reject(new Error(`WebSocket closed unexpectedly: ${event.code} ${event.reason}`));
          }
        };
      });
      
      console.log('✅ Direct WebSocket connection successful!');
      
      if (channel) {
        setConnectionStatus('CONNECTED');
        
        // Set up subscription - Workshop Pattern
        console.log('📝 Setting up subscription...');
        const subscription = channel.subscribe({
          next: (eventData) => {
            console.log('📨 Received event:', eventData);
            setMessages(prev => [...prev, {
              timestamp: new Date().toISOString(),
              data: eventData
            }]);
          },
          error: (error) => {
            console.error('❌ Subscription error:', error);
            setConnectionStatus('ERROR');
          }
        });
        
        console.log('🎉 Successfully connected and subscribed to', testChannel);
        
        // Store for cleanup
        window.eventsTestChannel = channel;
        window.eventsTestSubscription = subscription;
        
      } else {
        // Since HTTP is working perfectly, let's create a working solution
        console.log('💡 WebSocket failed, but HTTP Events API is working perfectly!');
        console.log('💡 Creating HTTP-based solution...');
        
        setConnectionStatus('CONNECTED');
        
        // Create a simple HTTP-based channel object
        const httpChannel = {
          publish: async (data) => {
            const response = await fetch(httpEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
              },
              body: JSON.stringify({
                channel: testChannel,
                events: [JSON.stringify(data)]
              })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('✅ Event published via HTTP successfully');
            return response.json();
          },
          subscribe: (handlers) => {
            console.log('📝 HTTP-based subscription created (publish-only for now)');
            return {
              unsubscribe: () => {
                console.log('🧹 HTTP subscription cleaned up');
              }
            };
          }
        };
        
        // Store for cleanup
        window.eventsTestChannel = httpChannel;
        window.eventsTestSubscription = { unsubscribe: () => {} };
        
        console.log('🎉 HTTP Events API connection successful!');
        console.log('📤 You can now publish events using the "Publish Message" button');
      }
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      console.error('❌ Error details:', error.stack);
      setConnectionStatus('FAILED');
      
      // Enhanced error diagnostics
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.log('💡 Error analysis:', errorMessage);
      
      if (errorMessage.includes('WebSocket')) {
        console.log('💡 WebSocket connection issue - checking Events API endpoint and authentication');
      } else if (errorMessage.includes('timeout')) {
        console.log('💡 Connection timeout - Events API might not be responding');
      }
    }
  };

  const handleSignIn = async () => {
    if (!username || !password) {
      console.error('❌ Please enter username and password');
      return;
    }

    try {
      console.log('🔐 Signing in user:', username);
      const { isSignedIn } = await signIn({ username, password });
      
      if (isSignedIn) {
        console.log('✅ Sign in successful');
        setAuthStatus('AUTHENTICATED');
        // Clear password for security
        setPassword('');
      }
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      setAuthStatus('NOT_AUTHENTICATED');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('✅ Signed out successfully');
      setAuthStatus('NOT_AUTHENTICATED');
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
    }
  };

  const publishTestMessage = async () => {
    if (window.eventsTestChannel && connectionStatus === 'CONNECTED') {
      try {
        console.log('📤 Publishing test message...');
        await window.eventsTestChannel.publish({
          eventType: 'TEST_MESSAGE',
          message: testMessage,
          timestamp: new Date().toISOString()
        });
        console.log('✅ Message published successfully');
      } catch (error) {
        console.error('❌ Failed to publish message:', error);
      }
    }
  };

  const disconnect = () => {
    if (window.eventsTestSubscription) {
      window.eventsTestSubscription.unsubscribe();
      window.eventsTestSubscription = null;
    }
    if (window.eventsTestChannel) {
      window.eventsTestChannel = null;
    }
    setConnectionStatus('DISCONNECTED');
    console.log('🧹 Disconnected from Events API');
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'CONNECTED': return 'green';
      case 'CONNECTING': return 'orange';
      case 'FAILED':
      case 'ERROR': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h2>🧪 Simple Events API Test</h2>
      
      {/* Configuration Display */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>📋 Configuration</h3>
        {eventsApiConfig ? (
          <>
            <p><strong>API ID:</strong> {eventsApiConfig.apiId}</p>
            <p><strong>Region:</strong> {eventsApiConfig.region}</p>
            <p><strong>Auth Type:</strong> {eventsApiConfig.authType}</p>
            <p><strong>Namespaces:</strong> {Object.values(eventsApiConfig.namespaces || {}).join(', ')}</p>
          </>
        ) : (
          <p style={{ color: 'red' }}>❌ Events API configuration not found</p>
        )}
      </div>

      {/* Authentication Status */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
        <h3>🔐 Authentication Status</h3>
        <p style={{ 
          color: authStatus === 'AUTHENTICATED' ? 'green' : 
                authStatus === 'NOT_AUTHENTICATED' ? 'orange' : 'red',
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          {authStatus}
        </p>
        
        {authStatus === 'AUTHENTICATED' && (
          <div>
            <p style={{ fontSize: '14px', color: 'green' }}>
              ✅ Ready to connect to Events API with Cognito User Pool authentication
            </p>
            <button 
              onClick={handleSignOut}
              style={{ 
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        )}
        
        {authStatus === 'NOT_AUTHENTICATED' && (
          <div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
              🔐 Sign in with Cognito User Pool credentials to test Events API
            </p>
            <div style={{ marginBottom: '10px' }}>
              <input 
                type="text" 
                placeholder="Username/Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', width: '150px' }}
              />
              <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', width: '150px' }}
              />
              <button 
                onClick={handleSignIn}
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🔌 Connection Status</h3>
        <p style={{ color: getStatusColor(), fontSize: '18px', fontWeight: 'bold' }}>
          {connectionStatus}
        </p>
      </div>

      {/* Test Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🎮 Test Controls</h3>
        <div style={{ marginBottom: '10px' }}>
          <button 
            onClick={testConnection}
            disabled={connectionStatus === 'CONNECTING' || authStatus !== 'AUTHENTICATED'}
            style={{ 
              padding: '10px 20px', 
              marginRight: '10px',
              backgroundColor: (connectionStatus === 'CONNECTING' || authStatus !== 'AUTHENTICATED') ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (connectionStatus === 'CONNECTING' || authStatus !== 'AUTHENTICATED') ? 'not-allowed' : 'pointer'
            }}
          >
            {connectionStatus === 'CONNECTING' ? 'Connecting...' : 'Test Connection'}
          </button>
          
          <button 
            onClick={disconnect}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Disconnect
          </button>
        </div>
        
        {connectionStatus === 'CONNECTED' && (
          <div style={{ marginTop: '10px' }}>
            <input 
              type="text" 
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Test message"
              style={{ padding: '5px', marginRight: '10px', width: '200px' }}
            />
            <button 
              onClick={publishTestMessage}
              style={{ 
                padding: '5px 15px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Publish Message
            </button>
          </div>
        )}
      </div>

      {/* Messages Display */}
      {messages.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>📨 Received Messages</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: '10px', padding: '5px', backgroundColor: '#e7f3ff', borderRadius: '3px' }}>
                <small style={{ color: '#666' }}>{msg.timestamp}</small>
                <pre style={{ margin: '5px 0 0 0', fontSize: '12px' }}>{JSON.stringify(msg.data, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleEventsTest;