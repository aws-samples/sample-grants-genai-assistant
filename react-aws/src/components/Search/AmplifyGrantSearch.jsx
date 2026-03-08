/**
 * Amplify-Native Grant Search Component
 * 
 * Uses Amplify's native GraphQL client to connect to our new Initiator + Processor Architecture.
 * No Apollo Client - pure Amplify integration.
 */

import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import GrantDetails from '../GrantDetails';
import { useSearch } from '../../contexts/SearchContext';

// Component for handling long descriptions with expand/collapse
const GrantDescription = ({ description }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description || description === 'No description available') {
    return (
      <div style={{ fontSize: '14px', color: '#999', margin: '10px 0', fontStyle: 'italic' }}>
        No description available
      </div>
    );
  }

  // Clean any remaining HTML and normalize whitespace
  const cleanDescription = description
    .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  const isLong = cleanDescription.length > 250;
  const displayText = isLong && !isExpanded
    ? cleanDescription.substring(0, 250).trim() + '...'
    : cleanDescription;

  return (
    <div style={{
      fontSize: '14px',
      color: '#555',
      margin: '10px 0',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{
        margin: '0 0 5px 0',
        lineHeight: '1.5',
        fontWeight: '500',
        color: '#333',
        fontSize: '13px',
        marginBottom: '8px'
      }}>
        📋 Description
      </div>
      <p style={{ margin: '0 0 5px 0', lineHeight: '1.4' }}>
        {displayText}
      </p>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#2196f3',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '2px 0',
            textDecoration: 'underline',
            marginTop: '5px'
          }}
          onMouseOver={(e) => e.target.style.color = '#1976d2'}
          onMouseOut={(e) => e.target.style.color = '#2196f3'}
        >
          {isExpanded ? '▲ Show less' : '▼ Show more'}
        </button>
      )}
    </div>
  );
};

