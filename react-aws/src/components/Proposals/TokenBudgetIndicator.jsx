import React from 'react';
import './TokenBudgetIndicator.css';

const TokenBudgetIndicator = ({ tokenCount, maxTokens = 168000, className = '' }) => {
  const percentage = Math.min((tokenCount / maxTokens) * 100, 100);
  
  const getStatus = () => {
    if (percentage < 83) return 'safe';
    if (percentage < 95) return 'warning';
    return 'danger';
  };
  
  const status = getStatus();
  
  const getStatusMessage = () => {
    switch (status) {
      case 'safe':
        return 'Token usage is within safe limits';
      case 'warning':
        return 'Approaching token limit - consider removing some documents';
      case 'danger':
        return 'Token limit exceeded - content will be truncated';
      default:
        return '';
    }
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'safe':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'danger':
        return '🚫';
      default:
        return '';
    }
  };
  
  return (
    <div className={`token-budget-indicator ${status} ${className}`}>
      <div className="token-header">
        <span className="token-label">
          {getStatusIcon()} Token Usage
        </span>
        <span className="token-count">
          {tokenCount.toLocaleString()} / {maxTokens.toLocaleString()}
        </span>
      </div>
      
      <div className="token-bar-container">
        <div 
          className={`token-bar ${status}`} 
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="token-status">
        <span className={`status-message ${status}`}>
          {getStatusMessage()}
        </span>
        <span className="percentage">
          {percentage.toFixed(1)}%
        </span>
      </div>
      
      {status === 'danger' && (
        <div className="danger-warning">
          ⚠️ Content will be automatically truncated to fit within model limits
        </div>
      )}
    </div>
  );
};

export default TokenBudgetIndicator;
