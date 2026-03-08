/**
 * GraphQL-based Grant Search Hook
 * 
 * This hook replaces the Events API with GraphQL subscriptions for real-time grant search.
 * It provides the same interface as useRealtimeGrantSearch but uses Apollo Client.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Helper function to generate session IDs (minimum 33 characters for Bedrock AgentCore)
const generateSessionId = () => {
  const timestamp = Date.now().toString();
  const random1 = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `search_${timestamp}_${random1}${random2}`;
};

export const useGraphQLGrantSearch = (config = {}) => {
  // State management (same interface as Events API version)
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

  // Track loading state manually since we're not using Apollo hooks
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Connection status will be managed by the SearchEvent subscription below

  // Handle real-time events from SearchEvent subscription
  const handleRealtimeEvent = useCallback((searchEvent) => {
    console.log('📨 Received SearchEvent:', searchEvent);

    const { eventType, data } = searchEvent;

    switch (eventType) {
      case 'SEARCH_STARTED':
        setStatus('SEARCHING');
        setProgress(prev => ({ 
          ...prev, 
          currentStep: data?.message || 'Starting grant search...',
          percentage: 0
        }));
        break;

      case 'PROGRESS':
        setProgress(prev => ({
          ...prev,
          currentStep: data?.progress?.message || data?.message || 'Searching...',
          percentage: data?.progress?.percentage || data?.percentage || 50
        }));
        break;

      case 'GRANTS_FOUND':
        setStatus('COMPLETED');
        setProgress(prev => ({
          ...prev,
          currentStep: data?.message || 'Search completed',
          percentage: 100,
          totalGrants: data?.totalGrants || 0
        }));
        
        // Set the grants from the GRANTS_FOUND event
        if (data?.grants && Array.isArray(data.grants)) {
          setGrants(data.grants);
        }
        break;

      case 'SEARCH_ERROR':
      case 'ERROR':
        setStatus('ERROR');
        setError(data?.message || data?.error || 'Search failed');
        setProgress(prev => ({
          ...prev,
          currentStep: 'Search failed',
          percentage: 0
        }));
        break;

      default:
        console.log('📡 Unknown event type:', eventType, data);
    }
  }, []);

  // Set up SearchEvent subscription using proper Amplify client
  useEffect(() => {
    if (!sessionId) return;

    console.log('🔄 Setting up Amplify SearchEvent subscription for session:', sessionId);
    
    let subscription;
    
    const setupSubscription = async () => {
      try {
        // Use Amplify's generateClient instead of Apollo
        const { generateClient } = await import('aws-amplify/data');
        const client = generateClient();
        
        subscription = client.graphql({
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
        }).subscribe({
          next: (event) => {
            console.log('📨 Amplify SearchEvent received:', event);
            if (event.data?.onCreateSearchEvent) {
              handleRealtimeEvent(event.data.onCreateSearchEvent);
            }
          },
          error: (error) => {
            console.error('❌ Amplify SearchEvent subscription error:', error);
            setConnectionStatus('DISCONNECTED');
            setError('Real-time connection error');
          }
        });

        setConnectionStatus('CONNECTED');
        console.log('✅ Amplify subscription established');
        
      } catch (error) {
        console.error('❌ Failed to setup Amplify subscription:', error);
        setConnectionStatus('DISCONNECTED');
        setError('Failed to setup real-time connection');
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
        console.log('🔄 Amplify subscription cleaned up');
      }
    };
  }, [sessionId, handleRealtimeEvent]);

  // Initiate a new grant search
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

      console.log('🔍 Initiating GraphQL grant search:', { filters, source });

      // Generate session ID
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);

      // Prepare search input
      const searchInput = {
        sessionId: newSessionId,
        query: filters.keywords || filters.searchQuery || '',
        filters: {
          minAmount: filters.minAmount,
          maxAmount: filters.maxAmount,
          categories: filters.categories,
          agencies: filters.agencies,
          deadlineAfter: filters.deadlineAfter,
          deadlineBefore: filters.deadlineBefore,
          keywords: filters.keywords ? [filters.keywords] : []
        },
        sources: mapSourceToGraphQL(source)
      };

      console.log('📡 Starting Amplify GraphQL search mutation:', searchInput);

      setSearchLoading(true);

      // Execute GraphQL mutation using Amplify client
      const { generateClient } = await import('aws-amplify/data');
      const client = generateClient();
      
      // Choose the correct mutation based on source
      const isEuSearch = source === 'eu' || source === 'eu-funding';
      const mutationName = isEuSearch ? 'startEuGrantSearch' : 'startGrantSearch';
      
      const result = await client.graphql({
        query: `
          mutation ${isEuSearch ? 'StartEuGrantSearch' : 'StartGrantSearch'}($input: AWSJSON!) {
            ${mutationName}(input: $input)
          }
        `,
        variables: { input: searchInput }
      });

      setSearchLoading(false);

      console.log('🔍 Full GraphQL result:', JSON.stringify(result, null, 2));
      console.log('🔍 result.data:', result.data);
      console.log('🔍 result.data?.startGrantSearch:', result.data?.startGrantSearch);

      const responseData = result.data?.[mutationName];
      if (responseData) {
        const response = responseData;
        console.log('✅ GraphQL search response:', response);
        
        // Parse the JSON response from Lambda
        let parsedResponse;
        try {
          parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
        } catch (e) {
          console.error('Failed to parse Lambda response:', response);
          throw new Error('Invalid response format from search service');
        }
        
        // Check if it's an error response
        if (parsedResponse.eventType === 'SEARCH_ERROR') {
          throw new Error(parsedResponse.message || parsedResponse.error || 'Search failed');
        }
        
        console.log('✅ Search initiated successfully:', parsedResponse);
        return newSessionId;
      } else {
        throw new Error('Failed to start search - no response data');
      }

    } catch (error) {
      console.error('❌ Failed to initiate GraphQL search:', error);
      setStatus('FAILED');
      setError(error.message || 'Failed to initiate search');
      return null;
    }
  }, [startSearchMutation]);

  // Map source parameter to GraphQL enum values
  const mapSourceToGraphQL = (source) => {
    switch (source) {
      case 'us':
      case 'grants.gov':
        return ['GRANTS_GOV', 'NSF', 'NIH', 'DOE'];
      case 'eu':
      case 'eu-funding':
        return ['EU_FUNDING'];
      case 'combined':
        return ['GRANTS_GOV', 'NSF', 'NIH', 'DOE', 'EU_FUNDING'];
      default:
        return ['GRANTS_GOV'];
    }
  };

  // Initiate combined search (US + EU)
  const initiateCombinedSearch = useCallback(async (filters) => {
    return await initiateSearch(filters, 'combined');
  }, [initiateSearch]);

  // Disconnect from session (cleanup)
  const disconnectFromSession = useCallback(() => {
    setSessionId(null);
    setConnectionStatus('DISCONNECTED');
    console.log('✅ Disconnected from GraphQL session');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromSession();
    };
  }, [disconnectFromSession]);

  // Categorize grants (same logic as Events API version)
  const categorizedGrants = useCallback(() => {
    if (!grants.length) {
      return { all: [], closesoon: [], match: [], budget: [] };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    const closesoon = grants.filter(grant => {
      const deadline = grant.deadline || grant.closeDate;
      if (!deadline) return false;
      const deadlineDate = new Date(deadline);
      return deadlineDate <= thirtyDaysFromNow && deadlineDate >= now;
    }).sort((a, b) => {
      const aDate = new Date(a.deadline || a.closeDate);
      const bDate = new Date(b.deadline || b.closeDate);
      return aDate - bDate;
    });

    const match = grants.filter(grant => 
      grant.matchScore && grant.matchScore > 0.7
    ).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    const budget = grants.filter(grant => 
      grant.awardCeiling || grant.awardFloor || grant.amount
    ).sort((a, b) => {
      const aAmount = parseFloat((a.awardCeiling || a.amount || '0').replace(/[^0-9.]/g, '')) || 0;
      const bAmount = parseFloat((b.awardCeiling || b.amount || '0').replace(/[^0-9.]/g, '')) || 0;
      return bAmount - aAmount;
    });

    return {
      all: grants,
      closesoon,
      match,
      budget
    };
  }, [grants]);

  return {
    // State (same interface as Events API version)
    sessionId,
    status,
    grants,
    progress,
    error,
    connectionStatus,
    
    // Actions (same interface as Events API version)
    initiateSearch,
    initiateCombinedSearch,
    disconnectFromSession,
    
    // Computed values (same interface as Events API version)
    isSearching: status === 'SEARCHING' || searchLoading,
    isCompleted: status === 'COMPLETED',
    isFailed: status === 'FAILED',
    isConnected: connectionStatus === 'CONNECTED',
    hasResults: grants.length > 0,
    
    // Additional computed values
    categorizedResults: categorizedGrants(),
    
    // GraphQL-specific values
    searchLoading
  };
};