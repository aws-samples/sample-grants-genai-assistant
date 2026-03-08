/**
 * Real-time Grant Search Hook
 * 
 * This hook manages real-time grant search functionality using AppSync Events.
 * It handles search state management and real-time updates via WebSocket connections.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { events } from 'aws-amplify/api';

export const useRealtimeGrantSearch = (config = {}) => {
  // State management
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('IDLE');
  const [grants, setGrants] = useState([]);
  const [progress, setProgress] = useState({
    totalGrants: 0,
    processedGrants: 0,
    currentStep: '',
    percentage: 0
  });
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');

  // Refs for AppSync Events
  const eventsChannelRef = useRef(null);
  const eventsSubscriptionRef = useRef(null);

  // Handle real-time events
  const handleRealtimeEvent = useCallback((event) => {
    console.log('📨 Received real-time event:', event);

    switch (event.eventType) {
      case 'SEARCH_STARTED':
        setStatus('SEARCHING');
        setProgress(prev => ({ ...prev, currentStep: 'Searching for grants...' }));
        break;

      case 'SEARCH_COMPLETE':
        if (event.data.status === 'ENHANCING') {
          setStatus('ENHANCING');
          setProgress(prev => ({
            ...prev,
            totalGrants: event.data.totalGrants,
            currentStep: 'Enhancing grants with funding details...'
          }));
        } else {
          setStatus('COMPLETED');
          setProgress(prev => ({ ...prev, currentStep: 'Search completed' }));
        }
        break;

      case 'GRANT_RESULT':
        const { grant, progress: grantProgress } = event.data;
        
        setGrants(prevGrants => {
          const existingIndex = prevGrants.findIndex(g => g.id === grant.id);
          if (existingIndex >= 0) {
            const updatedGrants = [...prevGrants];
            updatedGrants[existingIndex] = grant;
            return updatedGrants;
          } else {
            return [...prevGrants, grant];
          }
        });

        setProgress(prev => ({
          ...prev,
          processedGrants: grantProgress.processedGrants,
          percentage: grantProgress.percentage,
          currentStep: `Processing grant ${grantProgress.processedGrants} of ${grantProgress.totalGrants}...`
        }));
        break;

      case 'ENHANCEMENT_COMPLETE':
        setStatus('COMPLETED');
        setProgress(prev => ({
          ...prev,
          processedGrants: event.data.processedGrants,
          percentage: 100,
          currentStep: 'All grants processed successfully'
        }));
        break;

      case 'ERROR':
        setStatus('FAILED');
        setError(event.data.error);
        setProgress(prev => ({ ...prev, currentStep: 'Search failed' }));
        break;

      default:
        console.log('Unknown event type:', event.eventType);
    }
  }, []);

  // Connect to AppSync Events for a session using the correct events API
  const connectToSession = useCallback(async (sessionId, source = 'us') => {
    try {
      setConnectionStatus('CONNECTING');
      console.log('🔗 Connecting to AppSync Events for session:', sessionId, 'source:', source);

      // Using direct import like working app
      console.log('✅ Using events API from direct import (configured globally)');
      
      // Debug: Check Amplify configuration
      const { Amplify } = await import('aws-amplify');
      try {
        const currentConfig = Amplify.getConfig();
        console.log('🔧 Current Amplify config:', JSON.stringify(currentConfig, null, 2));
      } catch (configError) {
        console.log('⚠️ Amplify not configured yet, will configure now');
        const outputs = await import('../amplify_outputs.json');
        Amplify.configure(outputs.default);
      }
      
      // Use appropriate namespace based on source
      const namespace = source === 'eu' ? 'eugrants' : 'grants';
      const channelPath = `${namespace}/${sessionId}`;
      console.log('🚀 Connecting to channel:', channelPath, 'for source:', source);
      
      // Connect directly without complex configuration (like working app)
      console.log('🔌 Calling events.connect()...');
      
      // Add more detailed debugging
      let channel;
      try {
        console.log('🔍 About to call events.connect with:', channelPath);
        console.log('🔍 events object at call time:', events);
        console.log('🔍 events.connect function:', events.connect);
        
        const connectPromise = events.connect(channelPath);
        console.log('📡 events.connect() promise created:', connectPromise);
        console.log('📡 Promise type:', typeof connectPromise);
        console.log('📡 Is Promise?', connectPromise instanceof Promise);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => {
            console.log('⏰ Connection timeout reached');
            reject(new Error('Connection timeout after 10 seconds'));
          }, 10000)
        );
        
        console.log('⏳ Waiting for connection...');
        
        // Check if promise is already rejected
        if (connectPromise.constructor.name === 'Promise') {
          connectPromise.catch(error => {
            console.error('🚨 Connection promise rejected immediately:', error);
            console.error('🚨 Error message:', error.message);
            console.error('🚨 Error stack:', error.stack);
          });
        }
        
        channel = await Promise.race([connectPromise, timeoutPromise]);
        console.log('🎉 Connection successful:', channel);
      } catch (error) {
        console.error('❌ Connection failed:', error);
        console.error('❌ Error details:', error.message, error.stack);
        throw error;
      }
      
      console.log('📡 events.connect() returned:', channel ? 'channel object' : 'null/undefined');
      
      if (!channel) {
        throw new Error('events.connect returned null/undefined');
      }
      
      console.log('✅ Successfully connected to AppSync Events channel');

      // Subscribe to incoming events
      console.log('📝 Setting up subscription...');
      const subscription = channel.subscribe({
        next: (eventData) => {
          console.log('📨 Received AppSync Events message:', eventData);
          
          try {
            // Handle the event data structure matching your working chat example
            // eventData should have an 'event' property containing the actual event data
            let parsedEvent;
            if (eventData.event) {
              // If eventData.event exists, use it (matching your chat pattern)
              parsedEvent = typeof eventData.event === 'string' ? JSON.parse(eventData.event) : eventData.event;
            } else {
              // Fallback: treat eventData as the event itself
              parsedEvent = typeof eventData === 'string' ? JSON.parse(eventData) : eventData;
            }
            console.log('📡 Processing event from source:', parsedEvent.source || source);
            handleRealtimeEvent(parsedEvent);
          } catch (parseError) {
            console.error('❌ Error parsing event:', parseError);
            handleRealtimeEvent({
              eventType: 'ERROR',
              sessionId: sessionId,
              source: source,
              timestamp: new Date().toISOString(),
              data: { 
                status: 'FAILED', 
                error: 'Failed to parse event message' 
              }
            });
          }
        },
        error: (error) => {
          console.error('❌ AppSync Events subscription error:', error);
          setConnectionStatus('DISCONNECTED');
          setError('Real-time connection error');
        }
      });
      
      console.log('📝 Subscription created:', subscription ? 'success' : 'failed');

      // Store references for cleanup
      eventsChannelRef.current = channel;
      eventsSubscriptionRef.current = subscription;
      
      setConnectionStatus('CONNECTED');
      console.log('✅ AppSync Events subscription established for source:', source);
      return true;

    } catch (error) {
      console.error('❌ Failed to connect to AppSync Events:', error);
      setConnectionStatus('DISCONNECTED');
      setError('Failed to connect to real-time updates');
      return false;
    }
  }, [handleRealtimeEvent]);

  // Disconnect from AppSync Events
  const disconnectFromSession = useCallback(() => {
    if (eventsSubscriptionRef.current) {
      eventsSubscriptionRef.current.unsubscribe();
      eventsSubscriptionRef.current = null;
      console.log('✅ Unsubscribed from AppSync Events');
    }
    
    if (eventsChannelRef.current) {
      eventsChannelRef.current = null;
      console.log('✅ Cleared AppSync Events channel reference');
    }
    
    setConnectionStatus('DISCONNECTED');
  }, []);

  // Initiate a new grant search using the existing GraphQL mutation
  const initiateSearch = useCallback(async (filters, source = 'us') => {
    try {
      setError(null);
      setStatus('INITIATED');
      setGrants([]);
      setProgress({
        totalGrants: 0,
        processedGrants: 0,
        currentStep: `Initiating ${source.toUpperCase()} grant search...`,
        percentage: 0
      });

      console.log('🔍 Initiating grant search with filters:', filters, 'source:', source);

      // Configure Amplify
      const { Amplify } = await import('aws-amplify');
      const { fetchAuthSession } = await import('aws-amplify/auth');
      
      try {
        Amplify.getConfig();
      } catch (configError) {
        console.log('🔧 Configuring Amplify...');
        const outputs = await import('../amplify_outputs.json');
        Amplify.configure(outputs.default);
      }
      
      // Generate a unique session ID
      const realSessionId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(realSessionId);
      
      console.log('✅ Generated session ID:', realSessionId, 'source:', source);
      
      // Connect to real-time events first
      const connected = await connectToSession(realSessionId, source);
      if (!connected) {
        throw new Error('Failed to connect to real-time events');
      }
      
      // Use appropriate namespace based on source
      const namespace = source === 'eu' ? 'eugrants' : 'grants';
      const channelPath = `/${namespace}/${realSessionId}`;
      
      console.log('📡 Publishing search request to Events API channel:', channelPath);
      
      // Get auth token for Events API
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      // Load Events API config
      const outputs = await import('../amplify_outputs.json');
      const eventsApi = outputs.default.custom.eventsApi;
      
      // Publish to Events API using HTTP
      const response = await fetch(eventsApi.httpEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: channelPath,
          events: [{
            query: filters.keywords || '',
            searchQuery: filters.keywords || '',
            researcher_profile: {
              research_areas: filters.researchAreas || ['Research'],
              keywords: filters.keywords ? [filters.keywords] : ['research']
            },
            filters: {
              keywords: filters.keywords,
              region: filters.region || 'US',
              deadline: filters.deadline,
              source: source
            },
            sessionId: realSessionId,
            timestamp: new Date().toISOString()
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Events API publish failed: ${response.status} - ${errorText}`);
      }

      console.log('✅ Search request published to Events API');
      
      return realSessionId;

    } catch (error) {
      console.error('❌ Failed to initiate search:', error);
      setStatus('FAILED');
      setError(error.message || 'Failed to initiate search');
      return null;
    }
  }, [connectToSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromSession();
    };
  }, [disconnectFromSession]);

  // Initiate a combined search (US + EU grants)
  const initiateCombinedSearch = useCallback(async (filters) => {
    try {
      setError(null);
      setStatus('INITIATED');
      setGrants([]);
      setProgress({
        totalGrants: 0,
        processedGrants: 0,
        currentStep: 'Initiating combined grant search...',
        percentage: 0
      });

      console.log('🔍 Initiating combined grant search with filters:', filters);

      // For combined search, we'll connect to the combined channel
      // The backend will handle coordinating both US and EU searches
      const sessionId = await initiateSearch(filters, 'combined');
      
      return sessionId;

    } catch (error) {
      console.error('❌ Failed to initiate combined search:', error);
      setStatus('FAILED');
      setError(error.message || 'Failed to initiate combined search');
      return null;
    }
  }, [initiateSearch]);

  return {
    // State
    sessionId,
    status,
    grants,
    progress,
    error,
    connectionStatus,
    
    // Actions
    initiateSearch,           // Single source search (us/eu)
    initiateCombinedSearch,   // Combined search (us + eu)
    disconnectFromSession,
    
    // Computed values
    isSearching: status === 'SEARCHING' || status === 'ENHANCING',
    isCompleted: status === 'COMPLETED',
    isFailed: status === 'FAILED',
    isConnected: connectionStatus === 'CONNECTED',
    hasResults: grants.length > 0
  };
};