import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/data';

const client = generateClient();

function AgentCoreTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('Find grants for AI research');

  const testUSGrantsSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('Testing US Grants Search with AgentCore...');
      
      const searchInput = {
        sessionId: `agentcore_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query: query,
        filters: {
          minAmount: 100000,
          maxAmount: 1000000,
          agencies: ['NSF', 'NIH']
        },
        sources: ['GRANTS_GOV']
      };

      console.log('Search input:', searchInput);

      // Call the GraphQL mutation
      const response = await client.graphql({
        query: `
          mutation StartGrantSearch($input: AWSJSON!) {
            startGrantSearch(input: $input)
          }
        `,
        variables: {
          input: JSON.stringify(searchInput)
        }
      });

      console.log('GraphQL response:', response);

      if (response.data?.startGrantSearch) {
        const result = JSON.parse(response.data.startGrantSearch);
        setResults(result);
        console.log('Parsed result:', result);
      } else {
        throw new Error('No data returned from GraphQL mutation');
      }

    } catch (err) {
      console.error('AgentCore test error:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testGrantDetails = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('Testing Grant Details with AgentCore...');
      
      // Call the GraphQL query for grant details
      const response = await client.graphql({
        query: `
          query GetGrantDetails($grantId: String!, $source: String) {
            getGrantDetails(grantId: $grantId, source: $source)
          }
        `,
        variables: {
          grantId: 'test-grant-123',
          source: 'GRANTS_GOV'
        }
      });

      console.log('Grant details response:', response);

      if (response.data?.getGrantDetails) {
        const result = JSON.parse(response.data.getGrantDetails);
        setResults(result);
        console.log('Grant details result:', result);
      } else {
        throw new Error('No grant details returned');
      }

    } catch (err) {
      console.error('Grant details test error:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>🤖 AgentCore Integration Test</h2>
        <p>Test the new grants-search Lambda function with Bedrock AgentCore agents.</p>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Search Query:
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="Enter your grant search query..."
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={testUSGrantsSearch}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '🔄 Testing...' : '🇺🇸 Test US Grants Search'}
          </button>

          <button
            onClick={testGrantDetails}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '🔄 Testing...' : '📄 Test Grant Details'}
          </button>
        </div>

        {loading && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e3f2fd', 
            border: '1px solid #2196f3', 
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0, color: '#1976d2' }}>
              🔄 Calling AgentCore agent... This may take 10-30 seconds.
            </p>
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#ffebee', 
            border: '1px solid #f44336', 
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#d32f2f' }}>❌ Error</h4>
            <p style={{ margin: 0, color: '#d32f2f', fontFamily: 'monospace' }}>{error}</p>
          </div>
        )}

        {results && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e8f5e8', 
            border: '1px solid #4caf50', 
            borderRadius: '4px'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#2e7d32' }}>✅ AgentCore Response</h4>
            
            {results.eventType && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Event Type:</strong> <span style={{ color: '#1976d2' }}>{results.eventType}</span>
              </div>
            )}
            
            {results.message && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Message:</strong> {results.message}
              </div>
            )}
            
            {results.grants && results.grants.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Grants Found:</strong> {results.grants.length}
                <div style={{ 
                  maxHeight: '300px', 
                  overflow: 'auto', 
                  marginTop: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}>
                  {results.grants.slice(0, 5).map((grant, index) => (
                    <div key={index} style={{ 
                      padding: '10px', 
                      borderBottom: index < 4 ? '1px solid #eee' : 'none'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {grant.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        Agency: {grant.agency} | Amount: {grant.amount} | Deadline: {grant.deadline}
                      </div>
                      {grant.description && (
                        <div style={{ fontSize: '12px', marginTop: '5px' }}>
                          {grant.description.substring(0, 150)}...
                        </div>
                      )}
                    </div>
                  ))}
                  {results.grants.length > 5 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                      ... and {results.grants.length - 5} more grants
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <details style={{ marginTop: '15px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#1976d2' }}>
                📋 Raw Response Data
              </summary>
              <pre style={{ 
                marginTop: '10px',
                padding: '10px', 
                backgroundColor: '#f5f5f5', 
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '400px'
              }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
        <h3>🔧 AgentCore Integration Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <h4>US Grants Lambda</h4>
            <p>✅ Deployed with AgentCore API</p>
            <p>✅ Using bedrock-agentcore service</p>
            <p>✅ Correct payload format</p>
            <p>✅ Session ID validation (33+ chars)</p>
          </div>
          <div>
            <h4>Agent Configuration</h4>
            <p>🤖 Agent: grants_search_agent-PjgA702gEW</p>
            <p>🌐 Region: us-east-1</p>
            <p>🔐 IAM: bedrock-agentcore:InvokeAgentRuntime</p>
            <p>📊 GraphQL: startGrantSearch, getGrantDetails</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentCoreTest;