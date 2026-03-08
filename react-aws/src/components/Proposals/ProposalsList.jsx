import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import EvaluationDetailsModal from './EvaluationDetailsModal';

const client = generateClient();

// Semantic Search Quality Badge Component
const ContentQualityBadge = ({ quality }) => {
  if (!quality) return null;

  const getIcon = (color) => {
    // Using network/connection icons to represent semantic similarity
    switch (color) {
      case 'green': return '🔗'; // Strong connections
      case 'yellow': return '⚡'; // Moderate connections
      case 'orange': return '🔸'; // Weak connections
      case 'red': return '⚠️'; // Poor connections
      default: return '🔍';
    }
  };

  const getTooltip = (quality) => {
    return `Semantic Search Quality: ${quality.level}\n\n` +
      `This measures how well your uploaded documents\n` +
      `semantically match the grant requirements.\n\n` +
      `Average Similarity Score: ${quality.avgScore.toFixed(2)}\n` +
      `Score Range: ${quality.minScore.toFixed(2)} - ${quality.maxScore.toFixed(2)}\n\n` +
      `${quality.message}\n\n` +
      `${quality.recommendation}`;
  };

  const getBadgeStyle = (color) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      marginRight: '8px',
      cursor: 'help',
      whiteSpace: 'nowrap'
    };

    const colorStyles = {
      green: {
        backgroundColor: '#d4edda',
        color: '#155724',
        border: '1px solid #c3e6cb'
      },
      yellow: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeaa7'
      },
      orange: {
        backgroundColor: '#ffe5d0',
        color: '#d63031',
        border: '1px solid #ffccb3'
      },
      red: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb'
      }
    };

    return { ...baseStyle, ...(colorStyles[color] || colorStyles.red) };
  };

  return (
    <div
      style={getBadgeStyle(quality.color)}
      title={getTooltip(quality)}
    >
      <span style={{ fontSize: '14px' }}>
        {getIcon(quality.color)}
      </span>
      <span style={{ fontSize: '11px', opacity: 0.7, marginRight: '2px' }}>
        Semantic:
      </span>
      <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {quality.level}
      </span>
    </div>
  );
};

// Evaluation Button Component (clickable badge that opens modal)
const EvaluationButton = ({ evaluation, onClick }) => {
  if (!evaluation) return null;

  const getGradeColor = (grade) => {
    if (!grade) return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };

    const firstChar = grade.charAt(0);
    switch (firstChar) {
      case 'A':
        return { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' };
      case 'B':
        return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
      case 'C':
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'D':
        return { bg: '#ffe5d0', text: '#d63031', border: '#ffccb3' };
      case 'F':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
    }
  };

  const getTooltip = (evaluation) => {
    const scores = evaluation.scores || {};
    return `Click to view detailed evaluation\n\n` +
      `Overall Grade: ${evaluation.overallGrade} (${(evaluation.overallScore * 100).toFixed(0)}%)\n` +
      `Confidence: ${evaluation.confidence}\n\n` +
      `Evaluation Breakdown:\n` +
      `• Content Quality (30%): ${scores.contentQuality?.grade || 'N/A'}\n` +
      `• Guideline Adherence (40%): ${scores.guidelineAdherence?.grade || 'N/A'}\n` +
      `• Completeness (20%): ${scores.completeness?.grade || 'N/A'}\n` +
      `• Source Utilization (10%): ${scores.sourceUtilization?.grade || 'N/A'}\n\n` +
      `Strengths: ${evaluation.strengths?.length || 0}\n` +
      `Weaknesses: ${evaluation.weaknesses?.length || 0}\n` +
      `Recommendations: ${evaluation.recommendations?.length || 0}\n` +
      `${evaluation.redFlags?.length > 0 ? `⚠️ Red Flags: ${evaluation.redFlags.length}` : ''}`;
  };

  const colors = getGradeColor(evaluation.overallGrade);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: '600',
        marginRight: '8px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        transition: 'all 0.2s'
      }}
      title={getTooltip(evaluation)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span style={{ fontSize: '16px' }}>📊</span>
      <span style={{ fontSize: '12px', opacity: 0.8, marginRight: '2px' }}>
        Quality:
      </span>
      <span style={{ fontWeight: '700', fontSize: '16px' }}>{evaluation.overallGrade}</span>
      <span style={{ fontSize: '13px', opacity: 0.8 }}>
        ({(evaluation.overallScore * 100).toFixed(0)}%)
      </span>
    </button>
  );
};

