import React, { useState } from 'react';
import ProposalsList from './ProposalsList';
import PromptManager from '../Prompts/PromptManager';

const ProposalsManager = () => {
  const [activeTab, setActiveTab] = useState('current');

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '20px',
        backgroundColor: '#dbeafe',
        borderBottom: '1px solid #93c5fd'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#1e3a8a' }}>
          <img src="/BedrockIcon.png" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '8px' }} />
          Proposals
        </h2>
        <p style={{ margin: 0, color: '#1e40af' }}>
          Manage your AI-generated grant proposals and prompt templates.
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <TabButton
          active={activeTab === 'current'}
          onClick={() => setActiveTab('current')}
          icon="📋"
          label="Current Proposals"
        />
        <TabButton
          active={activeTab === 'prompts'}
          onClick={() => setActiveTab('prompts')}
          icon={<img src="/create-prompt-icon.svg" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
          label="Prompts"
        />
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'current' && <ProposalsList />}
        {activeTab === 'prompts' && <PromptManager />}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '15px 30px',
      border: 'none',
      backgroundColor: active ? 'white' : 'transparent',
      borderBottom: active ? '3px solid #3b82f6' : '3px solid transparent',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: active ? 'bold' : 'normal',
      color: active ? '#1e40af' : '#6b7280',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.target.style.backgroundColor = '#f3f4f6';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.target.style.backgroundColor = 'transparent';
      }
    }}
  >
    {icon} {label}
  </button>
);

export default ProposalsManager;
