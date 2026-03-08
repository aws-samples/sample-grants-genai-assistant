/**
 * Search Filters Form Component
 * 
 * Provides the search interface for initiating real-time grant searches
 */

import React, { useState } from 'react';

const SearchFiltersForm = ({ onSearch, disabled, showAdvanced, onToggleAdvanced }) => {
  const [filters, setFilters] = useState({
    keywords: '',
    agencies: '',
    budgetMin: '',
    budgetMax: '',
    fundingCeiling: '',
    deadline: '180',
    region: 'US',
    eligibility: '',
    fundingType: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Build search filters
    const searchFilters = {
      keywords: filters.keywords.trim(),
      region: filters.region,
      deadline: filters.deadline
    };

    // Add advanced filters if provided
    if (showAdvanced) {
      if (filters.agencies.trim()) {
        searchFilters.agencies = filters.agencies.trim();
      }
      if (filters.budgetMin) {
        searchFilters.budgetMin = parseInt(filters.budgetMin);
      }
      if (filters.budgetMax) {
        searchFilters.budgetMax = parseInt(filters.budgetMax);
      }
      if (filters.eligibility) {
        searchFilters.eligibility = filters.eligibility;
      }
      if (filters.fundingType) {
        searchFilters.fundingType = filters.fundingType;
      }
      if (filters.fundingCeiling) {
        searchFilters.fundingCeiling = parseInt(filters.fundingCeiling);
      }
    }

    onSearch(searchFilters);
  };

  const handleInputChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Search for Grants</h2>

      {/* Basic Filters */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        {/* Keywords */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: 'bold',
            color: '#495057'
          }}>
            Keywords *
          </label>
          <input
            type="text"
            value={filters.keywords}
            onChange={(e) => handleInputChange('keywords', e.target.value)}
            placeholder="e.g., artificial intelligence, machine learning"
            required
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: disabled ? '#f8f9fa' : 'white'
            }}
          />
        </div>

        {/* Region */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: 'bold',
            color: '#495057'
          }}>
            Region
          </label>
          <select
            value={filters.region}
            onChange={(e) => handleInputChange('region', e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: disabled ? '#f8f9fa' : 'white'
            }}
          >
            <option value="US">United States</option>
            <option value="EU">European Union</option>
          </select>
        </div>

        {/* Deadline */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: 'bold',
            color: '#495057'
          }}>
            Application Deadline
          </label>
          <select
            value={filters.deadline}
            onChange={(e) => handleInputChange('deadline', e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: disabled ? '#f8f9fa' : 'white'
            }}
          >
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
            <option value="90">Next 90 days</option>
            <option value="180">Next 6 months</option>
            <option value="365">Next year</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={onToggleAdvanced}
          disabled={disabled}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#007bff',
            border: '1px solid #007bff',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1
          }}
        >
          {showAdvanced ? '▼ Hide Advanced Filters' : '▶ Show Advanced Filters'}
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Advanced Filters</h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            {/* Agencies */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                Agencies
              </label>
              <input
                type="text"
                value={filters.agencies}
                onChange={(e) => handleInputChange('agencies', e.target.value)}
                placeholder="e.g., NSF, NIH, DOE"
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: disabled ? '#f8f9fa' : 'white'
                }}
              />
            </div>

            {/* Budget Range */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                Budget Min ($)
              </label>
              <input
                type="number"
                value={filters.budgetMin}
                onChange={(e) => handleInputChange('budgetMin', e.target.value)}
                placeholder="50000"
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: disabled ? '#f8f9fa' : 'white'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                Budget Max ($)
              </label>
              <input
                type="number"
                value={filters.budgetMax}
                onChange={(e) => handleInputChange('budgetMax', e.target.value)}
                placeholder="1000000"
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: disabled ? '#f8f9fa' : 'white'
                }}
              />
            </div>

            {/* Funding Ceiling (EU Grants) */}
            {filters.region === 'EU' && (
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: 'bold',
                  color: '#495057'
                }}>
                  Max Funding Ceiling (€)
                </label>
                <select
                  value={filters.fundingCeiling}
                  onChange={(e) => handleInputChange('fundingCeiling', e.target.value)}
                  disabled={disabled}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: disabled ? '#f8f9fa' : 'white'
                  }}
                >
                  <option value="">Any amount</option>
                  <option value="100000">Up to €100K</option>
                  <option value="500000">Up to €500K</option>
                  <option value="1000000">Up to €1M</option>
                  <option value="5000000">Up to €5M</option>
                  <option value="10000000">Up to €10M</option>
                  <option value="50000000">Up to €50M</option>
                </select>
              </div>
            )}

            {/* Eligibility */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                Eligibility
              </label>
              <select
                value={filters.eligibility}
                onChange={(e) => handleInputChange('eligibility', e.target.value)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: disabled ? '#f8f9fa' : 'white'
                }}
              >
                <option value="">Any</option>
                <option value="university">Universities</option>
                <option value="nonprofit">Non-profits</option>
                <option value="small-business">Small Business</option>
                <option value="individual">Individuals</option>
              </select>
            </div>

            {/* Funding Type */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                Funding Type
              </label>
              <select
                value={filters.fundingType}
                onChange={(e) => handleInputChange('fundingType', e.target.value)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: disabled ? '#f8f9fa' : 'white'
                }}
              >
                <option value="">Any</option>
                <option value="grant">Grant</option>
                <option value="cooperative-agreement">Cooperative Agreement</option>
                <option value="contract">Contract</option>
                <option value="fellowship">Fellowship</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          type="submit"
          disabled={disabled || !filters.keywords.trim()}
          style={{
            padding: '12px 30px',
            backgroundColor: disabled || !filters.keywords.trim() ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: disabled || !filters.keywords.trim() ? 'not-allowed' : 'pointer',
            minWidth: '200px'
          }}
        >
          {disabled ? 'Searching...' : 'Start Real-time Search'}
        </button>
      </div>

      {/* Help Text */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#0066cc'
      }}>
        <strong>💡 Tip:</strong> This search will run in real-time and can take up to 15 minutes to complete. 
        You'll see grants appear as they are found and enhanced with funding details.
      </div>
    </form>
  );
};

export default SearchFiltersForm;