import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import GrantCard from './GrantCard';
import './AgentSelectedGrants.css';
import outputs from '../../amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs);

const client = generateClient();

const AgentSelectedGrants = () => {
  const [grantsData, setGrantsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'us', 'eu'

  useEffect(() => {
    console.log('🚀 [MOUNT] AgentSelectedGrants component mounted - calling loadLatestGrants');
    loadLatestGrants();
  }, []);

  const loadLatestGrants = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [START] Loading agent-discovered grants...');

      const user = await getCurrentUser();
      const currentUserId = user.userId || user.username;

      console.log('👤 [USER] Current user ID:', currentUserId);
      console.log('👤 [USER] Full user object:', JSON.stringify(user, null, 2));

      const listQuery = `
        query ListDiscoveryResults {
          listDiscoveryResults
        }
      `;

      console.log('📡 [GRAPHQL] Sending listDiscoveryResults query...');

      const response = await client.graphql({
        query: listQuery
      });

      console.log('📡 [GRAPHQL] Raw response:', JSON.stringify(response, null, 2));

      let result = response.data.listDiscoveryResults;
      console.log('📦 [DATA] listDiscoveryResults data (before parse):', typeof result, result);

      if (typeof result === 'string') {
        console.log('🔄 [PARSE] Parsing string result...');
        result = JSON.parse(result);
        console.log('📦 [DATA] Parsed result:', JSON.stringify(result, null, 2));
      }

      if (result && result.objects && result.objects.length > 0) {
        console.log(`📊 [FILES] Found ${result.objects.length} total files`);
        console.log('📋 [FILES] All file keys:', result.objects.map(o => o.key));

        // ONLY use consolidated files - no fallbacks
        const consolidatedFiles = result.objects.filter(obj =>
          obj.key && obj.key.includes('/consolidated_')
        );

        console.log(`📊 [FILTER] Consolidated files: ${consolidatedFiles.length}`);
        console.log('📋 [FILTER] Consolidated file keys:', consolidatedFiles.map(f => f.key));

        if (consolidatedFiles.length === 0) {
          console.log('⚠️  [EMPTY] No consolidated files found');
          console.log('💡 [HINT] Discovery may still be running or no results yet');
          setGrantsData(null);
          setError(null); // Don't show error, just show empty state
          return;
        }

        // Get the most recent consolidated file
        console.log('🔄 [SORT] Sorting consolidated files by lastModified...');
        const sortedFiles = consolidatedFiles.sort((a, b) =>
          new Date(b.lastModified) - new Date(a.lastModified)
        );
        const latestFile = sortedFiles[0];

        console.log(`📄 [LATEST] Latest file: ${latestFile.key}`);
        console.log(`📅 [LATEST] Last modified: ${latestFile.lastModified}`);
        console.log(`📦 [LATEST] Full file object:`, JSON.stringify(latestFile, null, 2));

        // Get file content
        const contentQuery = `
          query GetDiscoveryResultContent($key: String!) {
            getDiscoveryResultContent(key: $key)
          }
        `;

        console.log('📡 [GRAPHQL] Fetching file content for key:', latestFile.key);

        const contentResponse = await client.graphql({
          query: contentQuery,
          variables: { key: latestFile.key }
        });

        console.log('📡 [GRAPHQL] Content response:', JSON.stringify(contentResponse, null, 2));

        let contentResult = contentResponse.data.getDiscoveryResultContent;
        console.log('📦 [CONTENT] Content result (before parse):', typeof contentResult);

        if (typeof contentResult === 'string') {
          console.log('🔄 [PARSE] Parsing content string...');
          contentResult = JSON.parse(contentResult);
        }

        console.log('📦 [CONTENT] Parsed content result:', JSON.stringify(contentResult, null, 2));

        if (contentResult && contentResult.content) {
          const data = contentResult.content;
          console.log(`✅ [SUCCESS] Loaded consolidated grants data`);
          console.log(`📊 [STATS] Total grants: ${data.grants?.length || 0}`);
          console.log(`📊 [STATS] US grants: ${data.usGrantsSurfaced || 0}`);
          console.log(`📊 [STATS] EU grants: ${data.euGrantsSurfaced || 0}`);
          console.log(`📊 [STATS] Discovery type: ${data.discoveryType}`);
          console.log(`📦 [DATA] Full grants data:`, JSON.stringify(data, null, 2));

          // Even if grants array is empty, set the data so we can show metadata
          setGrantsData(data);

          // Set default tab based on what's available
          if (data.grants && data.grants.length > 0) {
            if (data.usGrantsSurfaced > 0 && data.euGrantsSurfaced > 0) {
              setActiveTab('all');
            } else if (data.usGrantsSurfaced > 0) {
              setActiveTab('us');
            } else if (data.euGrantsSurfaced > 0) {
              setActiveTab('eu');
            }
          }
        } else {
          console.log('❌ [ERROR] No content in contentResult');
          console.log('📦 [DEBUG] contentResult:', JSON.stringify(contentResult, null, 2));
          setError('No content received from consolidated file');
        }
      } else {
        console.log(`ℹ️  [EMPTY] No result files found for user: ${currentUserId}`);
        console.log('📦 [DEBUG] Result object:', JSON.stringify(result, null, 2));
        setGrantsData(null);
        setError('No discovery results yet. Run agent discovery to see grants.');
      }
    } catch (err) {
      console.error('❌ [ERROR] Error loading grants:', err);
      console.error('❌ [ERROR] Error stack:', err.stack);
      console.error('❌ [ERROR] Error details:', JSON.stringify(err, null, 2));
      setError(err.message || 'Failed to load grants data');
    } finally {
      console.log('🏁 [END] Loading complete');
      setLoading(false);
    }
  };

  // Get grants to display based on active tab
  const getDisplayGrants = () => {
    if (!grantsData) return [];

    if (activeTab === 'us') {
      return grantsData.usGrants || [];
    } else if (activeTab === 'eu') {
      return grantsData.euGrants || [];
    } else {
      // 'all' tab - use combined grants array
      return grantsData.grants || [];
    }
  };

  const displayGrants = getDisplayGrants();
  const hasUsGrants = grantsData && (grantsData.usGrantsSurfaced || 0) > 0;
  const hasEuGrants = grantsData && (grantsData.euGrantsSurfaced || 0) > 0;

  if (loading) {
    return (
      <div className="agent-grants-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading agent-discovered grants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agent-grants-container">
        <div className="error-state">
          <h3>{error.includes('processing') ? 'Discovery In Progress' : 'Error Loading Grants'}</h3>
          <p>{error}</p>
          <button onClick={loadLatestGrants} className="retry-button">
            {error.includes('processing') ? 'Check Again' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  if (!grantsData || !grantsData.grants || grantsData.grants.length === 0) {
    // Check if we have metadata (discovery ran but no grants above threshold)
    if (grantsData && grantsData.timestamp) {
      return (
        <div className="agent-grants-container">
          <div className="empty-state">
            <h3>No Grants Above Threshold</h3>
            <p>Discovery ran on {new Date(grantsData.timestamp).toLocaleDateString()} but found no grants meeting the minimum profile match threshold (10%).</p>
            <p>Found {grantsData.totalGrantsFound || 0} total grants, but none scored high enough for your profile.</p>
            <button onClick={loadLatestGrants} className="retry-button">
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="agent-grants-container">
        <div className="empty-state">
          <h3>No Agent-Discovered Grants Yet</h3>
          <p>Your autonomous agent discovery is configured and will run automatically based on your schedule.</p>
          <p>Results will appear here after the next scheduled discovery run.</p>
          <button onClick={loadLatestGrants} className="retry-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-grants-container">
      <div className="grants-header">
        <h2>
          <img src="/AgentCoreIcon.png" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '8px' }} />
          Agent-Discovered Grants
        </h2>
        <div className="grants-summary">
          <span className="discovery-date">
            Discovered: {new Date(grantsData.timestamp).toLocaleDateString()}
          </span>
          <span className="grants-count">
            Found {grantsData.totalGrantsFound} grants, surfaced top {grantsData.grantsSurfaced}
          </span>
          {(hasUsGrants || hasEuGrants) && (
            <span className="regional-breakdown">
              ({hasUsGrants && `${grantsData.usGrantsSurfaced} US`}
              {hasUsGrants && hasEuGrants && ' + '}
              {hasEuGrants && `${grantsData.euGrantsSurfaced} EU`})
            </span>
          )}
        </div>
      </div>

      {/* Regional Tabs - only show if we have both regions */}
      {hasUsGrants && hasEuGrants && (
        <div className="grants-tabs">
          <button
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            🌍 All Grants ({grantsData.grantsSurfaced})
          </button>
          <button
            className={`tab-button ${activeTab === 'us' ? 'active' : ''}`}
            onClick={() => setActiveTab('us')}
          >
            🇺🇸 US Grants ({grantsData.usGrantsSurfaced})
          </button>
          <button
            className={`tab-button ${activeTab === 'eu' ? 'active' : ''}`}
            onClick={() => setActiveTab('eu')}
          >
            🇪🇺 EU Grants ({grantsData.euGrantsSurfaced})
          </button>
        </div>
      )}

      <div className="grants-content">
        <div className="grants-cards-section">
          <h4>
            {activeTab === 'all' && 'All Discovered Grants'}
            {activeTab === 'us' && '🇺🇸 US Grants'}
            {activeTab === 'eu' && '🇪🇺 EU Grants'}
          </h4>
          {displayGrants.length > 0 ? (
            <div className="grants-cards-grid">
              {displayGrants.map((grant, index) => (
                <GrantCard
                  key={grant.id || index}
                  grant={grant}
                  index={index}
                  totalGrants={displayGrants.length}
                />
              ))}
            </div>
          ) : (
            <div className="empty-tab-state">
              <p>No grants found for this region.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentSelectedGrants;
