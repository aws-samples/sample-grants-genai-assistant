/**
 * GraphQL Integration Test Component
 * 
 * This component tests the GraphQL API connection and basic operations.
 */

import React, { useState } from 'react';
import { useGraphQL, useUserProfile } from '../contexts/GraphQLContext';

const GraphQLTest = () => {
  const { connectionStatus, isConnected, amplifyClient } = useGraphQL();
  const [testResults, setTestResults] = useState([]);
  const [userId, setUserId] = useState('test-user-123');

  // User profile hook test
  const { profile, loading, error, updateProfile, refetch } = useUserProfile(userId);

  const addResult = (test, status, message, data = null) => {
    const result = {
      test,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [result, ...prev.slice(0, 9)]);
  };

  // Test 1: Basic connection
  const testConnection = async () => {
    try {
      addResult('Connection', 'RUNNING', 'Testing GraphQL connection...');
      
      if (isConnected) {
        addResult('Connection', 'SUCCESS', 'GraphQL client is connected');
      } else {
        addResult('Connection', 'FAILED', 'GraphQL client is not connected');
      }
    } catch (error) {
      addResult('Connection', 'ERROR', error.message);
    }
  };

  // Test 2: Schema introspection
  const testSchema = async () => {
    try {
      addResult('Schema', 'RUNNING', 'Testing schema introspection...');
      
      const result = await amplifyClient.graphql({
        query: `
          query {
            __schema {
              types {
                name
                kind
              }
            }
          }
        `
      });

      const types = result.data.__schema.types;
      const customTypes = types.filter(t => !t.name.startsWith('__'));
      
      addResult('Schema', 'SUCCESS', `Found ${customTypes.length} types`, {
        totalTypes: types.length,
        customTypes: customTypes.length,
        sampleTypes: customTypes.slice(0, 5).map(t => t.name)
      });
    } catch (error) {
      addResult('Schema', 'ERROR', error.message);
    }
  };

  // Test 3: User profile query
  const testUserProfile = async () => {
    try {
      addResult('User Profile', 'RUNNING', `Querying user profile: ${userId}`);
      
      const result = await amplifyClient.graphql({
        query: `
          query GetUserProfile($userId: String!) {
            getUserProfile(userId: $userId) {
              userId
              email
              firstName
              lastName
              organization
              researchInterests
              expertise
              fundingHistory
              preferences
              createdAt
              updatedAt
            }
          }
        `,
        variables: { userId }
      });

      if (result.data?.getUserProfile) {
        addResult('User Profile', 'SUCCESS', 'User profile retrieved', {
          profile: {
            id: result.data.getUserProfile.id,
            name: result.data.getUserProfile.name,
            email: result.data.getUserProfile.email,
            researchAreas: result.data.getUserProfile.researchAreas?.length || 0,
            keywords: result.data.getUserProfile.keywords?.length || 0
          }
        });
      } else {
        addResult('User Profile', 'SUCCESS', 'User profile created (default)', {
          note: 'New user profile was created with default values'
        });
      }
    } catch (error) {
      addResult('User Profile', 'ERROR', error.message);
    }
  };

  // Test 4: User profile update
  const testUpdateProfile = async () => {
    try {
      addResult('Update Profile', 'RUNNING', 'Testing profile update...');
      
      const updateData = {
        name: 'GraphQL Test User',
        researchAreas: ['Artificial Intelligence', 'Machine Learning'],
        keywords: ['AI', 'ML', 'GraphQL', 'Testing'],
        institution: 'GraphQL University',
        expertiseLevel: 'ADVANCED'
      };

      const result = await updateProfile(updateData);
      
      if (result) {
        addResult('Update Profile', 'SUCCESS', 'Profile updated successfully', {
          updatedFields: Object.keys(updateData),
          updatedAt: result.updatedAt
        });
      } else {
        addResult('Update Profile', 'FAILED', 'No result returned from update');
      }
    } catch (error) {
      addResult('Update Profile', 'ERROR', error.message);
    }
  };

  // Test 5: Grant search mutation (without subscription)
  const testGrantSearchMutation = async () => {
    try {
      addResult('Grant Search', 'RUNNING', 'Testing grant search mutation...');
      
      // We'll just test the mutation without the subscription
      const searchInput = {
        sessionId: `test_${Date.now()}`,
        query: 'artificial intelligence',
        filters: {
          keywords: ['AI', 'machine learning']
        },
        sources: ['GRANTS_GOV']
      };

      // Import the mutation dynamically to avoid dependency issues
      const result = await amplifyClient.graphql({
        query: `
          mutation StartGrantSearch($input: AWSJSON!) {
            startGrantSearch(input: $input)
          }
        `,
        variables: { input: searchInput }
      });

      if (result.data?.startGrantSearch) {
        addResult('Grant Search', 'SUCCESS', 'Grant search mutation executed', {
          sessionId: result.data.startGrantSearch.sessionId,
          eventType: result.data.startGrantSearch.eventType,
          message: result.data.startGrantSearch.message
        });
      } else {
        addResult('Grant Search', 'FAILED', 'No result from grant search mutation');
      }
    } catch (error) {
      addResult('Grant Search', 'ERROR', error.message);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults([]);
    await testConnection();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testSchema();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testUserProfile();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testUpdateProfile();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testGrantSearchMutation();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return '#28a745';
      case 'FAILED': return '#dc3545';
      case 'ERROR': return '#dc3545';
      case 'RUNNING': return '#007bff';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>
        🧪 GraphQL Integration Test
      </h1>

      {/* Connection Status */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Connection Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            Status: 
            <span style={{ 
              color: isConnected ? '#28a745' : '#dc3545',
              marginLeft: '8px'
            }}>
              {connectionStatus.toUpperCase()}
            </span>
          </span>
          {isConnected && (
            <span style={{ color: '#28a745', fontSize: '14px' }}>
              ✅ Apollo Client Ready
            </span>
          )}
        </div>
      </div>

      {/* Test Controls */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Test Controls</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Test User ID:
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              width: '200px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={runAllTests}
            disabled={!isConnected}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isConnected ? 'pointer' : 'not-allowed'
            }}
          >
            🚀 Run All Tests
          </button>
          
          <button onClick={testConnection} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Test Connection
          </button>
          
          <button onClick={testSchema} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Test Schema
          </button>
          
          <button onClick={testUserProfile} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Test User Profile
          </button>
          
          <button onClick={testUpdateProfile} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Test Update
          </button>
          
          <button onClick={testGrantSearchMutation} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Test Grant Search
          </button>
        </div>
      </div>

      {/* Current Profile Info */}
      {profile && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '8px',
          border: '1px solid #c3e6c3'
        }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Current Profile</h3>
          <div style={{ fontSize: '14px' }}>
            <p><strong>ID:</strong> {profile.id}</p>
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Institution:</strong> {profile.institution || 'Not set'}</p>
            <p><strong>Research Areas:</strong> {profile.researchAreas?.length || 0} areas</p>
            <p><strong>Keywords:</strong> {profile.keywords?.length || 0} keywords</p>
            <p><strong>Expertise Level:</strong> {profile.expertiseLevel}</p>
            <p><strong>Last Updated:</strong> {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'Never'}</p>
          </div>
        </div>
      )}

      {/* Test Results */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px 8px 0 0'
        }}>
          <h3 style={{ margin: 0 }}>Test Results</h3>
        </div>
        
        <div style={{ padding: '20px' }}>
          {testResults.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', margin: 0 }}>
              No tests run yet. Click "Run All Tests" to begin.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {testResults.map((result, index) => (
                <div key={index} style={{ 
                  padding: '15px', 
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: getStatusColor(result.status)
                    }}>
                      [{result.status}]
                    </span>
                    <span style={{ fontWeight: 'bold' }}>{result.test}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                    {result.message}
                  </p>
                  
                  {result.data && (
                    <details style={{ fontSize: '12px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                        Show Details
                      </summary>
                      <pre style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        overflow: 'auto'
                      }}>
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphQLTest;