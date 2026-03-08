import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import ProposalSourceModal from '../Proposals/ProposalSourceModal';
import UnifiedDocumentSelector from '../Proposals/UnifiedDocumentSelector';
import ProposalGenerationProgress from '../ProposalGenerationProgress';
import outputs from '../../amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs);

const client = generateClient();

// Helper component to render long text with expand/collapse
const LongTextRenderer = ({ label, text }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!text) return null;

  const isLong = text.length > 500;
  const displayText = isLong && !isExpanded
    ? text.substring(0, 500).trim() + '...'
    : text;

  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '5px',
        fontSize: '14px'
      }}>
        {label}:
      </div>
      <div style={{
        color: '#555',
        lineHeight: '1.4',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: isLong ? '12px' : '0' }}>
          {displayText}
        </div>
        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: '#2196f3',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(33, 150, 243, 0.3)',
              transition: 'all 0.2s ease',
              display: 'block',
              width: 'auto',
              minWidth: '140px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#1976d2';
              e.target.style.boxShadow = '0 4px 8px rgba(33, 150, 243, 0.4)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#2196f3';
              e.target.style.boxShadow = '0 2px 4px rgba(33, 150, 243, 0.3)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {isExpanded ? '▲ Show less' : '▼ Show more'}
          </button>
        )}
      </div>
    </div>
  );
};

// Helper function to render a field with label
const renderField = (label, value, isArray = false) => {
  if (!value || (isArray && (!Array.isArray(value) || value.length === 0))) {
    return null;
  }

  const displayValue = isArray ? value.join(', ') : value;

  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '5px',
        fontSize: '14px'
      }}>
        {label}:
      </div>
      <div style={{
        color: '#555',
        lineHeight: '1.4',
        padding: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        {displayValue}
      </div>
    </div>
  );
};

// Component to display formatted grant details
const FormattedGrantDetails = ({ details }) => {
  const synopsis = details.synopsis || {};

  return (
    <div style={{ lineHeight: '1.6' }}>
      {renderField('Opportunity Number', details.opportunityNumber)}
      {renderField('Opportunity Title', details.opportunityTitle)}
      {renderField('Owning Agency Code', details.owningAgencyCode)}
      {renderField('Opportunity ID', details.opportunityId)}
      {renderField('Award Ceiling', synopsis.awardCeiling)}
      {renderField('Award Floor', synopsis.awardFloor)}
      {synopsis.fundingInstruments && renderField('Funding Instruments', synopsis.fundingInstruments.map(fi => fi.description).join(', '))}
      {synopsis.fundingDescLinkUrl && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px', fontSize: '14px' }}>
            Funding Description:
          </div>
          <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
            <a href={synopsis.fundingDescLinkUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2196f3', textDecoration: 'none' }}>
              🔗 View Funding Description
            </a>
          </div>
        </div>
      )}
      <LongTextRenderer label="Synopsis Description" text={synopsis.synopsisDesc} />
    </div>
  );
};

