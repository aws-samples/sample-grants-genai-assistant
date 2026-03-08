/**
 * Real-time Grant Search Component
 * 
 * This component provides a complete real-time grant search interface
 * with progress tracking, live results, and connection status.
 */

import React, { useState, useEffect } from 'react';
import { useRealtimeGrantSearch } from '../hooks/useRealtimeGrantSearch';
import SearchProgressIndicator from './SearchProgressIndicator';
import GrantResultsList from './GrantResultsList';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import SearchFiltersForm from './SearchFiltersForm';

const RealtimeGrantSearch = ({ config }) => {
  const [searchFilters, setSearchFilters] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    sessionId,
    status,
    grants,
    progress,
    error,
    connectionStatus,
    initiateSearch,
    reconnectToSession,
    isSearching,
    isCompleted,
    isFailed,
    isConnected,
    hasResults
  } = useRealtimeGrantSearch(config);

  const handleSearch = async (filters) => {
    setSearchFilters(filters);
    await initiateSearch(filters);
  };

  const handleReconnect = () => {
    if (sessionId) {
      reconnectToSession(sessionId);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>Real-time Grant Search</h1>
        <ConnectionStatusIndicator 
          status={connectionStatus}
          onReconnect={handleReconnect}
        />
      </div>

      {/* Search Form */}
      {!isSearching && (
        <SearchFiltersForm
          onSearch={handleSearch}
          disabled={isSearching}
          showAdvanced={showAdvancedFilters}
          onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
        />
      )}

      {/* Progress Indicator */}
      {isSearching && (
        <SearchProgressIndicator
          progress={progress}
          status={status}
          sessionId={sessionId}
        />
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          padding: '15px',
          marginBottom: '20px',
          color: '#c33'
        }}>
          <strong>Error:</strong> {error}
          {sessionId && (
            <button
              onClick={handleReconnect}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Retry Connection
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <GrantResultsList
          grants={grants}
          isLoading={isSearching}
          searchFilters={searchFilters}
        />
      )}

      {/* Completion Message */}
      {isCompleted && (
        <div style={{
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          borderRadius: '4px',
          padding: '15px',
          marginTop: '20px',
          color: '#363'
        }}>
          <strong>Search Complete!</strong> Found {grants.length} grants matching your criteria.
        </div>
      )}
    </div>
  );
};

export default RealtimeGrantSearch;