import React from 'react';
import GrantSearch from './Search/GrantSearch';
import AmplifyGrantSearch from './Search/AmplifyGrantSearch';
// RealtimeGrantChannels removed - using GraphQL subscriptions instead
import ProfilesPanel from './Profiles/ProfilesPanel';
import TemplatesPanel from './Templates/TemplatesPanel';
import AgentConfigUI from './AgentConfig/AgentConfigUI';
import AgentConfigTest from './AgentConfig/AgentConfigTest';
import AgentSelectedGrants from './AgentGrants/AgentSelectedGrants';
import KnowledgeBaseManager from './KnowledgeBase/KnowledgeBaseManager';
import ProposalsManager from './Proposals/ProposalsManager';
import E2EWorkflowTests from './Testing/E2EWorkflowTests';

const MainContent = ({ activeSection }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'search':
        return <AmplifyGrantSearch />;
      case 'graphql':
        return (
          <div>
            <div style={{
              padding: '20px',
              backgroundColor: '#e8f5e8',
              borderBottom: '1px solid #c3e6c3',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>
                🔍 US and EU Grant Search
              </h2>
              <p style={{ margin: 0, color: '#388e3c' }}>
                AI-powered grant discovery with real-time streaming results and intelligent matching.
              </p>
            </div>
            <AmplifyGrantSearch />
          </div>
        );

      case 'channels':
        return <div>RealtimeGrantChannels removed - use GraphQL subscriptions instead</div>;
      case 'profiles':
        return <ProfilesPanel />;
      case 'proposals':
        return <ProposalsManager />;
      case 'templates':
        return (
          <div>
            <div style={{
              padding: '20px',
              backgroundColor: '#f0f8ff',
              borderBottom: '1px solid #b3d9ff',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
                <img src="/BedrockIcon.png" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '8px' }} />
                Generated Proposals
              </h2>
              <p style={{ margin: 0, color: '#1565c0' }}>
                AI-generated grant proposals based on your research profile and matching grants.
              </p>
            </div>
            <TemplatesPanel />
          </div>
        );
      case 'agent-config':
        return <AgentConfigUI />;
      case 'knowledge-base':
        return <KnowledgeBaseManager />;
      case 'agent-grants':
        return (
          <div>
            <div style={{
              padding: '20px',
              backgroundColor: '#f0f4ff',
              borderBottom: '1px solid #c7d2fe',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#4338ca' }}>
                <img src="/AgentCoreIcon.png" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '8px' }} />
                Agent Selected Grants
              </h2>
              <p style={{ margin: 0, color: '#5b21b6' }}>
                View and download grants discovered by your autonomous research agent.
              </p>
            </div>
            <AgentSelectedGrants />
          </div>
        );
      case 'e2e-tests':
        return <E2EWorkflowTests />;
      default:
        return <GrantSearch />;
    }
  };

  return (
    <div style={{ height: '100%' }}>
      {renderContent()}
    </div>
  );
};

export default MainContent;