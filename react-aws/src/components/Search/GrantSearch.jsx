import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';

// Grant Card Component with expandable details
const GrantCard = ({ grant }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Debug: Log grant data to see what budget info is available
  console.log('🔍 DEBUG: Grant card data:', {
    id: grant.id,
    title: grant.title?.substring(0, 50),
    has_detailed_info: grant.has_detailed_info,
    // Check Lambda field naming (awardCeiling/awardFloor)
    awardCeiling: grant.awardCeiling,
    awardFloor: grant.awardFloor,
    // Check enhanced fields
    budget_ceiling: grant.budget_ceiling,
    budget_floor: grant.budget_floor,
    award_amount_detail: grant.award_amount_detail,
    amount: grant.amount,
    description: grant.description || 'NO DESCRIPTION',
    contactEmail: grant.contactEmail || 'NO CONTACT EMAIL'
  });

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#2196f3' }}>
        {grant.title}
      </h4>

      {/* Basic Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        fontSize: '14px',
        marginBottom: '10px'
      }}>
        <p><strong>Agency:</strong> {grant.agency}</p>
        <p><strong>Amount:</strong> {grant.amount}</p>
        <p><strong>Deadline:</strong> {grant.closeDate || grant.deadline || 'Not specified'}</p>
        {grant.matchScore && (
          <p><strong>Match Score:</strong> {Math.round(grant.matchScore * 100)}%</p>
        )}
      </div>

      {/* Enhanced Budget Information */}
      {(grant.awardCeiling || grant.awardFloor || grant.budget_ceiling || grant.budget_floor || grant.award_amount_detail || grant.has_detailed_info) && (
        <div style={{
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#e8f5e8',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>💰 Budget Details:</strong>
          {/* Show awardCeiling (from Lambda) */}
          {grant.awardCeiling && (
            <span style={{ marginLeft: '10px' }}>
              Ceiling: <strong>{grant.awardCeiling}</strong>
              {grant.awardCeiling === '$0' && (
                <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}> (varies)</span>
              )}
            </span>
          )}
          {/* Show awardFloor (from Lambda) */}
          {grant.awardFloor && (
            <span style={{ marginLeft: '10px' }}>
              Floor: <strong>{grant.awardFloor}</strong>
              {grant.awardFloor === '$0' && (
                <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}> (varies)</span>
              )}
            </span>
          )}
          {/* Show enhanced budget info if available */}
          {grant.budget_ceiling && (
            <span style={{ marginLeft: '10px' }}>
              Enhanced Ceiling: <strong>{grant.budget_ceiling}</strong>
            </span>
          )}
          {grant.budget_floor && (
            <span style={{ marginLeft: '10px' }}>
              Enhanced Floor: <strong>{grant.budget_floor}</strong>
            </span>
          )}
          {grant.award_amount_detail && (
            <span style={{ marginLeft: '10px' }}>
              Award: <strong>{grant.award_amount_detail}</strong>
            </span>
          )}
          {/* Show message when no budget info is available */}
          {(!grant.awardCeiling && !grant.awardFloor && !grant.budget_ceiling &&
            !grant.budget_floor && !grant.award_amount_detail && grant.has_detailed_info) && (
              <span style={{ marginLeft: '10px', color: '#666', fontStyle: 'italic' }}>
                Detailed fetch completed, no specific budget amounts available
              </span>
            )}
        </div>
      )}

      {/* Description */}
      {grant.description && (
        <p style={{ fontSize: '14px', color: '#666', margin: '10px 0' }}>
          {grant.description}
        </p>
      )}

      {/* Details Toggle */}
      {grant.has_detailed_info && (
        <div style={{ marginTop: '15px' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showDetails ? '🔼 Hide Details' : '🔽 Show Details'}
          </button>

          {/* Expanded Details */}
          {showDetails && (
            <div style={{
              marginTop: '15px',
              padding: '12px',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px'
            }}>
              <h5 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '16px' }}>📋 Complete Grant Information</h5>

              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

                {/* Left Column: Search Results Data */}
                <div>
                  <h6 style={{
                    margin: '0 0 8px 0',
                    color: '#2196f3',
                    fontSize: '14px',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '4px'
                  }}>
                    🔍 Search Results Data
                  </h6>
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    lineHeight: '1.3'
                  }}>
                    {Object.entries(grant)
                      .filter(([key, value]) =>
                        value !== null &&
                        value !== undefined &&
                        value !== '' &&
                        // Only show basic search fields (from grants.gov API)
                        ['title', 'agency', 'closeDate', 'oppStatus', 'id', 'amount', 'url'].includes(key)
                      )
                      .map(([key, value]) => (
                        <div key={key} style={{
                          marginBottom: '3px',
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            minWidth: '80px',
                            color: '#555',
                            fontSize: '10px'
                          }}>
                            {key}:
                          </span>
                          <span style={{
                            marginLeft: '8px',
                            wordBreak: 'break-word',
                            flex: 1
                          }}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Right Column: Detailed Fetch Data */}
                <div>
                  <h6 style={{
                    margin: '0 0 8px 0',
                    color: '#28a745',
                    fontSize: '14px',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '4px'
                  }}>
                    🎯 Detailed Fetch Data
                  </h6>
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    lineHeight: '1.3'
                  }}>
                    {grant.has_detailed_info ? (
                      Object.entries(grant)
                        .filter(([key, value]) =>
                          value !== null &&
                          value !== undefined &&
                          value !== '' &&
                          // These are fields added by the detailed fetch
                          (['description', 'synopsis', 'eligibility', 'fundingInstrument',
                            'category', 'categoryExplanation', 'cfda', 'awardFloor', 'awardCeiling',
                            'budget_ceiling', 'budget_floor', 'budget_ceiling_raw', 'budget_floor_raw',
                            'award_amount_detail', 'award_amount_raw', 'deadline_detail',
                            'has_budget_ceiling', 'has_budget_floor', 'has_detailed_info',
                            'contactName', 'contactEmail', 'postingDate'].includes(key) ||
                            key.startsWith('detailed_'))
                        )
                        .map(([key, value]) => (
                          <div key={key} style={{
                            marginBottom: '3px',
                            display: 'flex',
                            alignItems: 'flex-start'
                          }}>
                            <span style={{
                              fontWeight: 'bold',
                              minWidth: '80px',
                              color: '#555',
                              fontSize: '10px'
                            }}>
                              {key}:
                            </span>
                            <span style={{
                              marginLeft: '8px',
                              wordBreak: 'break-word',
                              flex: 1
                            }}>
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))
                    ) : (
                      <div style={{
                        color: '#666',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        padding: '20px'
                      }}>
                        No detailed fetch data available
                      </div>
                    )}

                    {/* Show message if no detailed fields found */}
                    {grant.has_detailed_info &&
                      Object.keys(grant).filter(key =>
                        ['description', 'synopsis', 'eligibility', 'fundingInstrument',
                          'category', 'categoryExplanation', 'cfda', 'awardFloor', 'awardCeiling',
                          'budget_ceiling', 'budget_floor', 'budget_ceiling_raw', 'budget_floor_raw',
                          'award_amount_detail', 'award_amount_raw', 'deadline_detail',
                          'has_budget_ceiling', 'has_budget_floor', 'contactName', 'contactEmail',
                          'postingDate'].includes(key) || key.startsWith('detailed_')
                      ).length === 0 && (
                        <div style={{
                          color: '#666',
                          fontStyle: 'italic',
                          textAlign: 'center',
                          padding: '20px',
                          backgroundColor: '#fff3cd',
                          borderRadius: '4px'
                        }}>
                          Detailed fetch completed but no additional fields were extracted.
                          The awardFloor/awardCeiling values shown in search data may have been
                          normalized by the detailed fetch process.
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Expandable Raw JSON */}
              <details style={{ marginTop: '12px' }}>
                <summary style={{
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#666',
                  padding: '4px 0'
                }}>
                  🔧 Show Complete Raw JSON
                </summary>
                <pre style={{
                  fontSize: '9px',
                  backgroundColor: '#f8f9fa',
                  padding: '8px',
                  borderRadius: '4px',
                  marginTop: '5px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  border: '1px solid #e9ecef'
                }}>
                  {JSON.stringify(grant, null, 2)}
                </pre>
              </details>

              <div style={{
                marginTop: '12px',
                padding: '6px 8px',
                backgroundColor: grant.has_detailed_info ? '#e8f5e8' : '#fff3cd',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#666',
                textAlign: 'center'
              }}>
                {grant.has_detailed_info ?
                  '✅ Enhanced with detailed information from Bedrock Agent' :
                  '⚠️ Basic search results only - detailed fetch not available'
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Details Available */}
      {!grant.has_detailed_info && (
        <div style={{
          marginTop: '10px',
          padding: '8px',
          backgroundColor: '#fff3cd',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#856404'
        }}>
          ⚠️ Detailed information not available for this grant
        </div>
      )}
    </div>
  );
};

const GrantSearch = () => {
  // GraphQL subscription system (same as AmplifyGrantSearch)
  const [subscriptionHandles, setSubscriptionHandles] = useState({
    searchEvents: null,
    grantRecords: null,
    euGrantRecords: null
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState('grants.gov'); // 'grants.gov' or 'eu-funding'
  const [searchResults, setSearchResults] = useState({});
  const [activeResultsTab, setActiveResultsTab] = useState('all');

  // Debug logging for searchSource changes
  useEffect(() => {
    console.log('🔍 SEARCH SOURCE CHANGED:', searchSource);
  }, [searchSource]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchStatus, setSearchStatus] = useState('');

  // Real-time state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [eventLog, setEventLog] = useState([]);

  // No refs needed for GraphQL subscriptions

  // GraphQL connection is always available (no separate connection needed)
  const connectionStatus = 'connected';
  const isConnected = true;

  // Helper function to add event logs
  const addEventLog = (type, message) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setEventLog(prev => [logEntry, ...prev.slice(0, 49)]);
  };

  // Helper function to categorize grants client-side
  const categorizeGrants = (grants) => {
    if (!grants || !Array.isArray(grants)) {
      return { all: [], closesoon: [], budget: [], match: [] };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Debug: Log first grant to see what fields are available
    if (grants.length > 0) {
      const firstGrant = grants[0];
      console.log('🔍 DEBUG: First grant fields for categorization:', {
        id: firstGrant.id,
        title: firstGrant.title?.substring(0, 50),
        // Date fields
        closeDate: firstGrant.closeDate,
        deadline: firstGrant.deadline,
        closes: firstGrant.closes,
        // Amount fields  
        amount: firstGrant.amount,
        awardCeiling: firstGrant.awardCeiling,
        budget_ceiling: firstGrant.budget_ceiling,
        budget: firstGrant.budget,
        // Score fields
        matchScore: firstGrant.matchScore,
        relevanceScore: firstGrant.relevanceScore,
        // All available keys
        allKeys: Object.keys(firstGrant)
      });
    }

    const categorized = {
      all: grants,
      closesoon: grants.filter(grant => {
        // Check various deadline field names (expanded for EU grants)
        const deadline = grant.closeDate || grant.deadline || grant.closes ||
          grant.deadlineDate || grant.submissionDeadline || grant.callDeadline;
        if (!deadline) {
          console.log('🔍 DEBUG: No deadline found for grant:', grant.title?.substring(0, 30));
          return false;
        }

        try {
          const deadlineDate = new Date(deadline);
          const isCloseSoon = deadlineDate > now && deadlineDate <= thirtyDaysFromNow;
          if (isCloseSoon) {
            console.log('🔍 DEBUG: Grant closes soon:', grant.title?.substring(0, 30), 'Deadline:', deadline);
          }
          return isCloseSoon;
        } catch (e) {
          console.log('🔍 DEBUG: Invalid deadline format:', deadline, 'for grant:', grant.title?.substring(0, 30));
          return false;
        }
      }),
      budget: grants.filter(grant => {
        // Check for budget/amount information (expanded for EU grants)
        const amount = grant.amount || grant.awardCeiling || grant.budget_ceiling ||
          grant.budget || grant.totalBudget || grant.maxBudget ||
          grant.fundingAmount || grant.maxFunding;

        // For EU grants, if no explicit budget, check if it has detailed funding info in description
        const hasDetailedFunding = !amount && (
          grant.description?.toLowerCase().includes('€') ||
          grant.description?.toLowerCase().includes('eur') ||
          grant.description?.toLowerCase().includes('funding') ||
          grant.summary?.toLowerCase().includes('€') ||
          grant.summary?.toLowerCase().includes('eur')
        );

        if (!amount && !hasDetailedFunding) {
          console.log('🔍 DEBUG: No amount found for grant:', grant.title?.substring(0, 30));
          return false;
        }

        if (amount) {
          // Check if it's a meaningful amount (not just "$0" or "Not specified")
          const amountStr = String(amount).toLowerCase();
          const hasMeaningfulAmount = amountStr !== '$0' &&
            amountStr !== 'not specified' &&
            amountStr !== 'not available' &&
            amountStr !== 'varies' &&
            amountStr !== 'none' &&
            amountStr !== '' &&
            amountStr.length > 1;

          if (hasMeaningfulAmount) {
            console.log('🔍 DEBUG: Grant has budget:', grant.title?.substring(0, 30), 'Amount:', amount);
            return true;
          } else {
            console.log('🔍 DEBUG: Grant has no meaningful budget:', grant.title?.substring(0, 30), 'Amount:', amount);
          }
        }

        // EU grants often have funding info in description but no explicit amount field
        if (hasDetailedFunding) {
          console.log('🔍 DEBUG: EU Grant has funding info in description:', grant.title?.substring(0, 30));
          return true;
        }

        return false;
      }),
      match: grants.filter(grant => {
        // Check for high match scores
        const score = grant.matchScore || grant.relevanceScore;
        if (typeof score === 'number') {
          return score > 0.7; // 70% threshold
        }
        return false;
      })
    };

    console.log('🏷️ Client-side categorization results:', {
      total: grants.length,
      closesoon: categorized.closesoon.length,
      budget: categorized.budget.length,
      match: categorized.match.length
    });

    return categorized;
  };

  // Start GraphQL-based search (same pattern as AmplifyGrantSearch)
  const startSearch = async () => {
    if (!searchQuery.trim()) {
      addEventLog('ERROR', 'Search query is required');
      return;
    }

    // Generate unique session ID
    const sessionId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    setIsSearching(true);
    setSearchProgress(0);
    setSearchResults({});
    setSearchStatus('Initializing search...');

    try {
      addEventLog('INFO', `Starting GraphQL search: "${searchQuery}"`);
      addEventLog('INFO', `Session ID: ${sessionId}`);

      // Prepare search input
      const searchInput = {
        sessionId: sessionId,
        query: searchQuery,
        filters: {
          minAmount: 0,
          maxAmount: null,
          agencies: [],
          categories: []
        },
        sources: searchSource === 'eu-funding' ? ['EU_FUNDING'] : ['GRANTS_GOV']
      };

      // Always use V2 (AgentCore-native) architecture
      const isEuSearch = searchSource === 'eu-funding';
      const mutationName = isEuSearch ? 'startEuGrantSearchV2' : 'startGrantSearchV2';

      console.log(`🚀 GRANTS SEARCH V2: ${isEuSearch ? 'EU' : 'US'} grants search`);
      console.log(`📡 GRANTS SEARCH V2: Mutation: ${mutationName}`);
      console.log(`🎯 GRANTS SEARCH V2: Session: ${sessionId}`);

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

      console.log('📡 GraphQL mutation result:', result);

      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL Error: ${result.errors[0].message}`);
      }

      const responseData = result.data?.[mutationName];
      if (responseData) {
        const response = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

        if (response.eventType === 'SEARCH_STARTED' || response.eventType === 'EU_SEARCH_STARTED') {
          setSearchStatus('Search queued for processing');
          setSearchProgress(10);
          addEventLog('SUCCESS', `Search started: ${response.message}`);

          // Set up GraphQL subscriptions to listen for results
          setupGraphQLSubscriptions(sessionId);
          setIsSearching(true);
        } else if (response.eventType === 'SEARCH_ERROR') {
          throw new Error(response.message || response.error);
        }
      } else {
        throw new Error('No response from search service');
      }

    } catch (error) {
      console.error('❌ Failed to start search:', error);
      addEventLog('ERROR', `Failed to start search: ${error.message}`);
      setIsSearching(false);
    }
  };

  // Set up GraphQL subscriptions (similar to AmplifyGrantSearch)
  const setupGraphQLSubscriptions = (sessionId) => {
    try {
      addEventLog('INFO', `Setting up GraphQL subscriptions for session: ${sessionId}`);

      // Clean up any existing subscriptions
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

      // Set up new subscriptions
      const searchEventSub = subscribeToSearchEvents(sessionId);
      const grantRecordSub = subscribeToGrantRecords(sessionId);
      const euGrantRecordSub = subscribeToEuGrantRecords(sessionId);

      // Store subscription handles
      setSubscriptionHandles({
        searchEvents: searchEventSub,
        grantRecords: grantRecordSub,
        euGrantRecords: euGrantRecordSub
      });

      addEventLog('SUCCESS', 'GraphQL subscriptions established');
    } catch (error) {
      console.error('❌ Failed to setup subscriptions:', error);
      addEventLog('ERROR', `Failed to setup subscriptions: ${error.message}`);
    }
  };

  // Subscribe to SearchEvent updates
  const subscribeToSearchEvents = (sessionId) => {
    try {
      const client = generateClient();

      const subscription = `
        subscription OnCreateSearchEvent($sessionId: String!) {
          onCreateSearchEvent(filter: {sessionId: {eq: $sessionId}}) {
            id
            sessionId
            eventType
            message
            data
            timestamp
          }
        }
      `;

      const observable = client.graphql({
        query: subscription,
        variables: { sessionId }
      });

      const subscriptionHandle = observable.subscribe({
        next: (event) => {
          const eventData = event?.data?.onCreateSearchEvent;
          if (eventData) {
            addEventLog('EVENT', `${eventData.eventType}: ${eventData.message}`);

            if (eventData.eventType === 'PROGRESS') {
              setSearchStatus(eventData.message);
              setSearchProgress(50); // Intermediate progress
            } else if (eventData.eventType === 'GRANTS_FOUND') {
              // Check if categorized data is provided (for EU grants)
              if (eventData.data && eventData.data.categorized) {
                console.log('📊 Received categorized grants from backend:', eventData.data.categorized);
                setSearchResults(eventData.data.categorized);
                setSearchStatus(`Found ${eventData.data.totalGrants} grants (${eventData.data.categorized.closesoon?.length || 0} closing soon, ${eventData.data.categorized.match?.length || 0} matches, ${eventData.data.categorized.budget?.length || 0} with budget)`);
                setSearchProgress(100);
                setIsSearching(false);
                addEventLog('SUCCESS', `Search completed with categorized results: ${eventData.data.totalGrants} total grants`);
              } else {
                // Final results will come via grant record subscriptions (US grants)
                setSearchProgress(90);
                setSearchStatus('Processing results...');
              }
            } else if (eventData.eventType === 'ERROR') {
              setSearchStatus(`Error: ${eventData.message}`);
              setIsSearching(false);
              addEventLog('ERROR', eventData.message);
            }
          }
        },
        error: (error) => {
          console.error('❌ SearchEvent subscription error:', error);
          addEventLog('ERROR', `SearchEvent subscription error: ${error.message}`);
        }
      });

      return () => subscriptionHandle.unsubscribe();
    } catch (error) {
      console.error('❌ Failed to setup SearchEvent subscription:', error);
      return null;
    }
  };

  // Subscribe to GrantRecord updates
  const subscribeToGrantRecords = (sessionId) => {
    try {
      const client = generateClient();

      const subscription = `
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
            relevanceScore
            matchedKeywords
            tags
          }
        }
      `;

      const observable = client.graphql({
        query: subscription,
        variables: { sessionId }
      });

      const subscriptionHandle = observable.subscribe({
        next: (event) => {
          const grantData = event?.data?.onCreateGrantRecord;
          if (grantData) {
            // Convert to grant format and add to results
            const grant = {
              id: grantData.grantId,
              title: grantData.title,
              agency: grantData.agency,
              amount: grantData.amount,
              closeDate: grantData.deadline,
              description: grantData.description,
              matchScore: grantData.relevanceScore || 0.5,
              relevanceScore: grantData.relevanceScore || 0.5
            };

            // Add grant to results and recategorize
            setSearchResults(prev => {
              const allGrants = [...(prev.all || []), grant];
              const categorized = categorizeGrants(allGrants);
              setSearchStatus(`Found ${allGrants.length} grants (${categorized.closesoon.length} closing soon, ${categorized.match.length} matches, ${categorized.budget.length} with budget)`);
              return categorized;
            });

            addEventLog('SUCCESS', `Grant received: ${grant.title}`);
          }
        },
        error: (error) => {
          console.error('❌ GrantRecord subscription error:', error);
          addEventLog('ERROR', `GrantRecord subscription error: ${error.message}`);
        }
      });

      return () => subscriptionHandle.unsubscribe();
    } catch (error) {
      console.error('❌ Failed to setup GrantRecord subscription:', error);
      return null;
    }
  };

  // Subscribe to EuGrantRecord updates
  const subscribeToEuGrantRecords = (sessionId) => {
    try {
      const client = generateClient();

      const subscription = `
        subscription OnCreateEuGrantRecord($sessionId: String!) {
          onCreateEuGrantRecord(filter: {sessionId: {eq: $sessionId}}) {
            id
            sessionId
            grantId
            title
            agency
            amount
            deadline
            description
            relevanceScore
            matchedKeywords
            tags
          }
        }
      `;

      const observable = client.graphql({
        query: subscription,
        variables: { sessionId }
      });

      const subscriptionHandle = observable.subscribe({
        next: (event) => {
          const grantData = event?.data?.onCreateEuGrantRecord;
          if (grantData) {
            // Convert to grant format and add to results
            const grant = {
              id: grantData.grantId,
              title: grantData.title,
              agency: grantData.agency,
              amount: grantData.amount,
              closeDate: grantData.deadline,
              description: grantData.description,
              matchScore: grantData.relevanceScore || 0.5,
              relevanceScore: grantData.relevanceScore || 0.5
            };

            // Add grant to results and recategorize
            setSearchResults(prev => {
              const allGrants = [...(prev.all || []), grant];
              const categorized = categorizeGrants(allGrants);
              setSearchStatus(`Found ${allGrants.length} EU grants (${categorized.closesoon.length} closing soon, ${categorized.match.length} matches, ${categorized.budget.length} with budget)`);
              return categorized;
            });

            addEventLog('SUCCESS', `EU Grant received: ${grant.title}`);
          }
        },
        error: (error) => {
          console.error('❌ EuGrantRecord subscription error:', error);
          addEventLog('ERROR', `EuGrantRecord subscription error: ${error.message}`);
        }
      });

      return () => subscriptionHandle.unsubscribe();
    } catch (error) {
      console.error('❌ Failed to setup EuGrantRecord subscription:', error);
      return null;
    }
  };

  // Stop search and cleanup subscriptions
  const stopSearch = () => {
    // Clean up GraphQL subscriptions
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
    setIsSearching(false);
    setCurrentSessionId(null);
    addEventLog('INFO', 'Search stopped and subscriptions cleaned up');
  };

  // Cleanup subscriptions on component unmount
  useEffect(() => {
    return () => {
      stopSearch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get status color
  const getStatusColor = (status) => {
    switch (status.toUpperCase()) {
      case 'CONNECTED': return 'green';
      case 'CONNECTING': return 'orange';
      case 'FAILED': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>Grant Search</h1>

      {/* Connection Status */}
      <div style={{
        marginBottom: '20px',
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #dee2e6',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>🔌 GraphQL:</span>
        <span style={{
          color: getStatusColor(connectionStatus),
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {connectionStatus.toUpperCase()}
        </span>
        {currentSessionId && (
          <span style={{ fontSize: '12px', color: '#666' }}>
            Session: {currentSessionId.split('-').pop()}
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

        {/* Source Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Grant Source:
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="grants.gov"
                checked={searchSource === 'grants.gov'}
                onChange={(e) => setSearchSource(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <span>🏛️ Grants.gov (US Federal)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="eu-funding"
                checked={searchSource === 'eu-funding'}
                onChange={(e) => setSearchSource(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <span>🇪🇺 EU Funding Portal</span>
            </label>
          </div>
        </div>

        {/* Search Query */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Search Query:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter keywords (e.g., artificial intelligence, renewable energy)"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Search Actions */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={startSearch}
            disabled={isSearching || !isConnected || !searchQuery.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: isSearching ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isSearching ? '🔄 Searching...' : '🚀 Start Search'}
          </button>

          {isSearching && (
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

      {/* Search Progress */}
      {(isSearching || searchProgress > 0) && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          backgroundColor: searchProgress === 100 ? '#e8f5e8' : '#e7f3ff',
          borderRadius: '6px',
          border: `1px solid ${searchProgress === 100 ? '#c3e6c3' : '#b3d9ff'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>📊 Progress:</span>
            <span style={{ fontSize: '14px', color: '#666' }}>{searchProgress}%</span>
            <span style={{ fontSize: '14px' }}>{searchStatus}</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#f0f0f0',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${searchProgress}%`,
              height: '100%',
              backgroundColor: searchProgress === 100 ? '#28a745' : '#007bff',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Tabbed Search Results */}
      {Object.keys(searchResults).length > 0 && (
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
                { id: 'all', label: '📋 All Results', description: 'Complete list' },
                { id: 'closesoon', label: '⏰ Closes Soon', description: 'By deadline' }
              ];

              // Only show budget tab for US grants (grants.gov)
              if (searchSource === 'grants.gov') {
                tabs.push({ id: 'budget', label: '💰 Grant Ceiling', description: 'By budget' });
              }

              tabs.push({ id: 'match', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><img src="/baysesian.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} /> Match Score</span>, description: 'Best matches' });

              console.log('🔍 TAB DEBUG:', { searchSource, tabCount: tabs.length, hasBudgetTab: tabs.some(t => t.id === 'budget') });

              return tabs;
            })().map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveResultsTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '15px 10px',
                  border: 'none',
                  backgroundColor: activeResultsTab === tab.id ? 'white' : 'transparent',
                  color: activeResultsTab === tab.id ? '#2196f3' : '#666',
                  cursor: 'pointer',
                  borderBottom: activeResultsTab === tab.id ? '2px solid #2196f3' : '2px solid transparent',
                  fontSize: '14px',
                  fontWeight: activeResultsTab === tab.id ? 'bold' : 'normal',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeResultsTab !== tab.id) {
                    e.target.style.backgroundColor = '#f0f0f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeResultsTab !== tab.id) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div>{tab.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                  {tab.description}
                </div>
                {searchResults[tab.id] && (
                  <div style={{ fontSize: '11px', marginTop: '2px', color: '#2196f3' }}>
                    ({searchResults[tab.id].length})
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '25px' }}>
            {activeResultsTab && searchResults[activeResultsTab] && (
              <>
                <h3 style={{ margin: '0 0 20px 0' }}>
                  {activeResultsTab === 'all' && '📋 All Search Results'}
                  {activeResultsTab === 'closesoon' && '⏰ Grants Closing Soon'}
                  {activeResultsTab === 'budget' && '💰 Grants with Budget Ceiling'}
                  {activeResultsTab === 'match' && '🎯 Best Match Score'}
                  <span style={{ color: '#666', fontWeight: 'normal', marginLeft: '10px' }}>
                    ({searchResults[activeResultsTab].length} results)
                  </span>
                </h3>

                <div style={{ display: 'grid', gap: '20px' }}>
                  {searchResults[activeResultsTab].map((grant, index) => (
                    <GrantCard key={grant.id || index} grant={grant} />
                  ))}
                </div>
              </>
            )}

            {activeResultsTab && (!searchResults[activeResultsTab] || searchResults[activeResultsTab].length === 0) && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No results available for this filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Log */}
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>📝 Real-time Event Log</h3>
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '10px'
        }}>
          {eventLog.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No events yet...</p>
          ) : (
            eventLog.map((log, index) => (
              <div key={index} style={{
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: log.type === 'ERROR' ? '#ffe6e6' :
                  log.type === 'SUCCESS' ? '#e6ffe6' :
                    log.type === 'EVENT' ? '#fff3e0' : '#f0f0f0',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <span style={{ color: '#666' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{
                  marginLeft: '10px',
                  fontWeight: 'bold',
                  color: log.type === 'ERROR' ? '#d32f2f' :
                    log.type === 'SUCCESS' ? '#388e3c' :
                      log.type === 'EVENT' ? '#f57c00' : '#666'
                }}>
                  [{log.type}]
                </span>
                <span style={{ marginLeft: '10px' }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GrantSearch;