const ProposalsList = () => {
  console.log('🚀 ProposalsList component loaded - VERSION 2');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [selectedError, setSelectedError] = useState(null);

  useEffect(() => {
    loadProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const user = await getCurrentUser();
      const currentUserId = user.userId || user.username;

      console.log('📋 Loading proposals for user:', currentUserId);

      const listProposalsQuery = `
        query ListProposalsByUser($userId: String!) {
          listProposalsByUser(userId: $userId)
        }
      `;

      const response = await client.graphql({
        query: listProposalsQuery,
        variables: {
          userId: currentUserId
        },
        authMode: 'userPool'
      });

      console.log('✅ Proposals response:', response);

      // Extract items from the JSON response
      const jsonString = response.data.listProposalsByUser;
      console.log('📄 Raw JSON string from Lambda:', jsonString);

      // Parse the JSON string returned by the Lambda
      let proposalsData = [];
      if (jsonString) {
        try {
          const parsed = JSON.parse(jsonString);
          console.log('📦 Parsed data:', parsed);
          proposalsData = parsed.items || [];
        } catch (parseError) {
          console.error('❌ Error parsing proposals JSON:', parseError);
          console.error('❌ Raw string that failed to parse:', jsonString);
          proposalsData = [];
        }
      }

      // Sort proposals by creation date (newest first)
      const sortedProposals = Array.isArray(proposalsData)
        ? proposalsData.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB - dateA; // Descending order (newest first)
        })
        : [];

      console.log(`📊 Loaded ${sortedProposals.length} proposals`);

      setProposals(sortedProposals);

    } catch (err) {
      console.error('❌ Error loading proposals:', err);
      setError(err.message || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
      'GENERATING': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
      'COMPLETED': { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
      'FAILED': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }
    };
    return colors[status] || colors['DRAFT'];
  };

  const getStatusIcon = (status) => {
    const icons = {
      'DRAFT': '📝',
      'GENERATING': '⚙️',
      'COMPLETED': '✅',
      'FAILED': '❌'
    };
    return icons[status] || '📄';
  };

  // Handle download via Lambda proxy (no presigned URLs)
  // Lambda verifies ownership and streams S3 content directly
  const handleDownload = async (proposal) => {
    console.log('📥 handleDownload called for proposal:', proposal.id);

    try {
      const downloadQuery = `
        query DownloadProposal($proposalId: String!, $format: String!) {
          downloadProposal(proposalId: $proposalId, format: $format)
        }
      `;

      const response = await client.graphql({
        query: downloadQuery,
        variables: {
          proposalId: proposal.id,
          format: 'html'
        },
        authMode: 'userPool'
      });

      const result = JSON.parse(response.data.downloadProposal);

      if (result.statusCode !== 200) {
        const errorBody = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
        alert(`Download failed: ${errorBody.error || 'Unknown error'}`);
        return;
      }

      // Decode base64 content
      const content = atob(result.body);

      // Create blob and download
      const blob = new Blob([content], { type: result.headers['Content-Type'] || 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${proposal.id}.html`;

      // Add to DOM temporarily to ensure download attribute works in Firefox
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      console.log('✅ HTML download successful');

    } catch (err) {
      console.error('❌ Download error:', err);
      alert(`Download failed: ${err.message}`);
    }
  };

  // Handle PDF download via Lambda proxy (no presigned URLs)
  // Lambda verifies ownership and streams S3 content directly
  const handlePdfDownload = async (proposal) => {
    console.log('📕 handlePdfDownload called for proposal:', proposal.id);

    try {
      const downloadQuery = `
        query DownloadProposal($proposalId: String!, $format: String!) {
          downloadProposal(proposalId: $proposalId, format: $format)
        }
      `;

      const response = await client.graphql({
        query: downloadQuery,
        variables: {
          proposalId: proposal.id,
          format: 'pdf'
        },
        authMode: 'userPool'
      });

      const result = JSON.parse(response.data.downloadProposal);

      if (result.statusCode !== 200) {
        const errorBody = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
        alert(`Download failed: ${errorBody.error || 'Unknown error'}`);
        return;
      }

      // Decode base64 content to binary
      const binaryString = atob(result.body);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download
      const blob = new Blob([bytes], { type: result.headers['Content-Type'] || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${proposal.id}.pdf`;

      // Add to DOM temporarily to ensure download attribute works in Firefox
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      console.log('✅ PDF download successful');

    } catch (err) {
      console.error('❌ PDF download error:', err);
      alert(`Download failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ color: '#6b7280' }}>Loading proposals...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{
          padding: '20px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#991b1b'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>❌ Error Loading Proposals</h3>
          <p style={{ margin: 0 }}>{error}</p>
          <button
            onClick={loadProposals}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#111827' }}>
            <img src="/BedrockIcon.png" alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '8px' }} />
            Your Proposals
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={loadProposals}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #d1d5db'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📝</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#374151' }}>
            No Proposals Yet
          </h3>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Generate your first proposal from a grant in the Search page
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {proposals.map((proposal) => {
            const statusColor = getStatusColor(proposal.status);
            const statusIcon = getStatusIcon(proposal.status);

            return (
              <div
                key={proposal.id}
                style={{
                  padding: '24px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'box-shadow 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '18px' }}>
                      {proposal.title}
                    </h3>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      <p style={{ margin: '0 0 4px 0' }}>
                        <strong>Grant:</strong> {proposal.metadata?.grantInfo?.title || 'Title not available'}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Grant ID:</strong> {proposal.grantId}
                      </p>
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      const errMsg = proposal.error || proposal.errorMessage || proposal.currentStep || proposal.metadata?.error || proposal.metadata?.currentStep;
                      if (proposal.status === 'FAILED' && errMsg) setSelectedError(errMsg);
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: statusColor.bg,
                      color: statusColor.text,
                      border: `1px solid ${statusColor.border}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      marginLeft: '16px',
                      cursor: proposal.status === 'FAILED' ? 'pointer' : 'default'
                    }}
                    title={proposal.status === 'FAILED' ? 'Click to see error details' : ''}
                  >
                    {statusIcon} {proposal.status}
                  </div>
                </div>

                {/* Progress */}
                {proposal.status === 'GENERATING' && proposal.progress !== undefined && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      <span>{proposal.currentStep || 'Processing...'}</span>
                      <span>{proposal.progress}%</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${proposal.progress}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}>
                  <div>
                    <span style={{ color: '#6b7280' }}>Created:</span>{' '}
                    <span style={{ color: '#374151', fontWeight: '500' }}>
                      {new Date(proposal.createdAt).toLocaleString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  {proposal.completedAt && (
                    <div>
                      <span style={{ color: '#6b7280' }}>Completed:</span>{' '}
                      <span style={{ color: '#374151', fontWeight: '500' }}>
                        {new Date(proposal.completedAt).toLocaleString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  )}
                  {proposal.sections && (
                    <div>
                      <span style={{ color: '#6b7280' }}>Sections:</span>{' '}
                      <span style={{ color: '#374151', fontWeight: '500' }}>
                        {Object.keys(proposal.sections).length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  marginTop: '16px',
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  {proposal.status === 'COMPLETED' && (
                    <>
                      {/* Content Quality Badge */}
                      <ContentQualityBadge quality={proposal.metadata?.contentQuality} />

                      {/* Evaluation Button (clickable badge that opens modal) */}
                      {proposal.metadata?.evaluation && (
                        <EvaluationButton
                          evaluation={proposal.metadata.evaluation}
                          onClick={() => setSelectedEvaluation(proposal.metadata.evaluation)}
                        />
                      )}

                      {/* Download buttons - always show for completed proposals */}
                      {/* Lambda proxy verifies ownership and streams S3 content directly */}
                      <button
                        onClick={() => handleDownload(proposal)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        📄 Download HTML
                      </button>

                      {/* PDF Download Button - always show for completed proposals */}
                      <button
                        onClick={() => handlePdfDownload(proposal)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>📕</span>
                        Download PDF
                      </button>

                      {proposal.content && (
                        <button
                          onClick={() => {
                            const blob = new Blob([proposal.content], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `proposal-${proposal.grantId}.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          💾 Download
                        </button>
                      )}
                      {proposal.content && (
                        <button
                          onClick={() => {
                            const win = window.open('', '_blank');
                            win.document.write(`
                              <html>
                                <head>
                                  <title>${proposal.title}</title>
                                  <style>
                                    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
                                    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
                                  </style>
                                </head>
                                <body>
                                  <h1>${proposal.title}</h1>
                                  <pre>${proposal.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                                </body>
                              </html>
                            `);
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          👁️ Preview
                        </button>
                      )}
                    </>
                  )}
                  {proposal.status === 'FAILED' && proposal.errorMessage && (
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '4px',
                      fontSize: '13px',
                      flex: '1 1 100%'
                    }}>
                      Error: {proposal.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Evaluation Details Modal */}
      {selectedEvaluation && (
        <EvaluationDetailsModal
          evaluation={selectedEvaluation}
          onClose={() => setSelectedEvaluation(null)}
        />
      )}

      {/* Error Details Modal */}
      {selectedError && (
        <div
          onClick={() => setSelectedError(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'white', borderRadius: '8px',
              padding: '24px', maxWidth: '600px', width: '90%',
              maxHeight: '80vh', overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#991b1b' }}>❌ Proposal Failed</h3>
              <button onClick={() => setSelectedError(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{
              padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px',
              fontSize: '13px', color: '#7f1d1d', wordBreak: 'break-word', whiteSpace: 'pre-wrap'
            }}>
              {selectedError}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalsList;