const GrantCard = ({ grant, index, totalGrants }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Modal states
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [proposalId, setProposalId] = useState(null);
  const [userId, setUserId] = useState(null);

  // Selected documents
  const [selectedDocs, setSelectedDocs] = useState([]);

  // Grant details
  const [grantDetails, setGrantDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showDetailsModal) {
        setShowDetailsModal(false);
      }
    };

    if (showDetailsModal) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [showDetailsModal]);

  const handleViewDetails = async () => {
    console.log('🔍 View Details clicked for grant:', grant);
    setShowDetailsModal(true);
    setLoadingDetails(true);

    try {
      // Call getGrantDetails to fetch full details from grants.gov API
      const response = await client.graphql({
        query: `
          query GetGrantDetails($grantId: String!) {
            getGrantDetails(grantId: $grantId)
          }
        `,
        variables: {
          grantId: grant.id
        }
      });

      let result = response.data.getGrantDetails;
      if (typeof result === 'string') {
        result = JSON.parse(result);
      }

      console.log('✅ Full grant details fetched:', result);
      setGrantDetails(result);
    } catch (error) {
      console.error('❌ Error fetching grant details:', error);
      setGrantDetails({ error: error.message });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGenerateTemplate = () => {
    console.log('🚀 Generate Template clicked for grant:', grant);

    // Show the source selection modal (no NSF restriction)
    setShowSourceModal(true);
  };

  const handleSelectManual = () => {
    setShowSourceModal(false);
    setShowDocumentSelector(true);
  };

  const handleSelectAutomatic = () => {
    setShowSourceModal(false);
    generateProposal(false);
  };

  const handleDocumentsSelected = (docs) => {
    setSelectedDocs(docs);
    setShowDocumentSelector(false);
    generateProposal(true, docs); // Pass docs directly to avoid race condition
  };

  const generateProposal = async (useManualSelection, manualDocs = null) => {
    setIsGenerating(true);
    setGenerationStatus('Starting generation...');

    try {
      // Get current user
      const user = await getCurrentUser();
      setUserId(user.userId);

      // Use passed docs or state docs
      const docsToUse = manualDocs || selectedDocs;

      // Generate unique proposal ID
      const newProposalId = `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare grant info
      const grantInfo = {
        grantId: grant.id || grant.grantId,
        title: grant.title,
        agency: formatAgency(grant.agency),
        description: grant.description || grant.fullDescription || '',
        amount: grant.amount || grant.awardCeiling || 'Not specified',
        amountFormatted: grant.amountFormatted || (grant.amount ? `${grant.amount.toLocaleString()}` : 'Not specified'),
        amountType: grant.amountType || 'Award Amount',
        deadline: grant.deadline || grant.closeDate || 'Not specified',
        openDate: grant.openDate || '',
        opportunityNumber: grant.opportunityNumber || '',
        eligibility: grant.eligibility || 'See grant announcement',
        applicationProcess: grant.applicationProcess || 'See grant details',
        contactEmail: grant.contactEmail || '',
        contactPhone: grant.contactPhone || '',
        requirements: grant.requirements || 'See grant announcement',
        source: 'agent_selected_grants'
      };

      // Prepare selected documents array
      const selectedDocuments = [];
      if (useManualSelection && docsToUse.length > 0) {
        const contentDocs = docsToUse.filter(doc =>
          doc.type !== 'grant-guidelines' && doc.type !== 'guidelines'
        );
        const guidelineDocs = docsToUse.filter(doc =>
          doc.type === 'grant-guidelines' || doc.type === 'guidelines'
        );

        selectedDocuments.push(...contentDocs.map(doc => ({ id: doc.id, type: 'content' })));
        selectedDocuments.push(...guidelineDocs.map(doc => ({ id: doc.id, type: 'guideline' })));

        console.log('📋 Using manual document selection:', {
          content: contentDocs.length,
          guidelines: guidelineDocs.length,
          total: selectedDocuments.length
        });
      }

      // Prepare input matching handler expectations
      const proposalInput = {
        proposalId: newProposalId,
        grantId: grant.id || grant.grantId,
        grantInfo: grantInfo,
        selectedDocuments: selectedDocuments
      };

      // Call GraphQL mutation - V2 AgentCore
      const response = await client.graphql({
        query: `
          mutation GenerateProposal($input: AWSJSON!) {
            generateProposal(input: $input)
          }
        `,
        variables: {
          input: JSON.stringify(proposalInput)
        }
      });

      // V2 returns JSON with proposalId
      const result = JSON.parse(response.data.generateProposal);
      console.log('✅ Proposal created:', result);

      if (result && result.proposalId) {
        setProposalId(result.proposalId);
        setGenerationStatus('success');
        setShowProgress(true);
        setIsGenerating(false);
      } else {
        setGenerationStatus('error');
        alert(`❌ Error: Could not create proposal`);
        setIsGenerating(false);
      }

    } catch (error) {
      console.error('❌ Error generating proposal:', error);
      setGenerationStatus('error');
      alert(`❌ Error generating proposal:\n${error.message}`);
      setIsGenerating(false);
    }
  };

  const handleProposalComplete = (proposal) => {
    console.log('✅ Proposal completed:', proposal);
    setGenerationStatus('completed');
    setTimeout(() => {
      setShowProgress(false);
      setGenerationStatus(null);
    }, 3000);
  };

  const handleProposalError = (errorMsg) => {
    console.error('❌ Proposal failed:', errorMsg);
    setGenerationStatus('error');
    setShowProgress(false);
  };

  const formatAgency = (agency) => {
    if (!agency) return 'Unknown';
    // EU grants store agency as a stringified object: {id=..., abbreviation=..., description=...}
    if (typeof agency === 'string' && agency.startsWith('{')) {
      const match = agency.match(/description=([^}]+)/);
      if (match) return match[1].trim();
    }
    return agency;
  };

  const formatAmount = (amount) => {
    if (!amount) return 'Not specified';
    return `${amount.toLocaleString()}`;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return 'No deadline specified';
    return deadline;
  };

  const formatDescription = (description, expanded = false) => {
    if (!description) return 'No description available';
    if (expanded) return description;
    if (description.length > 2000) return description.substring(0, 2000) + '...';
    return description;
  };

  const shouldShowExpandButton = (description) => {
    return description && description.length > 2000;
  };

  const getFullDescription = () => {
    return grant.fullDescription || grant.description || grant.summary || '';
  };

  const getMatchScoreColor = (score) => {
    if (score == null || isNaN(score)) return '#6c757d';
    const percentage = score * 100;
    if (percentage >= 80) return '#28a745';
    if (percentage >= 60) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div className="grant-card">
      <div className="grant-card-header">
        <div className="grant-number">
          <img src="/baysesian.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '4px' }} />
          Grant {index + 1} of {totalGrants}
        </div>
        <div
          className="match-score-badge"
          style={{ backgroundColor: getMatchScoreColor(grant.matchScore || grant.bayesianScore || 0) }}
        >
          {(grant.matchScore != null && !isNaN(grant.matchScore)) || (grant.bayesianScore != null && !isNaN(grant.bayesianScore))
            ? ((grant.matchScore || grant.bayesianScore) * 100).toFixed(0)
            : '0'}% Match
        </div>
      </div>

      <div className="grant-card-content">
        <h3 className="grant-title">{grant.title}</h3>

        <div className="grant-details">
          <div className="grant-detail-item">
            <span className="detail-label">Agency:</span>
            <span className="detail-value">{formatAgency(grant.agency)}</span>
          </div>

          <div className="grant-detail-item">
            <span className="detail-label">Deadline:</span>
            <span className="detail-value">{formatDeadline(grant.deadline)}</span>
          </div>

          <div className="grant-detail-item">
            <span className="detail-label">Amount:</span>
            <span className="detail-value">{formatAmount(grant.amount)}</span>
          </div>
        </div>

        <div className="grant-description">
          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {formatDescription(getFullDescription(), isDescriptionExpanded)}
          </p>
          {shouldShowExpandButton(getFullDescription()) && (
            <button
              className="expand-description-button"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              style={{
                marginTop: '8px',
                padding: '4px 12px',
                fontSize: '12px',
                color: '#007bff',
                background: 'none',
                border: '1px solid #007bff',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#007bff';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#007bff';
              }}
            >
              {isDescriptionExpanded ? '▲ Show Less' : '▼ Show More'}
              <small style={{ marginLeft: '4px', opacity: 0.7 }}>
                ({getFullDescription().length} chars)
              </small>
            </button>
          )}
        </div>

        <div className="grant-metadata">
          <small>
            Grant ID: <button
              onClick={handleViewDetails}
              style={{
                color: '#007bff',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                font: 'inherit'
              }}
            >
              {grant.id}
            </button>
          </small>
        </div>
      </div>

      <div className="grant-card-actions">
        <button
          className="generate-template-button"
          onClick={handleGenerateTemplate}
          disabled={isGenerating}
          style={{
            opacity: isGenerating ? 0.6 : 1,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            backgroundColor: generationStatus === 'success' ? '#28a745' :
              generationStatus === 'error' ? '#dc3545' : '#007bff'
          }}
        >
          {isGenerating ? '⏳ Generating...' :
            generationStatus === 'success' ? '✅ Queued!' :
              generationStatus === 'error' ? '❌ Error' :
                '📝 Generate Proposal'}
        </button>
      </div>

      {/* Real-time Progress Component */}
      {showProgress && proposalId && userId && (
        <div style={{ marginTop: '20px' }}>
          <ProposalGenerationProgress
            proposalId={proposalId}
            userId={userId}
            onComplete={handleProposalComplete}
            onError={handleProposalError}
            appSyncConfig={{
              eventsApiId: outputs.custom?.eventsApiId,
              apiKey: outputs.custom?.eventsApiKey,
              region: outputs.custom?.region || 'us-east-1'
            }}
          />
        </div>
      )}

      {/* Document Selection Modals */}
      <ProposalSourceModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        onSelectManual={handleSelectManual}
        onSelectAutomatic={handleSelectAutomatic}
      />

      {showDocumentSelector && (
        <UnifiedDocumentSelector
          isOpen={showDocumentSelector}
          onClose={() => setShowDocumentSelector(false)}
          onContinue={handleDocumentsSelected}
        />
      )}

      {/* Grant Details Modal */}
      {showDetailsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '90vw',
              maxWidth: '800px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed header with close button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid #eee',
              flexShrink: 0
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>
                Grant Details: {grant.id}
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1,
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e0e0e0';
                  e.target.style.color = '#333';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f0f0f0';
                  e.target.style.color = '#666';
                }}
              >
                ×
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{
              padding: '24px',
              overflow: 'auto',
              flexGrow: 1,
              minHeight: 0
            }}>

              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #007bff',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                  <p style={{ marginTop: '16px', color: '#666' }}>Loading full grant details from grants.gov...</p>
                </div>
              ) : grantDetails?.error ? (
                <div style={{ padding: '20px', backgroundColor: '#fee', borderRadius: '4px', color: '#c00' }}>
                  Error loading details: {grantDetails.error}
                </div>
              ) : grantDetails ? (
                <FormattedGrantDetails details={grantDetails} />
              ) : (
                <p>No details available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrantCard;
