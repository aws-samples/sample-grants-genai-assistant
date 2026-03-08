/**
 * Simple GraphQL Search Test Component
 * 
 * Tests the basic GraphQL operations without complex UI
 */

import React, { useState } from 'react';

const GraphQLSearchTest = () => {
  const [searchQuery, setSearchQuery] = useState('artificial intelligence');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testGraphQLSearch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 Testing Amplify GraphQL startGrantSearch mutation...');
      
      const sessionId = `test-${Date.now()}`;
      const searchInput = {
        sessionId,
        query: searchQuery,
        filters: {
          minAmount: 50000,
          maxAmount: 500000,
          keywords: [searchQuery]
        },
        sources: ['GRANTS_GOV']
      };

      console.log('📤 Sending Amplify GraphQL mutation:', searchInput);

      // Use Amplify client instead of Apollo
      const { generateClient } = await import('aws-amplify/data');
      const client = generateClient();
      
      const response = await client.graphql({
        query: `
          mutation StartGrantSearch($input: AWSJSON!) {
            startGrantSearch(input: $input)
          }
        `,
        variables: { input: searchInput }
      });

      console.log('📥 GraphQL response:', response);
      
      if (response.data && response.data.startGrantSearch) {
        setResult({
          success: true,
          data: response.data.startGrantSearch,
          message: 'GraphQL mutation executed successfully!'
        });
      } else {
        setResult({
          success: true,
          data: response.data,
          message: 'GraphQL mutation completed (check console for details)'
        });
      }

    } catch (err) {
      console.error('❌ GraphQL error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 GraphQL Search Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Search Query:
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            fontSize: '16px'
          }}
          placeholder="Enter search terms..."
        />
      </div>

      <button
        onClick={testGraphQLSearch}
        disabled={loading || !searchQuery.trim()}
        style={{
          padding: '12px 24px',
          backgroundColor: loading ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {loading ? '🔄 Testing GraphQL...' : '🚀 Test GraphQL Search'}
      </button>

      {/* Results */}
      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '6px',
          border: '1px solid #c3e6c3'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>✅ GraphQL Success!</h3>
          <pre style={{ 
            fontSize: '12px', 
            backgroundColor: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          borderRadius: '6px',
          border: '1px solid #f5c6cb'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>❌ GraphQL Error</h3>
          <p style={{ margin: 0, color: '#721c24' }}>{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#e7f3ff', 
        borderRadius: '6px',
        border: '1px solid #b3d9ff'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#004085' }}>📋 Test Instructions</h4>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#004085' }}>
          <li>Enter a search query (e.g., "artificial intelligence")</li>
          <li>Click "Test GraphQL Search" to send the mutation</li>
          <li>Check the browser console for detailed logs</li>
          <li>Results will appear below if successful</li>
        </ol>
      </div>
    </div>
  );
};

export default GraphQLSearchTest;