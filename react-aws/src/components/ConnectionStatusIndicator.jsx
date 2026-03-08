/**
 * Connection Status Indicator Component
 * 
 * Shows the real-time connection status and provides reconnection controls
 */

import React from 'react';

const ConnectionStatusIndicator = ({ status, onReconnect }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'CONNECTED':
        return {
          color: '#28a745',
          backgroundColor: '#28a74520',
          text: 'Connected',
          icon: '🟢',
          showReconnect: false
        };
      case 'CONNECTING':
        return {
          color: '#ffc107',
          backgroundColor: '#ffc10720',
          text: 'Connecting...',
          icon: '🟡',
          showReconnect: false
        };
      case 'RECONNECTING':
        return {
          color: '#fd7e14',
          backgroundColor: '#fd7e1420',
          text: 'Reconnecting...',
          icon: '🟠',
          showReconnect: false
        };
      case 'DISCONNECTED':
      default:
        return {
          color: '#dc3545',
          backgroundColor: '#dc354520',
          text: 'Disconnected',
          icon: '🔴',
          showReconnect: true
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      borderRadius: '20px',
      backgroundColor: config.backgroundColor,
      border: `1px solid ${config.color}40`,
      fontSize: '14px'
    }}>
      {/* Status Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: config.color,
        fontWeight: 'bold'
      }}>
        <span style={{ fontSize: '12px' }}>{config.icon}</span>
        <span>{config.text}</span>
      </div>

      {/* Reconnect Button */}
      {config.showReconnect && onReconnect && (
        <button
          onClick={onReconnect}
          style={{
            padding: '4px 8px',
            backgroundColor: config.color,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Reconnect
        </button>
      )}

      {/* Pulse Animation for Connecting States */}
      {(status === 'CONNECTING' || status === 'RECONNECTING') && (
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.color
        }} />
      )}


    </div>
  );
};

export default ConnectionStatusIndicator;