/**
 * Search Progress Indicator Component
 * 
 * Shows real-time progress updates during grant search processing
 */

import React from 'react';
import './animations.css';

const SearchProgressIndicator = ({ progress, status, sessionId }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'SEARCHING': return '#007bff';
      case 'ENHANCING': return '#28a745';
      case 'COMPLETED': return '#28a745';
      case 'FAILED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'INITIATED': return 'Initiating search...';
      case 'SEARCHING': return 'Searching for grants...';
      case 'ENHANCING': return 'Enhancing grants with funding details...';
      case 'COMPLETED': return 'Search completed';
      case 'FAILED': return 'Search failed';
      default: return 'Processing...';
    }
  };

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* Status Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          margin: 0, 
          color: getStatusColor(status),
          display: 'flex',
          alignItems: 'center'
        }}>
          <div 
            className={status === 'SEARCHING' || status === 'ENHANCING' ? 'pulsing' : ''}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(status),
              marginRight: '8px'
            }} 
          />
          {getStatusText(status)}
        </h3>
        
        {sessionId && (
          <span style={{ 
            fontSize: '12px', 
            color: '#6c757d',
            fontFamily: 'monospace'
          }}>
            Session: {sessionId.substring(0, 8)}...
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        height: '8px',
        marginBottom: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: getStatusColor(status),
          height: '100%',
          width: `${progress.percentage || 0}%`,
          transition: 'width 0.3s ease-in-out',
          borderRadius: '4px'
        }} />
      </div>

      {/* Progress Details */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        <span>{progress.currentStep || 'Processing...'}</span>
        <span>
          {progress.processedGrants > 0 && progress.totalGrants > 0 && (
            `${progress.processedGrants}/${progress.totalGrants} grants processed`
          )}
          {progress.percentage > 0 && (
            ` (${Math.round(progress.percentage)}%)`
          )}
        </span>
      </div>

      {/* Estimated Time (if available) */}
      {progress.totalGrants > 0 && progress.processedGrants > 0 && status === 'ENHANCING' && (
        <div style={{ 
          marginTop: '10px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <em>
            Estimated time remaining: {
              Math.ceil(((progress.totalGrants - progress.processedGrants) * 2)) 
            } seconds
          </em>
        </div>
      )}


    </div>
  );
};

export default SearchProgressIndicator;