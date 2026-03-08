import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const TokenDebugger = () => {
  const [tokens, setTokens] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getTokens();
  }, []);

  const getTokens = async () => {
    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString();
      const idToken = session.tokens?.idToken?.toString();
      
      setTokens({
        accessToken,
        idToken
      });
      
      // Log to console for easy copying
      console.log('🔑 TokenDebugger - Access Token for Console:', accessToken);
      console.log('🔑 TokenDebugger - ID Token:', idToken);
      
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div style={{ padding: '20px', border: '1px solid #red', borderRadius: '5px', margin: '10px' }}>
        <h3>🔑 Token Debugger - Error</h3>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={getTokens}>Retry</button>
      </div>
    );
  }

  if (!tokens) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px', margin: '10px' }}>
        <h3>🔑 Token Debugger</h3>
        <p>Loading tokens...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px', margin: '10px' }}>
      <h3>🔑 JWT Token Debugger</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Access Token (for Events API Console):</h4>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '3px', 
          wordBreak: 'break-all',
          fontSize: '12px',
          fontFamily: 'monospace',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          {tokens.accessToken}
        </div>
        <button 
          onClick={() => copyToClipboard(tokens.accessToken)}
          style={{ 
            marginTop: '10px', 
            padding: '5px 10px', 
            backgroundColor: copied ? '#4CAF50' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          {copied ? '✅ Copied!' : '📋 Copy Access Token'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4>Instructions for Console Testing:</h4>
        <ol style={{ fontSize: '14px' }}>
          <li>Copy the Access Token above</li>
          <li>Go to AWS Console → AppSync → Events API</li>
          <li>In Subscribe section:</li>
          <ul>
            <li>Change Authentication type to: <strong>AMAZON_COGNITO_USER_POOLS</strong></li>
            <li>Paste token in Authorization token field</li>
            <li>Set Channel to: <strong>/grants/channel</strong></li>
          </ul>
          <li>Click Subscribe - should work now!</li>
        </ol>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p><strong>Token Info:</strong></p>
        <p>Access Token Length: {tokens.accessToken?.length} chars</p>
        <p>ID Token Length: {tokens.idToken?.length} chars</p>
        <button onClick={getTokens} style={{ fontSize: '12px', padding: '3px 6px' }}>
          🔄 Refresh Tokens
        </button>
      </div>
    </div>
  );
};

export default TokenDebugger;