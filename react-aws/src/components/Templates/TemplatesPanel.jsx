import React from 'react';

const TemplatesPanel = () => {
  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>📄 Grant Templates</h1>
      
      <div style={{ 
        padding: '40px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        textAlign: 'center',
        border: '2px dashed #dee2e6'
      }}>
        <h3 style={{ color: '#666', marginBottom: '15px' }}>AI-Powered Proposal Generation</h3>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
          Generate grant proposals using AI based on your research profile and selected grants.
        </p>
        <p style={{ color: '#999', fontSize: '14px' }}>
          Coming soon in the next phase of development...
        </p>
      </div>
    </div>
  );
};

export default TemplatesPanel;