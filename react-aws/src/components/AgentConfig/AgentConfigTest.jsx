import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs);
const client = generateClient();

const AgentConfigTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, status, details) => {
    setTestResults(prev => [...prev, { test, status, details, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testUserProfiles = async () => {
    addResult('User Profiles', 'TESTING', 'Starting user profiles test...');

    try {
      console.log('🔍 Testing user profiles GraphQL query...');

      const { data } = await client.graphql({
        query: `
          query ListUserProfiles {
            listUserProfiles {
              items {
                id
                userId
                name
                firstName
                lastName
                researcherType
                isActive
                email
              }
            }
          }
        `
      });

      console.log('📋 User profiles response:', data);

      if (data && data.listUserProfiles && data.listUserProfiles.items) {
        addResult('User Profiles', 'SUCCESS', `Found ${data.listUserProfiles.items.length} profiles`);
        return data.listUserProfiles.items;
      } else {
        addResult('User Profiles', 'WARNING', 'Unexpected response structure');
        return [];
      }
    } catch (error) {
      console.error('❌ User profiles error:', error);
      const errorMsg = error?.message || error?.name || (typeof error === 'string' ? error : 'Unknown error');
      addResult('User Profiles', 'ERROR', errorMsg);
      return [];
    }
  };

  const testAgentConfigs = async () => {
    addResult('Agent Configs', 'TESTING', 'Starting agent configs test...');

    try {
      console.log('🔍 Testing agent configs GraphQL query...');

      const result = await client.graphql({
        query: `
          query ListAgentConfigs {
            listAgentConfigs {
              items {
                id
                userId
                timeInterval
                grantsSurfaced
                autoOn
                profileSelected
                storageDuration
                isActive
                createdAt
                updatedAt
              }
            }
          }
        `
      });

      console.log('📋 Agent configs response:', result);

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const errorSummary = result.errors.map(e => e.message).join('; ');
        addResult('Agent Configs', 'WARNING', `GraphQL returned errors: ${errorSummary.substring(0, 200)}`);

        // Still try to use the data if available
        if (result.data && result.data.listAgentConfigs && result.data.listAgentConfigs.items) {
          const validItems = result.data.listAgentConfigs.items.filter(item => item !== null);
          addResult('Agent Configs', 'WARNING', `Found ${validItems.length} valid configs (some records have data issues)`);
          return validItems;
        }
        return [];
      }

      const { data } = result;

      if (data && data.listAgentConfigs && data.listAgentConfigs.items) {
        const validItems = data.listAgentConfigs.items.filter(item => item !== null);
        addResult('Agent Configs', 'SUCCESS', `Found ${validItems.length} configs`);
        return validItems;
      } else {
        addResult('Agent Configs', 'WARNING', 'Unexpected response structure');
        return [];
      }
    } catch (error) {
      console.error('❌ Agent configs error:', error);
      const errorMsg = error?.message || error?.name || (typeof error === 'string' ? error : 'Unknown error');
      addResult('Agent Configs', 'ERROR', errorMsg);
      return [];
    }
  };

  const testAmplifyConfig = () => {
    addResult('Amplify Config', 'TESTING', 'Checking Amplify configuration...');

    try {
      console.log('🔍 Amplify outputs:', outputs);

      if (outputs && outputs.data && outputs.data.url) {
        addResult('Amplify Config', 'SUCCESS', `GraphQL endpoint: ${outputs.data.url}`);
      } else {
        addResult('Amplify Config', 'ERROR', 'Missing GraphQL endpoint in outputs');
      }

      if (outputs && outputs.data && outputs.data.api_key) {
        addResult('Amplify Config', 'SUCCESS', 'API key found');
      } else {
        addResult('Amplify Config', 'ERROR', 'Missing API key in outputs');
      }
    } catch (error) {
      addResult('Amplify Config', 'ERROR', `Config error: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);

    // Test Amplify configuration
    testAmplifyConfig();

    // Test GraphQL queries
    await testUserProfiles();
    await testAgentConfigs();

    setLoading(false);
  };

  useEffect(() => {
    runAllTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return '#28a745';
      case 'ERROR': return '#dc3545';
      case 'WARNING': return '#ffc107';
      case 'TESTING': return '#007bff';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#1976d2', margin: 0 }}>🧪 AgentConfig Debug Test</h2>
        <button
          onClick={runAllTests}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🔄 Testing...' : '🔄 Run Tests'}
        </button>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Test Results</h3>

        {testResults.length === 0 ? (
          <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
            No test results yet...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {testResults.map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: `1px solid ${getStatusColor(result.status)}`,
                  borderLeft: `4px solid ${getStatusColor(result.status)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: getStatusColor(result.status) }}>
                      {result.status}
                    </strong>
                    <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                      {result.test}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6c757d' }}>
                    {result.timestamp}
                  </span>
                </div>
                <div style={{ marginTop: '5px', fontSize: '14px', color: '#495057' }}>
                  {result.details}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fff8e1',
        borderRadius: '4px',
        border: '1px solid #ffcc02'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#f57f17' }}>💡 Debug Instructions</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#ef6c00', fontSize: '14px' }}>
          <li>Check the browser console for detailed logs</li>
          <li>Verify Amplify configuration is correct</li>
          <li>Ensure GraphQL queries are working</li>
          <li>Test both UserProfiles and AgentConfigs</li>
        </ul>
      </div>
    </div>
  );
};

export default AgentConfigTest;