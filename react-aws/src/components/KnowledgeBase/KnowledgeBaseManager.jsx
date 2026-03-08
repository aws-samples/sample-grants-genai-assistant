import React, { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import GrantGuidelineUpload from './GrantGuidelineUpload';
import DocumentList from './DocumentList';
import SearchInterface from './SearchInterface';
import ErrorBoundary from './ErrorBoundary';

const KnowledgeBaseManager = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  const handleErrorReset = () => {
    setErrorBoundaryKey(prev => prev + 1);
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '20px',
        backgroundColor: '#fef3c7',
        borderBottom: '1px solid #fde68a'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#92400e' }}>
          <img src="/OpenSearchIcon.png" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '8px' }} />
          Knowledge Base
        </h2>
        <p style={{ margin: 0, color: '#b45309' }}>
          Upload, manage, and search your research documents with AI-powered semantic search.
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <TabButton
          active={activeTab === 'upload'}
          onClick={() => setActiveTab('upload')}
          icon="📤"
          label="Upload Documents"
        />
        <TabButton
          active={activeTab === 'grant-guidelines'}
          onClick={() => setActiveTab('grant-guidelines')}
          icon="📋"
          label="Grant Guidelines"
        />
        <TabButton
          active={activeTab === 'documents'}
          onClick={() => setActiveTab('documents')}
          icon="📁"
          label="My Documents"
        />
        <TabButton
          active={activeTab === 'search'}
          onClick={() => setActiveTab('search')}
          icon="🔎"
          label="Search"
        />
      </div>

      {/* Tab Content */}
      <ErrorBoundary key={errorBoundaryKey} onReset={handleErrorReset}>
        <div style={{ padding: '20px' }}>
          {activeTab === 'upload' && <DocumentUpload onUploadComplete={() => setActiveTab('documents')} />}
          {activeTab === 'grant-guidelines' && <GrantGuidelineUpload onUploadComplete={() => setActiveTab('documents')} />}
          {activeTab === 'documents' && <DocumentList />}
          {activeTab === 'search' && <SearchInterface />}
        </div>
      </ErrorBoundary>
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

export default KnowledgeBaseManager;
