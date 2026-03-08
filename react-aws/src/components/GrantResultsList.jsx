/**
 * Grant Results List Component
 * 
 * Displays grant search results with real-time updates
 */

import React, { useState } from 'react';
import './animations.css';

const GrantResultsList = ({ grants, isLoading, searchFilters }) => {
  const [sortBy, setSortBy] = useState('relevance');
  const [filterBy, setFilterBy] = useState('all');

  const sortGrants = (grants, sortBy) => {
    const sorted = [...grants];
    
    switch (sortBy) {
      case 'amount':
        return sorted.sort((a, b) => {
          const aAmount = parseAmount(a.amount);
          const bAmount = parseAmount(b.amount);
          return bAmount - aAmount;
        });
      case 'deadline':
        return sorted.sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));
      case 'agency':
        return sorted.sort((a, b) => a.agency.localeCompare(b.agency));
      case 'relevance':
      default:
        return sorted.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }
  };

  const parseAmount = (amountStr) => {
    if (!amountStr || amountStr === 'Not specified') return 0;
    const match = amountStr.match(/\$?([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
  };

  const filterGrants = (grants, filterBy) => {
    switch (filterBy) {
      case 'enhanced':
        return grants.filter(g => g.enhancementStatus === 'ENHANCED');
      case 'pending':
        return grants.filter(g => g.enhancementStatus === 'PENDING');
      case 'all':
      default:
        return grants;
    }
  };

  const processedGrants = sortGrants(filterGrants(grants, filterBy), sortBy);

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Results Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#333' }}>
            Grant Results {isLoading && <span style={{ color: '#007bff' }}>(Live Updates)</span>}
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
            {processedGrants.length} grants found
            {grants.length !== processedGrants.length && ` (${grants.length} total)`}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            style={{
              padding: '5px 10px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Grants</option>
            <option value="enhanced">Enhanced Only</option>
            <option value="pending">Pending Enhancement</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '5px 10px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="amount">Sort by Amount</option>
            <option value="deadline">Sort by Deadline</option>
            <option value="agency">Sort by Agency</option>
          </select>
        </div>
      </div>

      {/* Results List */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {processedGrants.map((grant, index) => (
          <GrantCard 
            key={grant.id || index} 
            grant={grant} 
            isNew={isLoading && index === grants.length - 1}
          />
        ))}
      </div>

      {/* Loading Placeholder */}
      {isLoading && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6c757d',
          fontStyle: 'italic'
        }}>
          <div 
            className="spinning"
            style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              border: '2px solid #dee2e6',
              borderTop: '2px solid #007bff',
              borderRadius: '50%',
              marginRight: '10px'
            }} 
          />
          Processing more grants...
        </div>
      )}


    </div>
  );
};

const GrantCard = ({ grant, isNew }) => {
  const getEnhancementStatusColor = (status) => {
    switch (status) {
      case 'ENHANCED': return '#28a745';
      case 'PENDING': return '#ffc107';
      case 'FAILED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getEnhancementStatusText = (status) => {
    switch (status) {
      case 'ENHANCED': return 'Enhanced';
      case 'PENDING': return 'Processing...';
      case 'FAILED': return 'Enhancement Failed';
      default: return 'Unknown';
    }
  };

  return (
    <div 
      className={isNew ? 'slide-in' : ''}
      style={{
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderLeft: isNew ? '4px solid #28a745' : '1px solid #dee2e6'
      }}
    >
      {/* Grant Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '10px'
      }}>
        <h3 style={{ 
          margin: 0, 
          color: '#333',
          fontSize: '18px',
          lineHeight: '1.3'
        }}>
          {grant.title}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Enhancement Status */}
          <span style={{
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: getEnhancementStatusColor(grant.enhancementStatus) + '20',
            color: getEnhancementStatusColor(grant.enhancementStatus),
            border: `1px solid ${getEnhancementStatusColor(grant.enhancementStatus)}40`
          }}>
            {getEnhancementStatusText(grant.enhancementStatus)}
          </span>
          
          {/* Match Score */}
          {grant.relevanceScore && (
            <span style={{
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: '#007bff20',
              color: '#007bff',
              border: '1px solid #007bff40'
            }}>
              {Math.round(grant.relevanceScore * 100)}% match
            </span>
          )}
        </div>
      </div>

      {/* Grant Details */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '15px'
      }}>
        <div>
          <strong style={{ color: '#495057' }}>Agency:</strong>
          <div style={{ color: '#6c757d' }}>{grant.agency}</div>
        </div>
        
        <div>
          <strong style={{ color: '#495057' }}>Award Ceiling:</strong>
          <div style={{ 
            color: grant.amount !== 'Not specified' ? '#28a745' : '#6c757d',
            fontWeight: grant.amount !== 'Not specified' ? 'bold' : 'normal'
          }}>
            {grant.amount}
          </div>
        </div>
        
        <div>
          <strong style={{ color: '#495057' }}>Deadline:</strong>
          <div style={{ color: '#6c757d' }}>{grant.closeDate}</div>
        </div>
      </div>

      {/* Description */}
      {grant.description && (
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#495057' }}>Description:</strong>
          <p style={{ 
            margin: '5px 0 0 0', 
            color: '#6c757d',
            lineHeight: '1.5'
          }}>
            {grant.description.length > 200 
              ? `${grant.description.substring(0, 200)}...` 
              : grant.description
            }
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        gap: '10px',
        paddingTop: '15px',
        borderTop: '1px solid #dee2e6'
      }}>
        {/* Handle both US grants (grant.url) and EU grants (grant.euUrl) */}
        {(grant.url || grant.euUrl) && (
          <a
            href={grant.url || grant.euUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {grant.source === 'EU_FUNDING' ? '🇪🇺 View EU Grant' : 'View Details'}
          </a>
        )}
        
        <button
          onClick={() => console.log('Save grant:', grant.id)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#007bff',
            border: '1px solid #007bff',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Save Grant
        </button>
      </div>
    </div>
  );
};

export default GrantResultsList;