const AmplifyGrantSearch = () => {
  console.log('🚀 AmplifyGrantSearch component loaded - using FIXED scoring logic');

  // Use persistent search state from context
  const {
    searchQuery,
    setSearchQuery,
    searchSource,
    setSearchSource,
    sessionId,
    setSessionId,
    status,
    setStatus,
    grants,
    setGrants,
    selectedGrant,
    setSelectedGrant,
    categorizedGrants,
    setCategorizedGrants,
  } = useSearch();
  const [activeTab, setActiveTab] = useState('all');
  const [progress, setProgress] = useState({ percentage: 0, message: '' });
  const [amplifyReady] = useState(true); // Always ready since Amplify is configured in App.js
  const [error, setError] = useState(null);
  const [eventLog, setEventLog] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    searchEvents: 'disconnected',
    grantRecords: 'disconnected',
    lastActivity: null
  });
  const [subscriptionHandles, setSubscriptionHandles] = useState({
    searchEvents: null,
    grantRecords: null
  });

  // Update progress message when grants change
  useEffect(() => {
    if (status === 'COMPLETED') {
      if (grants.length > 0) {
        setProgress({ percentage: 100, message: `Found ${grants.length} grants` });
      } else {
        setProgress({ percentage: 100, message: 'Search completed - no matching grants found' });
      }
    }
  }, [grants, status]);



  // Generate session ID (minimum 33 characters for Bedrock AgentCore)
  const generateSessionId = () => {
    const timestamp = Date.now().toString();
    const random1 = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    const sessionId = `search_${timestamp}_${random1}_${random2}`;

    // Ensure minimum 33 characters for Bedrock AgentCore
    if (sessionId.length < 33) {
      const padding = 'x'.repeat(33 - sessionId.length);
      return sessionId + padding;
    }

    console.log('🔧 Generated session ID:', sessionId, `(${sessionId.length} chars)`);
    return sessionId;
  };

  // Validate session ID format
  const validateSessionId = (id) => {
    if (!id) return false;
    if (id.length < 33) return false;
    if (!id.startsWith('search_')) return false;
    return true;
  };

  // Add event to log
  const addEventLog = (type, message) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setEventLog(prev => [logEntry, ...prev.slice(0, 49)]);
  };

  // Cleanup subscriptions on component unmount
  useEffect(() => {
    return () => {
      if (subscriptionHandles.searchEvents) {
        if (typeof subscriptionHandles.searchEvents === 'function') {
          subscriptionHandles.searchEvents(); // Call cleanup function
        } else if (subscriptionHandles.searchEvents.unsubscribe) {
          subscriptionHandles.searchEvents.unsubscribe();
        }
      }
      if (subscriptionHandles.grantRecords) {
        if (typeof subscriptionHandles.grantRecords === 'function') {
          subscriptionHandles.grantRecords(); // Call cleanup function
        } else if (subscriptionHandles.grantRecords.unsubscribe) {
          subscriptionHandles.grantRecords.unsubscribe();
        }
      }
      if (subscriptionHandles.euGrantRecords) {
        if (typeof subscriptionHandles.euGrantRecords === 'function') {
          subscriptionHandles.euGrantRecords(); // Call cleanup function
        } else if (subscriptionHandles.euGrantRecords.unsubscribe) {
          subscriptionHandles.euGrantRecords.unsubscribe();
        }
      }
    };
  }, [subscriptionHandles]);

  // Start grant search using Amplify GraphQL
  const startSearch = async () => {
    console.log('🚀 GRANTS SEARCH V2: startSearch called');
    console.log('🔍 GRANTS SEARCH V2: searchQuery:', searchQuery);
    console.log('🔍 GRANTS SEARCH V2: searchSource:', searchSource);
    console.log('🔍 GRANTS SEARCH V2: amplifyReady:', amplifyReady);

    if (!searchQuery.trim()) {
      console.log('❌ GRANTS SEARCH V2: Empty search query');
      alert('Please enter a search query before submitting.');
      return;
    }

    console.log('✅ GRANTS SEARCH V2: Search query validated');

    if (!amplifyReady) {
      console.log('❌ GRANTS SEARCH V2: Amplify not ready');
      addEventLog('ERROR', 'Amplify not ready. Please wait for initialization.');
      setError('Amplify not available');
      return;
    }

    console.log('✅ GRANTS SEARCH V2: Amplify ready check passed');

    try {
      // Clean up any existing subscriptions FIRST before starting new search
      console.log('🧹 Cleaning up old subscriptions before new search...');
      if (subscriptionHandles.searchEvents) {
        if (typeof subscriptionHandles.searchEvents === 'function') {
          subscriptionHandles.searchEvents();
        } else if (subscriptionHandles.searchEvents.unsubscribe) {
          subscriptionHandles.searchEvents.unsubscribe();
        }
      }
      if (subscriptionHandles.grantRecords) {
        if (typeof subscriptionHandles.grantRecords === 'function') {
          subscriptionHandles.grantRecords();
        } else if (subscriptionHandles.grantRecords.unsubscribe) {
          subscriptionHandles.grantRecords.unsubscribe();
        }
      }
      if (subscriptionHandles.euGrantRecords) {
        if (typeof subscriptionHandles.euGrantRecords === 'function') {
          subscriptionHandles.euGrantRecords();
        } else if (subscriptionHandles.euGrantRecords.unsubscribe) {
          subscriptionHandles.euGrantRecords.unsubscribe();
        }
      }
      setSubscriptionHandles({ searchEvents: null, grantRecords: null, euGrantRecords: null });
      console.log('✅ Old subscriptions cleaned up');

      setError(null);
      setStatus('INITIATING');
      setGrants([]);
      setCategorizedGrants({
        closesoon: [],
        match: [],
        budget: [],
        all: []
      });
      setProgress({ percentage: 0, message: 'Starting search...' });

      // Generate new session ID
      const newSessionId = generateSessionId();

      // Validate the generated session ID
      if (!validateSessionId(newSessionId)) {
        const error = `Invalid session ID generated: ${newSessionId}`;
        console.error('❌', error);
        addEventLog('ERROR', error);
        setError(error);
        return;
      }

      setSessionId(newSessionId);
      console.log('✅ Valid session ID set:', newSessionId);

      addEventLog('INFO', `Starting search: "${searchQuery}"`);
      addEventLog('INFO', `Session ID: ${newSessionId}`);

      // Prepare search input for our Initiator Lambda
      const searchInput = {
        sessionId: newSessionId,
        query: searchQuery,
        filters: {
          minAmount: 0,
          maxAmount: null,
          agencies: [],
          categories: []
        },
        sources: searchSource === 'EU' ? ['EU_FUNDING'] : ['GRANTS_GOV']
      };

      console.log('🚀 Calling Amplify GraphQL mutation:', searchInput);
      console.log('🔍 Input type:', typeof searchInput);
      console.log('🔍 Input JSON:', JSON.stringify(searchInput));

      // Always use V2 (AgentCore-native) architecture
      const isEuSearch = searchSource === 'EU';
      const mutationName = isEuSearch ? 'startEuGrantSearchV2' : 'startGrantSearchV2';

      console.log(`🚀 AMPLIFY GRANTS SEARCH V2: ${isEuSearch ? 'EU' : 'US'} grants search`);
      console.log(`📡 AMPLIFY GRANTS SEARCH V2: Mutation: ${mutationName}`);
      console.log(`🎯 AMPLIFY GRANTS SEARCH V2: Session: ${sessionId}`);

      // Create client for this call
      const client = generateClient();

      const result = await client.graphql({
        query: `
          mutation ${isEuSearch ? 'StartEuGrantSearchV2' : 'StartGrantSearchV2'}($input: AWSJSON!) {
            ${mutationName}(input: $input)
          }
        `,
        variables: {
          input: JSON.stringify(searchInput)
        }
      });

      console.log('------------------ STOP ------------------');
      console.log('📡 Amplify GraphQL result:', result);

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        console.error('❌ GraphQL Errors:', result.errors);
        result.errors.forEach((err, index) => {
          console.error(`GraphQL Error ${index + 1}:`, err);
          addEventLog('ERROR', `GraphQL Error: ${err.message}`);
        });
        throw new Error(`GraphQL Error: ${result.errors[0].message}`);
      }

      const responseData = result.data?.[mutationName];
      if (responseData) {
        const response = typeof responseData === 'string' ?
          JSON.parse(responseData) : responseData;
        console.log('✅ Search response:', response);

        if (response.eventType === 'SEARCH_STARTED' || response.eventType === 'EU_SEARCH_STARTED') {
          setStatus('QUEUED');
          setProgress({
            percentage: 10,
            message: response.message || 'Search queued for processing'
          });
          addEventLog('SUCCESS', `Search started: ${response.message}`);

          // Start listening for real-time updates (old subscriptions already cleaned up)
          console.log('🔄 Starting subscriptions for session:', newSessionId);
          addEventLog('INFO', `Setting up subscriptions for session: ${newSessionId}`);

          // Set up subscriptions with strict error handling
          const searchEventSub = subscribeToSearchEvents(newSessionId);
          const grantRecordSub = subscribeToGrantRecords(newSessionId);
          const euGrantRecordSub = subscribeToEuGrantRecords(newSessionId);

          console.log('📡 Subscription setup results:', {
            searchEventSub: !!searchEventSub,
            grantRecordSub: !!grantRecordSub,
            euGrantRecordSub: !!euGrantRecordSub
          });

          // STRICT: Throw exception if any subscription failed
          if (!searchEventSub) {
            const error = new Error('❌ CRITICAL: SearchEvent subscription failed to initialize');
            console.error(error.message);
            addEventLog('ERROR', error.message);
            throw error;
          }

          if (!grantRecordSub) {
            const error = new Error('❌ CRITICAL: GrantRecord subscription failed to initialize');
            console.error(error.message);
            addEventLog('ERROR', error.message);
            throw error;
          }

          if (!euGrantRecordSub) {
            const error = new Error('❌ CRITICAL: EuGrantRecord subscription failed to initialize');
            console.error(error.message);
            addEventLog('ERROR', error.message);
            throw error;
          }

          // Store subscription handles for cleanup
          setSubscriptionHandles({
            searchEvents: searchEventSub,
            grantRecords: grantRecordSub,
            euGrantRecords: euGrantRecordSub
          });

          console.log('✅ ALL SUBSCRIPTIONS INITIALIZED SUCCESSFULLY');
          addEventLog('SUCCESS', 'All GraphQL subscriptions active - real-time mode enabled');
          setStatus('SEARCHING');
        } else if (response.eventType === 'SEARCH_ERROR') {
          throw new Error(response.message || response.error);
        }
      } else {
        throw new Error('No response from search service');
      }

    } catch (error) {
      console.error('❌ Search failed:', error);

      // Log detailed error information
      if (error.errors) {
        console.error('GraphQL Errors:', error.errors);
        error.errors.forEach((err, index) => {
          console.error(`Error ${index + 1}:`, err);
          addEventLog('ERROR', `GraphQL Error: ${err.message}`);
        });
      }

      setStatus('FAILED');
      setError(error.message || 'Search failed');
      addEventLog('ERROR', `Search failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Subscribe to SearchEvent updates using Amplify GraphQL
  const subscribeToSearchEvents = (sessionId) => {
    console.log('🔄 Setting up SearchEvent subscription for:', sessionId);

    if (!validateSessionId(sessionId)) {
      console.error('❌ Cannot subscribe: Invalid session ID:', sessionId);
      addEventLog('ERROR', `Cannot subscribe: Invalid session ID: ${sessionId}`);
      return null;
    }

    try {
      // Create client directly (like working version)
      const client = generateClient();

      // Use raw GraphQL subscription
      const subscription = `
        subscription OnCreateSearchEvent($sessionId: String!) {
          onCreateSearchEvent(filter: {sessionId: {eq: $sessionId}}) {
            id
            sessionId
            eventType
            data
            timestamp
          }
        }
      `;

      console.log('🔧 Creating SearchEvent subscription with client...');
      console.log('🔧 Variables:', { sessionId });

      // Update subscription status
      setSubscriptionStatus(prev => ({
        ...prev,
        searchEvents: 'connecting',
        lastActivity: new Date().toISOString()
      }));

      const subscriptionHandle = client.graphql({
        query: subscription,
        variables: { sessionId }
      }).subscribe({
        next: (event) => {
          console.log('📨 SearchEvent subscription triggered!');
          console.log('📨 Raw event object:', JSON.stringify(event, null, 2));
          console.log('📨 Event keys:', Object.keys(event || {}));
          console.log('📨 Event.data:', event?.data);
          console.log('📨 Event.data keys:', Object.keys(event?.data || {}));

          const searchEventData = event?.data?.onCreateSearchEvent;
          console.log('📨 Extracted searchEventData:', searchEventData);

          if (searchEventData) {
            console.log('✅ Processing SearchEvent:', searchEventData);
            console.log('🔍 SearchEvent eventType:', searchEventData.eventType);
            console.log('🔍 SearchEvent data:', searchEventData.data);

            handleSearchEvent(searchEventData);
            addEventLog('SUCCESS', `SearchEvent received: ${searchEventData.eventType}`);

            // Update subscription status
            setSubscriptionStatus(prev => ({
              ...prev,
              searchEvents: 'connected',
              lastActivity: new Date().toISOString()
            }));
          } else {
            console.log('❌ No searchEventData found in event');
            console.log('❌ Full event structure:', event);
            addEventLog('WARNING', 'SearchEvent received but no data extracted');
          }
        },
        error: (error) => {
          console.error('❌ SearchEvent subscription error:', error);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          addEventLog('ERROR', `SearchEvent subscription error: ${error.message}`);
        },
        complete: () => {
          console.log('🔚 SearchEvent subscription completed');
          addEventLog('INFO', 'SearchEvent subscription completed');
        }
      });

      // Update subscription status to connected
      setSubscriptionStatus(prev => ({
        ...prev,
        searchEvents: 'connected',
        lastActivity: new Date().toISOString()
      }));

      console.log('✅ SearchEvent subscription established');
      addEventLog('SUCCESS', 'SearchEvent subscription connected');

      return subscriptionHandle;
    } catch (error) {
      console.error('❌ Failed to create SearchEvent subscription:', error);
      addEventLog('ERROR', `Failed to subscribe to search events: ${error.message}`);
      throw new Error(`SearchEvent subscription failed: ${error.message}`);
    }
  };

  // Subscribe to GrantRecord updates using Amplify GraphQL
  const subscribeToGrantRecords = (sessionId) => {
    console.log('🔄 Setting up GrantRecord subscription for:', sessionId);

    if (!validateSessionId(sessionId)) {
      console.error('❌ Cannot subscribe: Invalid session ID:', sessionId);
      addEventLog('ERROR', `Cannot subscribe to grants: Invalid session ID: ${sessionId}`);
      return null;
    }

    try {
      // Create client directly (like working version)
      const client = generateClient();

      // Use raw GraphQL subscription for both CREATE and UPDATE events
      const createSubscription = `
      subscription OnCreateGrantRecord($sessionId: String!) {
        onCreateGrantRecord(filter: {sessionId: {eq: $sessionId}}) {
          id
          sessionId
          grantId
          title
          agency
          amount
          deadline
          description
          eligibility
          applicationProcess
          source
          relevanceScore
          profileMatchScore
          keywordScore
          matchedKeywords
          tags
        }
      }
    `;

      const updateSubscription = `
      subscription OnUpdateGrantRecord($sessionId: String!) {
        onUpdateGrantRecord(filter: {sessionId: {eq: $sessionId}}) {
          id
          sessionId
          grantId
          title
          agency
          amount
          deadline
          description
          eligibility
          applicationProcess
          source
          relevanceScore
          matchedKeywords
          tags
          createdAt
        }
      }
    `;

      console.log('🔧 Creating GrantRecord GraphQL observables...');
      console.log('🔧 Create subscription query:', createSubscription);
      console.log('🔧 Update subscription query:', updateSubscription);
      console.log('🔧 Grant variables:', { sessionId });

      // Update subscription status to connecting
      setSubscriptionStatus(prev => ({
        ...prev,
        grantRecords: 'connecting',
        lastActivity: new Date().toISOString()
      }));

      const createObservable = client.graphql({
        query: createSubscription,
        variables: { sessionId }
      });

      const updateObservable = client.graphql({
        query: updateSubscription,
        variables: { sessionId }
      });

      console.log('🔧 Grant observables created');

      // Handle both create and update events with the same logic
      const handleGrantEvent = (event, eventType) => {
        console.log(`📨 GrantRecord ${eventType} subscription triggered!`);
        console.log('📨 Raw grant event object:', JSON.stringify(event, null, 2));
        console.log('📨 Grant event keys:', Object.keys(event || {}));
        console.log('📨 Grant event.data:', event?.data);
        console.log('📨 Grant event.data keys:', Object.keys(event?.data || {}));

        const grantData = event?.data?.onCreateGrantRecord || event?.data?.onUpdateGrantRecord;
        console.log('📨 Extracted grantData:', grantData);

        if (grantData) {
          console.log(`✅ Processing GrantRecord ${eventType}:`, grantData);

          // Update subscription status to connected on first event
          setSubscriptionStatus(prev => ({
            ...prev,
            grantRecords: 'connected',
            lastActivity: new Date().toISOString()
          }));

          const grant = {
            id: grantData.id,
            grantId: grantData.grantId,
            title: grantData.title,
            agency: grantData.agency,
            amount: grantData.amount,
            deadline: grantData.deadline,
            description: grantData.description,
            eligibility: grantData.eligibility,
            applicationProcess: grantData.applicationProcess,
            source: grantData.source || 'GRANTS_GOV',
            relevanceScore: grantData.relevanceScore || 0.5,
            profileMatchScore: grantData.profileMatchScore,
            keywordScore: grantData.keywordScore,
            matchedKeywords: grantData.matchedKeywords || [],
            tags: grantData.tags || []
          };

          console.log(`✅ ${eventType === 'UPDATE' ? 'Updating' : 'Adding'} grant to state:`, grant);
          console.log('🔍 SCORE DEBUG:', {
            profileMatchScore: grant.profileMatchScore,
            keywordScore: grant.keywordScore,
            relevanceScore: grant.relevanceScore,
            hasProfileScore: grant.profileMatchScore !== undefined && grant.profileMatchScore !== null,
            profileScoreValue: grant.profileMatchScore
          });
          console.log('🔍 SUBSCRIPTION DEBUG - Grant details:', {
            eventType,
            grantId: grant.grantId,
            title: grant.title.substring(0, 40),
            score: grant.relevanceScore,
            scorePercent: (grant.relevanceScore * 100).toFixed(1) + '%',
            sessionId: grant.sessionId || 'NO_SESSION'
          });

          // Special handling for Bayesian score updates
          if (eventType === 'UPDATE') {
            console.log('🧠 Bayesian score update received!', {
              grantId: grant.grantId,
              newScore: grant.relevanceScore,
              title: grant.title.substring(0, 50)
            });
            addEventLog('SUCCESS', `🧠 Bayesian score updated: ${grant.title.substring(0, 30)}... → ${(grant.relevanceScore * 100).toFixed(1)}%`);
          }

          setGrants(prev => {
            if (eventType === 'UPDATE') {
              // Update existing grant
              const existingIndex = prev.findIndex(g => g.grantId === grant.grantId);
              if (existingIndex >= 0) {
                console.log(`🔄 Updating existing grant at index ${existingIndex}:`, grant.grantId);
                const updatedGrants = prev.map(existingGrant =>
                  existingGrant.grantId === grant.grantId ? grant : existingGrant
                );
                updateCategorizedGrants(updatedGrants);
                return updatedGrants;
              } else {
                console.log(`⚠️ UPDATE event for non-existent grant:`, grant.grantId);
                return prev;
              }
            } else {
              // Add new grant - check for duplicates first
              const isDuplicate = prev.some(g => g.grantId === grant.grantId);
              if (isDuplicate) {
                console.log(`⚠️ Duplicate grant detected, skipping:`, grant.grantId);
                return prev;
              }

              console.log(`➕ Adding new grant (${prev.length + 1}):`, grant.grantId);
              const updatedGrants = [...prev, grant];
              updateCategorizedGrants(updatedGrants);

              // Update progress as grants arrive (10% start + up to 80% for grants, final 10% on completion)
              const progressPercentage = Math.min(10 + (updatedGrants.length * 4), 90);
              setProgress({
                percentage: progressPercentage,
                message: `Receiving grants... (${updatedGrants.length})`
              });

              return updatedGrants;
            }
          });
          addEventLog('SUCCESS', `Grant ${eventType === 'UPDATE' ? 'updated' : 'received'}: ${grant.title}`);
        } else {
          console.log('❌ No grantData found in event');
          addEventLog('WARNING', 'GrantRecord received but no data extracted');
        }
      };

      // Subscribe to both create and update events
      const createSubscriptionHandle = createObservable.subscribe({
        next: (event) => handleGrantEvent(event, 'CREATE'),
        error: (error) => {
          console.error('❌ GrantRecord CREATE subscription error:', error);
          addEventLog('ERROR', `Grant CREATE subscription error: ${error.message}`);
        },
        complete: () => {
          console.log('🔚 GrantRecord CREATE subscription completed');
          addEventLog('INFO', 'GrantRecord CREATE subscription completed');
        }
      });

      const updateSubscriptionHandle = updateObservable.subscribe({
        next: (event) => handleGrantEvent(event, 'UPDATE'),
        error: (error) => {
          console.error('❌ GrantRecord UPDATE subscription error:', error);
          addEventLog('ERROR', `Grant UPDATE subscription error: ${error.message}`);
        },
        complete: () => {
          console.log('🔚 GrantRecord UPDATE subscription completed');
          addEventLog('INFO', 'GrantRecord UPDATE subscription completed');
        }
      });

      // Update subscription status to connected
      setSubscriptionStatus(prev => ({
        ...prev,
        grantRecords: 'connected',
        lastActivity: new Date().toISOString()
      }));

      console.log('✅ GrantRecord subscriptions established');
      addEventLog('SUCCESS', 'GrantRecord subscriptions connected');

      // Return cleanup function for both subscriptions
      return () => {
        createSubscriptionHandle.unsubscribe();
        updateSubscriptionHandle.unsubscribe();
      };
    } catch (error) {
      console.error('❌ CRITICAL: GrantRecord subscription setup failed:', error);
      addEventLog('ERROR', `GrantRecord subscription setup failed: ${error.message}`);
      throw new Error(`GrantRecord subscription failed: ${error.message}`);
    }
  };

  // Subscribe to EuGrantRecord updates using Amplify GraphQL
  const subscribeToEuGrantRecords = (sessionId) => {
    console.log('🔄 Setting up EuGrantRecord subscription for:', sessionId);

    if (!validateSessionId(sessionId)) {
      console.error('❌ Cannot subscribe: Invalid session ID:', sessionId);
      addEventLog('ERROR', `Cannot subscribe to EU grants: Invalid session ID: ${sessionId}`);
      return null;
    }

    try {
      // Create client directly (like working version)
      const client = generateClient();

      // Use raw GraphQL subscription for EU grants CREATE events
      const createSubscription = `
      subscription OnCreateEuGrantRecord($sessionId: String!) {
        onCreateEuGrantRecord(filter: {sessionId: {eq: $sessionId}}) {
          id
          sessionId
          grantId
          title
          agency
          amount
          awardCeiling
          awardFloor
          deadline
          description
          eligibility
          applicationProcess
          source
          relevanceScore
          profileMatchScore
          keywordScore
          matchedKeywords
          tags
          euReference
          euIdentifier
          euCallIdentifier
          euCallTitle
          euFrameworkProgramme
          euProgrammePeriod
          euStatus
          euDeadlineModel
          euKeywords
          euCrossCuttingPriorities
          euTypesOfAction
          euLanguage
          euUrl
        }
      }
    `;

      console.log('🔧 EU Create subscription query:', createSubscription);
      console.log('🔧 EU Grant variables:', { sessionId });

      // Set up CREATE subscription
      const createSubscriptionHandle = client.graphql({
        query: createSubscription,
        variables: { sessionId }
      }).subscribe({
        next: (event) => {
          console.log('📨 EU GrantRecord CREATE event received:', event);

          if (event.data?.onCreateEuGrantRecord) {
            const grant = event.data.onCreateEuGrantRecord;

            console.log('✅ New EU grant received:', {
              id: grant.id,
              title: grant.title?.substring(0, 50),
              agency: grant.agency,
              source: grant.source,
              euReference: grant.euReference
            });

            // Add to grants list
            setGrants(prevGrants => {
              const newGrants = [...prevGrants, grant];
              console.log(`📊 Total grants after EU addition: ${newGrants.length}`);

              // Update categorized grants
              updateCategorizedGrants(newGrants);

              // Update progress as grants arrive (10% start + up to 80% for grants, final 10% on completion)
              const progressPercentage = Math.min(10 + (newGrants.length * 4), 90);
              setProgress({
                percentage: progressPercentage,
                message: `Receiving EU grants... (${newGrants.length})`
              });

              return newGrants;
            });

            addEventLog('SUCCESS', `EU Grant received: ${grant.title?.substring(0, 50)}...`);
          }
        },
        error: (error) => {
          console.error('❌ EU GrantRecord CREATE subscription error:', error);
          addEventLog('ERROR', `EU Grant subscription error: ${error.message}`);
        },
        complete: () => {
          console.log('✅ EU GrantRecord CREATE subscription completed');
          addEventLog('INFO', 'EU GrantRecord CREATE subscription completed');
        }
      });

      // Return cleanup function
      return () => {
        createSubscriptionHandle.unsubscribe();
      };
    } catch (error) {
      console.error('❌ CRITICAL: EU GrantRecord subscription setup failed:', error);
      addEventLog('ERROR', `EU Grant subscription setup failed: ${error.message}`);
      throw new Error(`EU GrantRecord subscription failed: ${error.message}`);
    }
  };

  // Handle search status events
  const handleSearchEvent = (searchEvent) => {
    const { eventType, data } = searchEvent;

    console.log('🔄 Processing SearchEvent:', eventType, data);

    switch (eventType) {
      case 'SEARCH_STARTED':
        setStatus('QUEUED');
        setProgress({ percentage: 10, message: 'Search queued' });
        addEventLog('INFO', 'Search queued for processing');
        break;

      case 'SEARCH_PROCESSING':
        setStatus('PROCESSING');
        const progressData = data?.progress || {};
        setProgress({
          percentage: progressData.percentage || 50,
          message: progressData.message || 'Processing search...'
        });
        addEventLog('INFO', progressData.message || 'Processing search');
        break;

      case 'GRANTS_FOUND':
        // Handle the grants found event from the processor Lambda
        const grantsFromEvent = data?.grants || [];
        const totalGrants = data?.totalGrants || grantsFromEvent.length;

        console.log('📊 GRANTS_FOUND event:', { grants: grantsFromEvent.length, totalGrants });

        // Only update grants if we didn't receive them via subscription
        // If we already have grants from subscription, don't overwrite them
        setGrants(prevGrants => {
          if (prevGrants.length > 0) {
            console.log('📊 Keeping existing grants from subscription:', prevGrants.length);
            return prevGrants;
          } else if (grantsFromEvent.length > 0) {
            console.log('📊 Using grants from GRANTS_FOUND event:', grantsFromEvent.length);
            return grantsFromEvent;
          } else {
            console.log('📊 No grants available, keeping empty array');
            return prevGrants;
          }
        });

        setStatus('COMPLETED');
        // Progress message will be updated by useEffect when grants change
        addEventLog('SUCCESS', `Search completed`);

        // Handle subscription cleanup based on whether we have grants to score
        if (totalGrants === 0) {
          // No grants found - clean up subscriptions immediately
          console.log('📊 No grants found - cleaning up subscriptions immediately');
          addEventLog('INFO', 'No grants found - cleaning up subscriptions');

          if (subscriptionHandles.grantRecords) {
            subscriptionHandles.grantRecords();
            setSubscriptionHandles(prev => ({ ...prev, grantRecords: null }));
            setSubscriptionStatus(prev => ({ ...prev, grantRecords: 'disconnected' }));
          }
        } else {
          // Grants found - keep subscriptions alive for Bayesian score updates
          console.log('🧠 Keeping GrantRecord subscription alive for Bayesian score updates...');
          addEventLog('INFO', 'Keeping subscriptions alive for score updates');

          // Set a timeout to disconnect subscriptions after Bayesian scoring should be complete
          setTimeout(() => {
            console.log('⏰ Bayesian scoring timeout - cleaning up subscriptions');
            if (subscriptionHandles.grantRecords) {
              subscriptionHandles.grantRecords();
              setSubscriptionHandles(prev => ({ ...prev, grantRecords: null }));
              setSubscriptionStatus(prev => ({ ...prev, grantRecords: 'disconnected' }));
              addEventLog('INFO', 'GrantRecord subscription cleaned up after Bayesian scoring');
            }
          }, 30000); // 30 seconds should be enough for Bayesian scoring
        }

        // POLLING FALLBACK DISABLED FOR DEBUGGING
        if (subscriptionStatus.grantRecords === 'disconnected' && totalGrants > 0) {
          console.log('🚫 POLLING DISABLED - Subscription disconnected but polling fallback disabled');
          console.log('🔍 GrantRecords subscription status:', subscriptionStatus.grantRecords);
          console.log('🔍 Total grants expected:', totalGrants);
          addEventLog('ERROR', '🚫 Subscription disconnected - polling disabled for debugging');
        }
        break;

      case 'SEARCH_COMPLETE':
      case 'SEARCH_COMPLETED':
        setStatus('COMPLETED');
        setProgress({ percentage: 100, message: `Search completed - ${grants.length} grants found` });
        addEventLog('SUCCESS', `Search completed: ${grants.length} grants found`);

        // Clean up subscriptions after completion
        console.log('🧹 Search complete - cleaning up subscriptions');
        if (subscriptionHandles.searchEvents) {
          if (typeof subscriptionHandles.searchEvents === 'function') {
            subscriptionHandles.searchEvents();
          } else if (subscriptionHandles.searchEvents.unsubscribe) {
            subscriptionHandles.searchEvents.unsubscribe();
          }
        }
        if (subscriptionHandles.grantRecords) {
          if (typeof subscriptionHandles.grantRecords === 'function') {
            subscriptionHandles.grantRecords();
          } else if (subscriptionHandles.grantRecords.unsubscribe) {
            subscriptionHandles.grantRecords.unsubscribe();
          }
        }
        if (subscriptionHandles.euGrantRecords) {
          if (typeof subscriptionHandles.euGrantRecords === 'function') {
            subscriptionHandles.euGrantRecords();
          } else if (subscriptionHandles.euGrantRecords.unsubscribe) {
            subscriptionHandles.euGrantRecords.unsubscribe();
          }
        }
        setSubscriptionHandles({ searchEvents: null, grantRecords: null, euGrantRecords: null });
        setSubscriptionStatus({
          searchEvents: 'disconnected',
          grantRecords: 'disconnected',
          lastActivity: null
        });
        break;

      case 'SEARCH_ERROR':
        setStatus('FAILED');
        setError(data?.message || 'Search failed');
        addEventLog('ERROR', data?.message || 'Search failed');
        break;

      default:
        console.log('📡 Unknown SearchEvent type:', eventType);
    }
  };

  // Stop search and clean up subscriptions
  const stopSearch = () => {
    // Clean up subscriptions
    if (subscriptionHandles.searchEvents) {
      if (typeof subscriptionHandles.searchEvents === 'function') {
        subscriptionHandles.searchEvents(); // Call cleanup function
      } else if (subscriptionHandles.searchEvents.unsubscribe) {
        subscriptionHandles.searchEvents.unsubscribe();
      }
    }
    if (subscriptionHandles.grantRecords) {
      if (typeof subscriptionHandles.grantRecords === 'function') {
        subscriptionHandles.grantRecords(); // Call cleanup function
      } else if (subscriptionHandles.grantRecords.unsubscribe) {
        subscriptionHandles.grantRecords.unsubscribe();
      }
    }
    if (subscriptionHandles.euGrantRecords) {
      if (typeof subscriptionHandles.euGrantRecords === 'function') {
        subscriptionHandles.euGrantRecords(); // Call cleanup function
      } else if (subscriptionHandles.euGrantRecords.unsubscribe) {
        subscriptionHandles.euGrantRecords.unsubscribe();
      }
    }

    setSubscriptionHandles({ searchEvents: null, grantRecords: null });
    setSubscriptionStatus({
      searchEvents: 'disconnected',
      grantRecords: 'disconnected',
      lastActivity: null
    });

    setSessionId(null);
    setStatus('IDLE');
    addEventLog('INFO', 'Search stopped and subscriptions cleaned up');
  };

  // Handle view grant action
  const handleViewGrant = (grant) => {
    console.log('📖 View grant:', grant.title);
    setSelectedGrant(grant);
  };



  // Update categorized grants based on current grants list
  const updateCategorizedGrants = (currentGrants) => {
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    console.log('🔍 Close Soon Debug:', {
      now: now.toISOString(),
      ninetyDaysFromNow: ninetyDaysFromNow.toISOString(),
      totalGrants: currentGrants.length
    });

    const categorized = {
      closesoon: currentGrants.filter(grant => {
        if (!grant.deadline) return false;
        const deadline = new Date(grant.deadline);
        const isCloseSoon = deadline <= ninetyDaysFromNow && deadline >= now;

        // Debug first 3 grants
        if (currentGrants.indexOf(grant) < 3) {
          console.log(`Grant "${grant.title?.substring(0, 40)}":`, {
            deadline: grant.deadline,
            parsed: deadline.toISOString(),
            daysUntil: Math.floor((deadline - now) / (1000 * 60 * 60 * 24)),
            isCloseSoon
          });
        }

        return isCloseSoon;
      }),
      match: currentGrants
        .filter(grant => (grant.profileMatchScore || 0) > 0)  // Show all grants with any profile match score
        .sort((a, b) => (b.profileMatchScore || 0) - (a.profileMatchScore || 0)),  // Sort by highest score first
      budget: currentGrants.filter(grant =>
        (grant.amount && grant.amount > 0) || (grant.awardCeiling && grant.awardCeiling > 0)
      ),
      all: currentGrants
    };

    setCategorizedGrants(categorized);
    console.log('📊 Updated categorized grants:', {
      closesoon: categorized.closesoon.length,
      match: categorized.match.length,
      budget: categorized.budget.length,
      all: categorized.all.length
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return '#28a745';
      case 'PROCESSING':
      case 'QUEUED': return '#ffc107';
      case 'FAILED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>
        🚀 US and EU Grant Search
      </h1>

      {/* Status Display */}
      <div style={{
        marginBottom: '20px',
        padding: '12px 16px',
        backgroundColor: amplifyReady ? '#f8f9fa' : '#fff3cd',
        borderRadius: '6px',
        border: `1px solid ${amplifyReady ? '#dee2e6' : '#ffeaa7'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>🔌 Status:</span>
        <span style={{
          color: amplifyReady ? getStatusColor(status) : '#856404',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {amplifyReady ? status : 'AMPLIFY_NOT_READY'}
        </span>
        {!amplifyReady && (
          <span style={{ fontSize: '12px', color: '#856404' }}>
            Amplify GraphQL initializing...
          </span>
        )}
        {sessionId && (
          <span style={{ fontSize: '12px', color: '#666' }}>
            Session: {sessionId.split('_').pop()}
          </span>
        )}
        {grants.length > 0 && (
          <span style={{ fontSize: '12px', color: '#28a745' }}>
            📊 {grants.length} grants found
          </span>
        )}
      </div>

      {/* Search Form */}
      <div style={{
        marginBottom: '30px',
        padding: '25px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 20px 0' }}>🔍 Search Configuration</h3>

        {/* Source Selection Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Grant Source:
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="US"
                checked={searchSource === 'US'}
                onChange={(e) => setSearchSource(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <span>🇺🇸 US Federal Grants</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="EU"
                checked={searchSource === 'EU'}
                onChange={(e) => setSearchSource(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <span>🇪🇺 EU Funding</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Search Query:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchSource === 'US' ? 'e.g., AI research, renewable energy, cybersecurity' : 'e.g., health research, innovation funding'}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={startSearch}
            disabled={!amplifyReady || status === 'PROCESSING' || status === 'QUEUED' || !searchQuery.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: (!amplifyReady || status === 'PROCESSING' || status === 'QUEUED' || !searchQuery.trim()) ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!amplifyReady || status === 'PROCESSING' || status === 'QUEUED' || !searchQuery.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {!amplifyReady ? 'Amplify Not Ready' :
              !searchQuery.trim() ? 'Enter Search Query' :
                (status === 'PROCESSING' || status === 'QUEUED') ? '🔄 Searching...' : '🚀 Submit Search'}
          </button>

          {(status === 'PROCESSING' || status === 'QUEUED') && (
            <button
              onClick={stopSearch}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ⏹️ Stop Search
            </button>
          )}


        </div>
      </div>

      {/* Subscription Status Debug */}
      <div style={{
        marginBottom: '20px',
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
          🔌 Subscription Status
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
          <span>
            SearchEvents:
            <span style={{
              color: subscriptionStatus.searchEvents === 'connected' ? '#28a745' :
                subscriptionStatus.searchEvents === 'connecting' ? '#ffc107' : '#dc3545',
              fontWeight: '500',
              marginLeft: '5px'
            }}>
              {subscriptionStatus.searchEvents}
            </span>
          </span>
          <span>
            GrantRecords:
            <span style={{
              color: subscriptionStatus.grantRecords === 'connected' ? '#28a745' :
                subscriptionStatus.grantRecords === 'connecting' ? '#ffc107' : '#dc3545',
              fontWeight: '500',
              marginLeft: '5px'
            }}>
              {subscriptionStatus.grantRecords}
            </span>
          </span>
          {subscriptionStatus.lastActivity && (
            <span style={{ color: '#666' }}>
              Last Activity: {new Date(subscriptionStatus.lastActivity).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {progress.percentage > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          backgroundColor: progress.percentage === 100 ? '#e8f5e8' : '#e7f3ff',
          borderRadius: '6px',
          border: `1px solid ${progress.percentage === 100 ? '#c3e6c3' : '#b3d9ff'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>📊 Progress:</span>
            <span style={{ fontSize: '14px', color: '#666' }}>{progress.percentage}%</span>
            <span style={{ fontSize: '14px' }}>{progress.message}</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#f0f0f0',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress.percentage}%`,
              height: '100%',
              backgroundColor: progress.percentage === 100 ? '#28a745' : '#007bff',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Grant Results with Categorized Tabs */}
      {grants.length > 0 && (
        <div style={{
          marginBottom: '30px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #dee2e6',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px 8px 0 0'
          }}>
            {(() => {
              const tabs = [
                { key: 'closesoon', label: '🚨 Close Soon (< 90 days)', count: categorizedGrants.closesoon.length },
                { key: 'match', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><img src="/baysesian.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} /> Profile Match</span>, count: categorizedGrants.match.length }
              ];

              // Show budget tab for both US and EU grants (EU grants now have budget data from OLD API)
              tabs.push({ key: 'budget', label: '💰 With Ceiling', count: categorizedGrants.budget.length });

              tabs.push({ key: 'all', label: '📊 All Results', count: categorizedGrants.all.length });

              return tabs;
            })().map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '15px 20px',
                  border: 'none',
                  backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
                  borderBottom: activeTab === tab.key ? '2px solid #007bff' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                  color: activeTab === tab.key ? '#007bff' : '#666',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '20px' }}>
            {categorizedGrants[activeTab].length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {categorizedGrants[activeTab].map((grant, index) => (
                  <div key={grant.id || index} style={{
                    padding: '20px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#f9f9f9'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                      gap: '15px'
                    }}>
                      <h4 style={{ margin: '0', color: '#2196f3', flex: '1' }}>
                        {grant.title}
                      </h4>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleViewGrant(grant)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#2196f3',
                            backgroundColor: 'transparent',
                            border: '1px solid #2196f3',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#2196f3';
                            e.target.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#2196f3';
                          }}
                        >
                          👁️ View
                        </button>

                      </div>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '15px',
                      fontSize: '14px'
                    }}>
                      <p><strong>Agency:</strong> {grant.agency}</p>
                      <p><strong>Award Ceiling:</strong> {grant.awardCeiling || (grant.amount ? `$${grant.amount.toLocaleString()}` : 'Not specified')}</p>
                      <p><strong>Deadline:</strong> {grant.deadline || 'Not specified'}</p>
                      {grant.openDate && (
                        <p><strong>Open Date:</strong> {grant.openDate}</p>
                      )}
                      {grant.opportunityNumber && (
                        <p><strong>Opportunity #:</strong> {grant.opportunityNumber}</p>
                      )}
                      {/* Show appropriate score based on active tab */}
                      {activeTab === 'match' && grant.profileMatchScore && (
                        <p><strong>Profile Match:</strong> {Math.round(grant.profileMatchScore * 100)}%</p>
                      )}
                      {activeTab === 'all' && grant.keywordScore > 0 && (
                        <p><strong>Keyword Match:</strong> {Math.round(grant.keywordScore * 100)}%</p>
                      )}
                      {activeTab !== 'match' && activeTab !== 'all' && grant.relevanceScore && (
                        <p><strong>Relevance:</strong> {Math.round(grant.relevanceScore * 100)}%</p>
                      )}
                    </div>
                    {grant.description && (
                      <GrantDescription description={grant.description} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#666',
                fontSize: '16px'
              }}>
                {activeTab === 'closesoon' && '🚨 No grants closing within 30 days found'}
                {activeTab === 'match' && '🎯 No grants matching your profile found'}
                {activeTab === 'budget' && '💰 No grants with ceiling information found'}
                {activeTab === 'all' && '📊 No grants found'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Log - Hidden for now */}
      {false && eventLog.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '15px 20px',
            borderBottom: '1px solid #dee2e6',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px 8px 0 0'
          }}>
            <h4 style={{ margin: 0, color: '#333' }}>📋 Event Log</h4>
          </div>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '10px 20px'
          }}>
            {eventLog.map((log, index) => (
              <div key={index} style={{
                padding: '8px 0',
                borderBottom: index < eventLog.length - 1 ? '1px solid #f0f0f0' : 'none',
                fontSize: '13px'
              }}>
                <span style={{
                  color: log.type === 'ERROR' ? '#dc3545' :
                    log.type === 'SUCCESS' ? '#28a745' : '#666',
                  fontWeight: 'bold',
                  marginRight: '8px'
                }}>
                  [{log.type}]
                </span>
                <span style={{ color: '#999', marginRight: '8px' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '6px'
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Grant Details Modal */}
      {selectedGrant && (
        <GrantDetails
          grant={selectedGrant}
          onClose={() => setSelectedGrant(null)}
        />
      )}
    </div>
  );
};

export default AmplifyGrantSearch;