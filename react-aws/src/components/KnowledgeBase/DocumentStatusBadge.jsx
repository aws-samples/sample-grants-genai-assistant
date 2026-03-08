import React from 'react';

const DocumentStatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'uploading':
        return {
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          icon: '⏳'
        };
      case 'queued':
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e',
          icon: '⏳'
        };
      case 'processing':
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e',
          icon: '⚙️'
        };
      case 'ready':
        return {
          backgroundColor: '#d1fae5',
          color: '#065f46',
          icon: '✅'
        };
      case 'failed':
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          icon: '❌'
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          icon: '❓'
        };
    }
  };

  const style = getStatusStyle();

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      backgroundColor: style.backgroundColor,
      color: style.color,
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'capitalize'
    }}>
      {style.icon} {status || 'unknown'}
    </span>
  );
};

export default DocumentStatusBadge;
