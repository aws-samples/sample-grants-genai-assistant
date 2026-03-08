import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import outputs from '../../amplify_outputs.json';
import './PromptManager.css';

const client = generateClient();
const AWS_REGION = outputs?.auth?.aws_region || 'us-east-1';

const getConsoleUrl = (promptId) =>
  `https://${AWS_REGION}.console.aws.amazon.com/bedrock/home?region=${AWS_REGION}#/prompt-management/${promptId}`;

const PromptManager = () => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptDetails, setPromptDetails] = useState(null);
  const [testInput, setTestInput] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);

    try {
      const listPromptsQuery = `
        query ListPrompts {
          listPrompts
        }
      `;

      const { data, errors } = await client.graphql({
        query: listPromptsQuery
      });

      if (data && data.listPrompts) {
        const result = typeof data.listPrompts === 'string' ? JSON.parse(data.listPrompts) : data.listPrompts;
        setPrompts(result.prompts || []);
      } else if (errors) {
        setError(errors[0].message || 'Failed to load prompts');
      }
    } catch (err) {
      setError(`Error loading prompts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPromptDetails = async (promptId) => {
    setLoading(true);
    setError(null);
    setPromptDetails(null);
    setTestResult(null);

    try {
      const getPromptQuery = `
        query GetPrompt($promptId: String!) {
          getPrompt(promptId: $promptId)
        }
      `;

      const { data, errors } = await client.graphql({
        query: getPromptQuery,
        variables: { promptId }
      });

      if (data && data.getPrompt) {
        const result = typeof data.getPrompt === 'string' ? JSON.parse(data.getPrompt) : data.getPrompt;
        setPromptDetails(result.prompt);
        setSelectedPrompt(promptId);

        // Initialize test input with empty values for all variables
        const variant = result.prompt.variants[0];
        if (variant && variant.inputVariables) {
          const initialInput = {};
          variant.inputVariables.forEach(v => {
            initialInput[v.name] = '';
          });
          setTestInput(initialInput);
        }
      } else if (errors) {
        setError(errors[0].message || 'Failed to load prompt details');
      }
    } catch (err) {
      setError(`Error loading prompt details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testPrompt = async () => {
    if (!selectedPrompt) return;

    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const testPromptQuery = `
        query TestPrompt($promptId: String!, $testInput: AWSJSON!) {
          testPrompt(promptId: $promptId, testInput: $testInput)
        }
      `;

      const { data, errors } = await client.graphql({
        query: testPromptQuery,
        variables: {
          promptId: selectedPrompt,
          testInput: JSON.stringify(testInput)
        }
      });

      if (data && data.testPrompt) {
        const result = typeof data.testPrompt === 'string' ? JSON.parse(data.testPrompt) : data.testPrompt;
        setTestResult(result);
      } else if (errors) {
        setError(errors[0].message || 'Failed to test prompt');
      }
    } catch (err) {
      setError(`Error testing prompt: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (varName, value) => {
    setTestInput(prev => ({
      ...prev,
      [varName]: value
    }));
  };

  return (
    <div className="prompt-manager">
      <div className="prompt-manager-header">
        <h2>
          <img src="/create-prompt-icon.svg" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '8px' }} />
          Bedrock Prompt Management
        </h2>
        <button onClick={loadPrompts} disabled={loading} className="refresh-btn">
          {loading ? '⟳ Loading...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="prompt-manager-content">
        {/* Prompts List */}
        <div className="prompts-list">
          <h3>Available Prompts ({prompts.length})</h3>
          {loading && prompts.length === 0 ? (
            <div className="loading">Loading prompts...</div>
          ) : (
            <div className="prompt-cards">
              {prompts.map(prompt => (
                <div
                  key={prompt.id}
                  className={`prompt-card ${selectedPrompt === prompt.id ? 'selected' : ''}`}
                  onClick={() => loadPromptDetails(prompt.id)}
                >
                  <div className="prompt-card-header">
                    <strong>{prompt.name}</strong>
                    <span className="prompt-version">{prompt.version}</span>
                  </div>
                  {prompt.description && (
                    <div className="prompt-description">{prompt.description}</div>
                  )}
                  <div className="prompt-meta">
                    <small>ID: {prompt.id}</small>
                    <a
                      href={getConsoleUrl(prompt.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', marginLeft: '8px', color: '#6b7280' }}
                      title="Opens in AWS Console — requires AdministratorAccess to edit"
                    >
                      🔗 Edit in AWS Console
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prompt Details */}
        {promptDetails && (
          <div className="prompt-details">
            <h3>Prompt Details</h3>

            <div className="detail-section">
              <label>Name:</label>
              <div>{promptDetails.name}</div>
            </div>

            <div className="detail-section">
              <label>ID:</label>
              <div className="mono">
                {promptDetails.id}
                <a
                  href={getConsoleUrl(promptDetails.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: '12px', fontSize: '12px', color: '#3b82f6' }}
                >
                  🔗 Open in AWS Console
                </a>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  If logged into AWS with AdministratorAccess, this link opens the prompt directly for editing.
                </div>
              </div>
            </div>

            {promptDetails.description && (
              <div className="detail-section">
                <label>Description:</label>
                <div>{promptDetails.description}</div>
              </div>
            )}

            {promptDetails.variants && promptDetails.variants.map((variant, idx) => (
              <div key={idx} className="variant-section">
                <h4>Variant: {variant.name}</h4>

                <div className="detail-section">
                  <label>Model:</label>
                  <div className="mono">{variant.modelId}</div>
                </div>

                {variant.text && (
                  <div className="detail-section">
                    <label>Prompt Template:</label>
                    <pre className="prompt-text">{variant.text}</pre>
                  </div>
                )}

                {variant.inputVariables && variant.inputVariables.length > 0 && (
                  <div className="detail-section">
                    <label>Input Variables:</label>
                    <div className="input-variables">
                      {variant.inputVariables.map(v => (
                        <div key={v.name} className="input-variable">
                          <label>{v.name}:</label>
                          <textarea
                            value={testInput[v.name] || ''}
                            onChange={(e) => handleInputChange(v.name, e.target.value)}
                            placeholder={`Enter ${v.name}...`}
                            rows={3}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="test-section">
                  <button
                    onClick={testPrompt}
                    disabled={testing}
                    className="test-btn"
                  >
                    {testing ? '⟳ Testing...' : '▶ Test Prompt'}
                  </button>
                </div>

                {testResult && (
                  <div className="test-result">
                    <h4>Test Result:</h4>
                    <div className="result-meta">
                      <span>Model: {testResult.modelId}</span>
                      {testResult.usage && (
                        <span>
                          Tokens: {testResult.usage.input_tokens} in / {testResult.usage.output_tokens} out
                        </span>
                      )}
                    </div>
                    <pre className="result-text">{testResult.result}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptManager;
