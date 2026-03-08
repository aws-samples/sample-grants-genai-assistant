import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs);
const client = generateClient({
  authMode: 'apiKey'
});

const AgentConfigUI = () => {
  const [config, setConfig] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProfiles, setUserProfiles] = useState([]);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    timeInterval: 24,
    grantsSurfaced: 2,
    autoOn: true,
    profileSelected: '',
    storageDuration: 7
  });

  // Load data on component mount
  useEffect(() => {
    loadUserProfiles();
    loadAgentConfig();
  }, []);

  const loadUserProfiles = async () => {
    try {
      console.log('🔍 Loading user profiles...');

      // Get current user's Cognito ID first
      const user = await getCurrentUser();
      const currentUserId = user?.userId || user?.username;

      if (!currentUserId) {
        console.error('❌ No userId found for filtering profiles');
        setMessage('Unable to determine current user');
        setUserProfiles([]);
        return;
      }

      console.log('📋 Loading profiles for user:', currentUserId);

      const result = await client.graphql({
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

      console.log('📋 Raw GraphQL result:', result);

      const { data } = result;

      if (data && data.listUserProfiles && data.listUserProfiles.items) {
        // Filter profiles to only show those belonging to the current user
        const userOwnedProfiles = data.listUserProfiles.items.filter(
          profile => profile.userId === currentUserId
        );

        setUserProfiles(userOwnedProfiles);
        console.log('✅ Loaded user profiles (filtered):', userOwnedProfiles);

        if (userOwnedProfiles.length === 0) {
          setMessage('No research profiles found for your account. Please create one in the Profile Manager.');
        }
      } else {
        console.warn('⚠️ Unexpected response structure:', data);
        setUserProfiles([]);
        setMessage('No user profiles found');
      }
    } catch (error) {
      console.error('❌ Error loading user profiles:', error);

      // Handle GraphQL errors (when response has both data and errors)
      if (error.errors && Array.isArray(error.errors)) {
        console.error('GraphQL errors:', error.errors);
        const errorMessages = error.errors.map(e => e.message).join(', ');
        setMessage(`GraphQL error loading user profiles: ${errorMessages}`);

        // Check if we still got data despite errors
        if (error.data && error.data.listUserProfiles && error.data.listUserProfiles.items) {
          console.warn('⚠️ Got data despite GraphQL errors, using it');

          // Try to filter by current user even in error case
          try {
            const user = await getCurrentUser();
            const currentUserId = user?.userId || user?.username;

            if (currentUserId) {
              const userOwnedProfiles = error.data.listUserProfiles.items.filter(
                profile => profile.userId === currentUserId
              );
              setUserProfiles(userOwnedProfiles);
              console.log('✅ Loaded filtered profiles despite errors:', userOwnedProfiles);
            } else {
              setUserProfiles(error.data.listUserProfiles.items);
            }
          } catch (userError) {
            console.error('❌ Could not filter profiles:', userError);
            setUserProfiles(error.data.listUserProfiles.items);
          }

          setMessage(''); // Clear error since we got data
        } else {
          setUserProfiles([]);
        }
      } else {
        // Handle regular JavaScript errors
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        setMessage(`Error loading user profiles: ${error.message || 'Unknown error'}`);
        setUserProfiles([]);
      }
    }
  };

  const loadAgentConfig = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading agent config...');

      // Get actual Cognito user ID
      const user = await getCurrentUser();
      console.log('📋 Raw user object:', user);

      // Extract userId from Amplify getCurrentUser response
      // The structure is: { userId, username, signInDetails }
      const userId = user?.userId || user?.username;

      if (!userId) {
        console.error('❌ No userId found in user object:', user);
        throw new Error('Unable to determine user ID from authentication');
      }

      console.log('✅ Loading config for user:', userId);

      // Try to get existing config by listing all and finding by userId
      const { data } = await client.graphql({
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
                lastRun
                nextRun
                isActive
                createdAt
                updatedAt
              }
            }
          }
        `
      });

      console.log('📋 Raw AgentConfig response:', data);

      const configs = data?.listAgentConfigs?.items || [];
      const userConfig = configs.find(c => c.userId === userId);

      if (userConfig) {
        console.log('✅ Found existing config:', userConfig);
        setConfig(userConfig);
        setFormData({
          timeInterval: userConfig.timeInterval,
          grantsSurfaced: userConfig.grantsSurfaced,
          autoOn: userConfig.autoOn,
          profileSelected: userConfig.profileSelected,
          storageDuration: userConfig.storageDuration
        });
      } else {
        console.log('📋 No existing config found, using defaults');
        // No existing config, will create new one
        setConfig(null);
      }
    } catch (error) {
      console.error('❌ Error loading agent config:', error);

      // Handle GraphQL errors (when response has both data and errors)
      if (error.errors && Array.isArray(error.errors)) {
        console.error('GraphQL errors:', error.errors);
        const errorMessages = error.errors.map(e => e.message).join(', ');
        setMessage(`GraphQL error loading agent config: ${errorMessages}`);

        // Check if we still got data despite errors
        if (error.data && error.data.listAgentConfigs && error.data.listAgentConfigs.items) {
          console.warn('⚠️ Got AgentConfig data despite GraphQL errors, using it');
          const configs = error.data.listAgentConfigs.items;

          // Try to get userId again for error recovery
          try {
            const user = await getCurrentUser();
            const userId = user?.userId || user?.username;

            if (userId) {
              const userConfig = configs.find(c => c?.userId === userId);

              if (userConfig) {
                console.log('✅ Found existing config despite errors:', userConfig);
                setConfig(userConfig);
                setFormData({
                  timeInterval: userConfig.timeInterval,
                  grantsSurfaced: userConfig.grantsSurfaced,
                  autoOn: userConfig.autoOn,
                  profileSelected: userConfig.profileSelected,
                  storageDuration: userConfig.storageDuration
                });
                setMessage(''); // Clear error since we got data
              }
            }
          } catch (userError) {
            console.error('❌ Could not get user for error recovery:', userError);
          }
        }
      } else {
        // Handle regular JavaScript errors
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        setMessage(`Error loading agent configuration: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const user = await getCurrentUser();
      console.log('📋 Raw user object in save:', user);

      const userId = user?.userId || user?.username;

      if (!userId) {
        console.error('❌ No userId found in user object:', user);
        throw new Error('Unable to determine user ID from authentication');
      }

      console.log('💾 Saving config for user:', userId);

      if (config) {
        // Update existing config
        const { data } = await client.graphql({
          query: `
            mutation UpdateAgentConfig($input: UpdateAgentConfigInput!) {
              updateAgentConfig(input: $input) {
                id
                userId
                timeInterval
                grantsSurfaced
                autoOn
                profileSelected
                storageDuration
                isActive
                updatedAt
              }
            }
          `,
          variables: {
            input: {
              id: config.id,
              ...formData
            }
          }
        });

        setConfig(data.updateAgentConfig);
        setMessage('✅ Agent configuration updated successfully!');
        console.log('📋 Config updated:', data.updateAgentConfig);
      } else {
        // Create new config
        const { data } = await client.graphql({
          query: `
            mutation CreateAgentConfig($input: CreateAgentConfigInput!) {
              createAgentConfig(input: $input) {
                id
                userId
                timeInterval
                grantsSurfaced
                autoOn
                profileSelected
                storageDuration
                isActive
                createdAt
              }
            }
          `,
          variables: {
            input: {
              userId,
              ...formData
            }
          }
        });

        setConfig(data.createAgentConfig);
        setMessage('✅ Agent configuration created successfully!');
        console.log('📋 Config created:', data.createAgentConfig);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving agent config:', error);
      setMessage(`❌ Error saving configuration: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (config) {
      setFormData({
        timeInterval: config.timeInterval,
        grantsSurfaced: config.grantsSurfaced,
        autoOn: config.autoOn,
        profileSelected: config.profileSelected,
        storageDuration: config.storageDuration
      });
    } else {
      setFormData({
        timeInterval: 24,
        grantsSurfaced: 2,
        autoOn: true,
        profileSelected: '',
        storageDuration: 7
      });
    }
    setIsEditing(false);
    setMessage('');
  };

  if (loading && !config) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading agent configuration...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#1976d2', margin: 0 }}>
          <img src="/AgenticAIIcon.png" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '8px' }} />
          Agent Configuration
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✏️ {config ? 'Edit Configuration' : 'Create Configuration'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              disabled={loading || !formData.profileSelected}
              style={{
                padding: '8px 16px',
                backgroundColor: loading || !formData.profileSelected ? '#6c757d' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || !formData.profileSelected ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '💾 Saving...' : '💾 Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              ❌ Cancel
            </button>
          </div>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.includes('❌') ? '#f8d7da' : '#d4edda',
          color: message.includes('❌') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('❌') ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          {message}
        </div>
      )}

      {/* Agent Info Banner */}
      <div style={{
        marginBottom: '30px',
        padding: '15px',
        backgroundColor: '#e8f5e8',
        borderRadius: '8px',
        border: '1px solid #4caf50'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>
          <img src="/AgenticAIIcon.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '6px' }} />
          Automated Grant Discovery
        </h4>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          Configure your AI agent to automatically discover and surface relevant grants based on your research profile.
          The agent will run at your specified intervals and notify you of new opportunities.
        </p>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>

        {/* Profile Selection */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            Research Profile <span style={{ color: '#dc3545' }}>*</span>
          </label>
          {isEditing ? (
            <select
              value={formData.profileSelected}
              onChange={(e) => handleInputChange('profileSelected', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #007bff',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select a research profile...</option>
              {userProfiles.length > 0 ? (
                userProfiles.map(profile => (
                  <option key={profile.id} value={profile.userId}>
                    {profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.userId}
                    {profile.researcherType && ` (${profile.researcherType})`}
                    {profile.isActive && ' - Active'}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading profiles...</option>
              )}
            </select>
          ) : (
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
              {formData.profileSelected ? (
                <>
                  {userProfiles.find(p => p.userId === formData.profileSelected)?.name || formData.profileSelected}
                  <span style={{ color: '#666', marginLeft: '10px' }}>
                    ({userProfiles.find(p => p.userId === formData.profileSelected)?.researcherType || 'Unknown type'})
                  </span>
                </>
              ) : (
                <span style={{ color: '#999' }}>No profile selected</span>
              )}
            </div>
          )}
          <small style={{ color: '#666', fontSize: '12px' }}>
            Select which research profile the agent should use for grant matching
          </small>
        </div>

        {/* Search Frequency */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            Search Interval (hours)
          </label>
          {isEditing ? (
            <select
              value={formData.timeInterval}
              onChange={(e) => handleInputChange('timeInterval', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value={12}>Every 12 hours (twice daily)</option>
              <option value={24}>Every 24 hours (daily)</option>
              <option value={48}>Every 48 hours (every 2 days)</option>
            </select>
          ) : (
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
              {formData.timeInterval} hours
              <span style={{ color: '#666', marginLeft: '10px' }}>
                ({formData.timeInterval === 12 ? 'Twice daily' :
                  formData.timeInterval === 24 ? 'Daily' :
                    formData.timeInterval === 48 ? 'Every 2 days' :
                      `Every ${formData.timeInterval} hours`})
              </span>
            </div>
          )}
          <small style={{ color: '#666', fontSize: '12px' }}>
            How often the agent should search for new grants
          </small>
        </div>

        {/* Grants to Surface */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            Grants to Surface
          </label>
          {isEditing ? (
            <select
              value={formData.grantsSurfaced}
              onChange={(e) => handleInputChange('grantsSurfaced', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value={1}>1 grant (most relevant only)</option>
              <option value={2}>2 grants (top matches)</option>
              <option value={3}>3 grants (more options)</option>
              <option value={5}>5 grants (comprehensive view)</option>
            </select>
          ) : (
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
              {formData.grantsSurfaced} grant{formData.grantsSurfaced !== 1 ? 's' : ''} per search
            </div>
          )}
          <small style={{ color: '#666', fontSize: '12px' }}>
            Number of top-matching grants to surface per search
          </small>
        </div>

        {/* Auto Mode Toggle */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            Automatic Search
          </label>
          {isEditing ? (
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.autoOn}
                onChange={(e) => handleInputChange('autoOn', e.target.checked)}
                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
              />
              <span style={{ fontSize: '14px' }}>
                Enable automatic grant discovery
              </span>
            </label>
          ) : (
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
              <span style={{
                color: formData.autoOn ? '#28a745' : '#dc3545',
                fontWeight: 'bold'
              }}>
                {formData.autoOn ? '✅ Enabled' : '❌ Disabled'}
              </span>
              <span style={{ color: '#666', marginLeft: '10px' }}>
                {formData.autoOn ? 'Agent will search automatically' : 'Manual search only'}
              </span>
            </div>
          )}
          <small style={{ color: '#666', fontSize: '12px' }}>
            When enabled, the agent will automatically search for grants at the specified interval
          </small>
        </div>

        {/* Storage Duration */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
            Storage Duration (days)
          </label>
          {isEditing ? (
            <select
              value={formData.storageDuration}
              onChange={(e) => handleInputChange('storageDuration', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value={1}>1 day (minimal storage)</option>
              <option value={3}>3 days (short-term)</option>
              <option value={7}>7 days (one week)</option>
            </select>
          ) : (
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
              {formData.storageDuration} days
              <span style={{ color: '#666', marginLeft: '10px' }}>
                ({formData.storageDuration === 1 ? 'Minimal storage' :
                  formData.storageDuration === 3 ? 'Short-term' :
                    formData.storageDuration === 7 ? 'One week' :
                      `${formData.storageDuration} days`})
              </span>
            </div>
          )}
          <small style={{ color: '#666', fontSize: '12px' }}>
            How long to keep discovered grants in your dashboard
          </small>
        </div>

        {/* Configuration Summary */}
        {!isEditing && (
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #bbdefb'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>📊 Current Configuration</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#1976d2' }}>
              <li>Search every <strong>{formData.timeInterval} hours</strong></li>
              <li>Surface <strong>{formData.grantsSurfaced} grant{formData.grantsSurfaced !== 1 ? 's' : ''}</strong> per search</li>
              <li>Automatic search: <strong>{formData.autoOn ? 'Enabled' : 'Disabled'}</strong></li>
              <li>Using profile: <strong>{formData.profileSelected || 'None selected'}</strong></li>
              <li>Keep grants for <strong>{formData.storageDuration} days</strong></li>
            </ul>
          </div>
        )}

        {/* Validation Message */}
        {isEditing && !formData.profileSelected && (
          <div style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#fff3cd',
            color: '#856404',
            borderRadius: '4px',
            border: '1px solid #ffeaa7'
          }}>
            ⚠️ Please select a research profile to continue
          </div>
        )}
      </div>

      {/* Status Information */}
      {config && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📈 Agent Status</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px' }}>
            <div>
              <strong>Status:</strong>
              <span style={{
                color: config.isActive ? '#28a745' : '#dc3545',
                marginLeft: '5px'
              }}>
                {config.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <strong>Created:</strong> {new Date(config.createdAt).toLocaleDateString()}
            </div>
            <div>
              <strong>Last Updated:</strong> {new Date(config.updatedAt).toLocaleDateString()}
            </div>
            {config.lastRun && (
              <div>
                <strong>Last Run:</strong> {new Date(config.lastRun).toLocaleString()}
              </div>
            )}
            {config.nextRun && (
              <div>
                <strong>Next Run:</strong> {new Date(config.nextRun).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fff8e1',
        borderRadius: '4px',
        border: '1px solid #ffcc02'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#f57f17' }}>💡 How It Works</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#ef6c00', fontSize: '14px' }}>
          <li><strong>Profile Selection:</strong> Choose which research profile to use for grant matching</li>
          <li><strong>Search Interval:</strong> How often the agent searches for new grants</li>
          <li><strong>Grants Surfaced:</strong> Number of best-matching grants to show you</li>
          <li><strong>Auto Mode:</strong> Whether the agent runs automatically or manually</li>
          <li><strong>Storage Duration:</strong> How long grants stay in your dashboard</li>
        </ul>
      </div>
    </div>
  );
};

export default AgentConfigUI;