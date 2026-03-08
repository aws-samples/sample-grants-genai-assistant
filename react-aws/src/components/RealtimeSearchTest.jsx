import React, { useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/data';

const RealtimeSearchTest = () => {
  const [searchStatus, setSearchStatus] = useState('Ready to search');
  const [searchProgress, setSearchProgress] = useState(0);
  const [grants, setGrants] = useState([]);
  const [events, setEvents] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sessionId, setSessionId] = useState('');
  
  const client = generateClient();
  const subscriptionRef = useRef(null);

  // Generate session ID on component mount
  useEffect(() => {
    const newSessionId = `grant-search-${Date.now()}`;
    setSessionId(newSessionId);
  }, []);

  // Set up subscription when sessionId is available
  useEffect(() => {
    if (!sessionId) return;

    console.log('🔄 Setting up subscription for session:', sessionId);
    
    const subscription = client.graphql({
      query: `
        subscription OnCreateSearchEvent($sessionId: String!) {
          onCreateSearchEvent(filter: {sessionId: {eq: $sessionId}}) {
            id
            sessionId
            eventType
            data
            timestamp
          }
        }
      `,
      variables: { sessionId }
    });

    subscriptionRef.current = subscription.subscribe({
      next: (event) => {
        console.log('📨 Received search event:', event);
        const searchEvent = event.data.onCreateSearchEvent;
        
        // Add to events log
        setEvents(prev => [...prev, searchEvent]);
        
        // Update UI based on event type
        switch (searchEvent.eventType) {
          case 'search_started':
            setSearchStatus('🔄 Starting grant search...');
            setSearchProgress(0);
            break;
            
          case 'progress':
            const progress = searchEvent.data?.progress || 50;
            setSearchProgress(progress);
            setSearchStatus(searchEvent.data?.message || 'Searching...');
            break;
            
          case 'search_complete':
            setSearchProgress(100);
            setSearchStatus(`✅ Found ${searchEvent.data?.totalGrants || 0} grants!`);
            if (searchEvent.data?.grants) {
              setGrants(searchEvent.data.grants);
            }
            setIsSearching(false);
            break;
            
          case 'error':
            setSearchStatus(`❌ Search error: ${searchEvent.data?.message || 'Unknown error'}`);
            setIsSearching(false);
            break;
            
          default:
            setSearchStatus(`📡 Event: ${searchEvent.eventType}`);
        }
      },
      error: (error) => {
        console.error('❌ Subscription error:', error);
        setSearchStatus('❌ Subscription connection failed');
      }
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [sessionId, client]);

  const startGrantSearch = async () => {
    if (!sessionId) {
      alert('Session ID not ready');
      return;
    }

    setIsSearching(true);
    setSearchStatus('🚀 Initiating grant search...');
    setSearchProgress(0);
    setGrants([]);
    setEvents([]);

    try {
      const searchInput = {
        sessionId: sessionId,
        researcherProfile: {
          name: "Research Scientist",
          expertise: ["artificial intelligence", "machine learning", "data science", "computer science"],
          institution: "Research University",
          budget: 5000000,
          duration: 48
        },
        searchCriteria: {
          keywords: ["artificial intelligence", "machine learning", "research", "technology"],
          agencies: ["NSF", "NIH", "DOE"],
          maxBudget: 10000000
        }
      };

      console.log('🚀 Starting grant search with input:', searchInput);

      const response = await client.graphql({
        query: `
          mutation StartGrantSearch($input: AWSJSON!) {
            startGrantSearch(input: $input)
          }
        `,
        variables: {
          input: JSON.stringify(searchInput)
        }
      });

      console.log('✅ Search mutation response:', response);
      
    } catch (error) {
      console.error('❌ Search error:', error);
      setSearchStatus(`❌ Search failed: ${error.message}`);
      setIsSearching(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        {/* Header */}
        <div style={{
          padding: '15px 20px',
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px 8px 0 0'
        }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
            🎯 Real-time Grant Search Test
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Testing the complete architecture: React → GraphQL → Lambda → AgentCore → Subscriptions
          </p>
        </div>

        {/* Search Controls */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={startGrantSearch}
              disabled={isSearching || !sessionId}
              style={{
                padding: '12px 24px',
                backgroundColor: isSearching ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {isSearching ? '🔄 Searching...' : '🚀 Start Grant Search'}
            </button>
            
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              Session ID: {sessionId}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
              {searchStatus}
            </div>
            <div style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#e9ecef',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${searchProgress}%`,
                height: '100%',
                backgroundColor: searchProgress === 100 ? '#28a745' : '#007bff',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              Progress: {searchProgress}%
            </div>
          </div>

          {/* Events Log */}
          <div style={{ marginBottom: '20px' }}>
            <h4>📡 Real-time Events ({events.length})</h4>
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '10px'
            }}>
              {events.length === 0 ? (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  No events yet. Start a search to see real-time updates.
                </div>
              ) : (
                events.map((event, index) => (
                  <div key={index} style={{
                    marginBottom: '8px',
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#007bff' }}>
                      {event.eventType} - {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{ color: '#666' }}>
                      {JSON.stringify(event.data, null, 2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Results */}
          {grants.length > 0 && (
            <div>
              <h4>🎯 Grants Found ({grants.length})</h4>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {grants.map((grant, index) => (
                  <div key={index} style={{
                    marginBottom: '10px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      {grant.title || `Grant ${index + 1}`}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Agency: {grant.agency || 'TBD'} | 
                      Award Ceiling: ${grant.amount?.toLocaleString() || 'TBD'} |
                      Match: {grant.matchScore || 'N/A'}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeSearchTest;