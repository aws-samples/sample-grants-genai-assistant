import React, { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import ChatWindow from '../Chat/ChatWindow';
// Removed EventsApiProvider - using pure Amplify GraphQL now

const AppLayout = ({ children }) => {
  const [activeSection, setActiveSection] = useState('graphql');
  const [isChatOpen, setIsChatOpen] = useState(false); // Chat starts closed

  const navigationItems = [
    { id: 'profiles', label: '👤 User Profiles', description: 'Manage researcher profiles' },
    { id: 'graphql', label: '🔍 Search', description: 'Natural language search' },
    { id: 'proposals', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><img src="/BedrockIcon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> Proposals</span>, description: 'Proposals & prompts' },
    { id: 'knowledge-base', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><img src="/OpenSearchIcon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> Knowledge Base</span>, description: 'Document library & search' },
    { id: 'agent-config', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><img src="/AgenticAIIcon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> Agent Config</span>, description: 'Autonomous agent config' },
    { id: 'agent-grants', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><img src="/AgentCoreIcon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> Agent Selected Grants</span>, description: 'View discovery results' },
    { id: 'e2e-tests', label: '🧪 E2E Tests Documentation', description: 'User workflow tests' }
  ];

  // Debug logs
  console.log('🚨 DEBUG: AppLayout loaded - isChatOpen:', isChatOpen);
  console.log('🚨 DEBUG: Navigation items:', navigationItems.length);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
          {/* Left Navigation */}
          <nav style={{
            width: '280px',
            backgroundColor: '#1e3a8a',
            color: 'white',
            padding: '20px 0',
            boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ padding: '0 20px', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                🎯 Grant Matchmaking
              </h1>
              <div style={{ marginTop: '10px' }}>
                <p style={{
                  margin: '0 0 8px 0',
                  opacity: 0.9,
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  lineHeight: '1.3'
                }}>
                  {user?.username}
                </p>
                <button
                  onClick={signOut}
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Institution Logo */}
            <div style={{ padding: '0 20px', marginBottom: '20px', textAlign: 'center' }}>
              <img
                src="/aws-samples-img.png"
                alt="Institution Logo"
                style={{
                  maxWidth: '40%',
                  height: 'auto',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* Navigation Items */}
            <div style={{ paddingBottom: '80px' }}>
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    width: '100%',
                    padding: '15px 20px',
                    border: 'none',
                    backgroundColor: activeSection === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderLeft: activeSection === item.id ? '4px solid white' : '4px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== item.id) {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== item.id) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                    {item.description}
                  </div>
                </button>
              ))}
            </div>


          </nav>

          {/* Main Content */}
          <main style={{ flex: 1, backgroundColor: 'white' }}>
            {React.cloneElement(children, { activeSection })}
          </main>

          {/* Chat Window */}
          <ChatWindow
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(!isChatOpen)}
          />
        </div>
      )}
    </Authenticator>
  );
};

export default AppLayout;