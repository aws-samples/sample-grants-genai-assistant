/**
 * GraphQL-based Grant Search Component
 * 
 * This replaces the Events API version with GraphQL subscriptions.
 * Maintains the same UI and functionality but uses Apollo Client.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGraphQLGrantSearch } from '../../hooks/useGraphQLGrantSearch';
import { useGraphQL } from '../../contexts/GraphQLContext';

// Grant Card Component (same as original but with GraphQL data)
const GrantCard = ({ grant }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Debug: Log grant data to see what we're getting from GraphQL
  console.log('🔍 DEBUG: GraphQL Grant card data:', {
    id: grant.id,
    title: grant.title?.substring(0, 50),
    hasDetailedInfo: grant.hasDetailedInfo,
    awardCeiling: grant.awardCeiling,
    awardFloor: grant.awardFloor,
    amount: grant.amount,
    source: grant.source,
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
        <p><strong>Award Ceiling:</strong> {grant.amount}</p>
        <p><strong>Deadline:</strong> {grant.closeDate || grant.deadline || 'Not specified'}</p>
        <p><strong>Source:</strong> {grant.source}</p>
        {grant.matchScore && (
          <p><strong>Match Score:</strong> {Math.round(grant.matchScore * 100)}%</p>
        )}
      </div>

      {/* Enhanced Budget Information */}
      {(grant.awardCeiling || grant.awardFloor || grant.hasDetailedInfo) && (
        <div style={{ 
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#e8f5e8',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>💰 Budget Details:</strong>
          {grant.awardCeiling && (
            <span style={{ marginLeft: '10px' }}>
              Ceiling: <strong>{grant.awardCeiling}</strong>
            </span>
          )}
          {grant.awardFloor && (
            <span style={{ marginLeft: '10px' }}>
              Floor: <strong>{grant.awardFloor}</strong>
            </span>
          )}
          {grant.hasDetailedInfo && !grant.awardCeiling && !grant.awardFloor && (
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

      {/* Synopsis */}
      {grant.synopsis && grant.synopsis !== grant.description && (
        <p style={{ fontSize: '14px', color: '#555', margin: '10px 0', fontStyle: 'italic' }}>
          <strong>Synopsis:</strong> {grant.synopsis}
        </p>
      )}

      {/* Eligibility */}
      {grant.eligibility && (
        <p style={{ fontSize: '14px', color: '#555', margin: '10px 0' }}>
          <strong>Eligibility:</strong> {grant.eligibility}
        </p>
      )}

      {/* Contact Information */}
      {(grant.contactName || grant.contactEmail) && (
        <div style={{ 
          marginTop: '10px',
          padding: '8px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>📧 Contact:</strong>
          {grant.contactName && <span style={{ marginLeft: '8px' }}>{grant.contactName}</span>}
          {grant.contactEmail && (
            <span style={{ marginLeft: '8px' }}>
              <a href={`mailto:${grant.contactEmail}`} style={{ color: '#1976d2' }}>
                {grant.contactEmail}
              </a>
            </span>
          )}
        </div>
      )}

      {/* Details Toggle */}
      {grant.hasDetailedInfo && (
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
              <h5 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '16px' }}>
                📋 Complete Grant Information
              </h5>
              
              {/* Grant Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                
                {/* Left Column: Core Information */}
                <div>
                  <h6 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#2196f3', 
                    fontSize: '14px',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '4px'
                  }}>
                    🎯 Core Information
                  </h6>
                  <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                    {grant.opportunityId && (
                      <p><strong>Opportunity ID:</strong> {grant.opportunityId}</p>
                    )}
                    {grant.category && (
                      <p><strong>Category:</strong> {grant.category}</p>
                    )}
                    {grant.fundingInstrument && (
                      <p><strong>Funding Instrument:</strong> {grant.fundingInstrument}</p>
                    )}
                    {grant.postingDate && (
                      <p><strong>Posted:</strong> {new Date(grant.postingDate).toLocaleDateString()}</p>
                    )}
                    {grant.closeDate && (
                      <p><strong>Closes:</strong> {new Date(grant.closeDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Additional Details */}
                <div>
                  <h6 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#28a745', 
                    fontSize: '14px',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '4px'
                  }}>
                    📊 Additional Details
                  </h6>
                  <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                    <p><strong>Source:</strong> {grant.source}</p>
                    <p><strong>Has Detailed Info:</strong> {grant.hasDetailedInfo ? 'Yes' : 'No'}</p>
                    {grant.matchScore && (
                      <p><strong>Match Score:</strong> {(grant.matchScore * 100).toFixed(1)}%</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw JSON Toggle */}
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
                backgroundColor: grant.hasDetailedInfo ? '#e8f5e8' : '#fff3cd',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#666',
                textAlign: 'center'
              }}>
                {grant.hasDetailedInfo ? 
                  '✅ Enhanced with detailed information from GraphQL API' : 
                  '⚠️ Basic search results only - detailed fetch not available'
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Details Available */}
      {!grant.hasDetailedInfo && (
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

      {/* View Details Link - Handle both US and EU grants */}
      {(grant.url || grant.euUrl) && (
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
          <a
            href={grant.url || grant.euUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: grant.source === 'EU_FUNDING' ? '#28a745' : '#2196f3',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = grant.source === 'EU_FUNDING' ? '#218838' : '#1976d2';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = grant.source === 'EU_FUNDING' ? '#28a745' : '#2196f3';
            }}
          >
            {grant.source === 'EU_FUNDING' ? '🇪🇺 View EU Grant Portal' : '🔗 View Grant Details'}
          </a>
        </div>
      )}
    </div>
  );
};

const GraphQLGrantSearch = () => {
  // Use GraphQL context
  const { connectionStatus, error: connectionError, isConnected } = useGraphQL();
  
  // Use GraphQL grant search hook
  const {
    sessionId,
    status,
    grants,
    progress,
    error,
    isSearching,
    isCompleted,
    isFailed,
    hasResults,
    categorizedResults,
    initiateSearch,
    initiateCombinedSearch,
    disconnectFromSession
  } = useGraphQLGrantSearch();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState('grants.gov');
  const [activeResultsTab, setActiveResultsTab] = useState('all');
  const [eventLog, setEventLog] = useState([]);
  
  // Initialize event log when connection status changes
  useEffect(() => {
    if (connectionStatus === 'connected') {
      addEventLog('SUCCESS', 'Connected to GraphQL API');
    } else if (connectionStatus === 'failed' && connectionError) {
      addEventLog('ERROR', `Connection failed: ${connectionError}`);
    }
  }, [connectionStatus, connectionError]);

  // Log search status changes
  useEffect(() => {
    if (status !== 'IDLE') {
      addEventLog('INFO', `Search status: ${status}`);
    }
  }, [status]);

  // Log errors
  useEffect(() => {
    if (error) {
      addEventLog('ERROR', error);
    }
  }, [error]);

  // Helper function to add event logs
  const addEventLog = (type, message) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setEventLog(prev => [logEntry, ...prev.slice(0, 49)]);
  };

  // Start GraphQL search
  const startSearch = async () => {
    if (!isConnected) {
      addEventLog('ERROR', 'Not connected to GraphQL API');
      return;
    }

    if (!searchQuery.trim()) {
      addEventLog('ERROR', 'Search query is required');
      return;
    }

    try {
      addEventLog('INFO', `Starting GraphQL search: "${searchQuery}" on ${searchSource}`);
      
      const filters = {
        keywords: searchQuery,
        searchQuery: searchQuery
      };

      let sessionId;
      if (searchSource === 'combined') {
        sessionId = await initiateCombinedSearch(filters);
      } else {
        const source = searchSource === 'eu-funding' ? 'eu' : 'us';
        sessionId = await initiateSearch(filters, source);
      }

      if (sessionId) {
        addEventLog('SUCCESS', `GraphQL search initiated with session: ${sessionId}`);
      } else {
        addEventLog('ERROR', 'Failed to initiate search');
      }
    } catch (error) {
      console.error('❌ Failed to start GraphQL search:', error);
      addEventLog('ERROR', `Failed to start search: ${error.message}`);
    }
  };

  // Stop search
  const stopSearch = () => {
    disconnectFromSession();
    addEventLog('INFO', 'GraphQL search stopped');
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'green';
      case 'connecting': return 'orange';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>
        🚀 GraphQL Grant Search
        <span style={{ fontSize: '14px', color: '#666', marginLeft: '15px' }}>
          (Powered by Apollo Client)
        </span>
      </h1>
      
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
        <span style={{ fontSize: '14px', fontWeight: '500' }}>🔌 GraphQL Connection:</span>
        <span style={{ 
          color: getStatusColor(connectionStatus), 
          fontSize: '14px', 
          fontWeight: 'bold'
        }}>
          {connectionStatus.toUpperCase()}
        </span>
        {connectionError && (
          <span style={{ color: 'red', fontSize: '12px' }}>
            Error: {connectionError}
          </span>
        )}
        {sessionId && (
          <span style={{ fontSize: '12px', color: '#666' }}>
            Session: {sessionId.split('_').pop()}
          </span>
        )}
        <span style={{ fontSize: '12px', color: '#28a745' }}>
          ✨ Real-time subscriptions active
        </span>
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
        <h3 style={{ margin: '0 0 20px 0' }}>🔍 GraphQL Search Configuration</h3>
        
        {/* Source Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Grant Source:
          </label>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="combined"
                checked={searchSource === 'combined'}
                onChange={(e) => setSearchSource(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <span>🌍 Combined Search (US + EU)</span>
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
            placeholder="Enter keywords (e.g., artificial intelligence, climate change)"
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
            {isSearching ? '🔄 Searching via GraphQL...' : '🚀 Start GraphQL Search'}
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
      {(isSearching || progress.percentage > 0) && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px 16px', 
          backgroundColor: progress.percentage === 100 ? '#e8f5e8' : '#e7f3ff', 
          borderRadius: '6px',
          border: `1px solid ${progress.percentage === 100 ? '#c3e6c3' : '#b3d9ff'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>📊 GraphQL Progress:</span>
            <span style={{ fontSize: '14px', color: '#666' }}>{progress.percentage}%</span>
            <span style={{ fontSize: '14px' }}>{progress.currentStep}</span>
            {progress.totalGrants > 0 && (
              <span style={{ fontSize: '12px', color: '#666' }}>
                ({progress.processedGrants}/{progress.totalGrants} grants)
              </span>
            )}
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

      {/* Tabbed Search Results */}
      {hasResults && (
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
            {[
              { id: 'all', label: '📋 All Results', description: 'Complete list' },
              { id: 'closesoon', label: '⏰ Closes Soon', description: 'By deadline' },
              { id: 'budget', label: '💰 Grant Ceiling', description: 'By budget' },
              { id: 'match', label: '🎯 Match Score', description: 'Best matches' }
            ].map((tab) => (
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
              >
                <div>{tab.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                  {tab.description}
                </div>
                {categorizedResults[tab.id] && (
                  <div style={{ fontSize: '11px', marginTop: '2px', color: '#2196f3' }}>
                    ({categorizedResults[tab.id].length})
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '20px' }}>
            {categorizedResults[activeResultsTab] && categorizedResults[activeResultsTab].length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {categorizedResults[activeResultsTab].map((grant, index) => (
                  <GrantCard key={grant.id || index} grant={grant} />
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#666',
                fontSize: '16px'
              }}>
                No grants found in this category
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Log */}
      {eventLog.length > 0 && (
        <div style={{ 
          marginTop: '30px',
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
            <h4 style={{ margin: 0, color: '#333' }}>📋 GraphQL Event Log</h4>
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
    </div>
  );
};

export default GraphQLGrantSearch;