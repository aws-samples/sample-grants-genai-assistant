import React, { useState } from 'react';
import ProposalSourceModal from './Proposals/ProposalSourceModal';
import UnifiedDocumentSelector from './Proposals/UnifiedDocumentSelector';
import ProposalGenerationProgress from './ProposalGenerationProgress';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import outputs from '../amplify_outputs.json';

const client = generateClient();

const GrantDetails = ({ grant, onClose }) => {
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [proposalId, setProposalId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  if (!grant) return null;

  // Console log the full grant object for debugging
  console.log('🔍 Full Grant Object:', grant);
  console.log('🔍 Grant Keys:', Object.keys(grant));
  console.log('🔍 Description length:', grant.description?.length);
  console.log('🔍 Description preview:', grant.description?.substring(0, 100));

  // Determine if this is a US or EU grant
  const isEuGrant = grant.source === 'EU_FUNDING' || grant.euReference || grant.euIdentifier;

  // Extract data from the agent response structure
  const searchData = grant.searchData || {};
  const detailsData = grant.detailsData || grant;
  const synopsis = detailsData.synopsis || {};

  console.log('🔍 Grant Type:', isEuGrant ? 'EU Grant' : 'US Grant');
  console.log('🔍 SearchData:', searchData);
  console.log('🔍 DetailsData:', detailsData);
  console.log('🔍 Synopsis:', synopsis);

  // Handle generate template action
  const handleGenerateTemplate = () => {
    console.log('📝 Opening proposal source modal for grant:', grant);
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
    setGenerating(true);
    setError(null);

    try {
      const user = await getCurrentUser();
      setUserId(user.userId);

      // Use passed docs or state docs
      const docsToUse = manualDocs || selectedDocs;

      // Generate unique proposal ID
      const newProposalId = `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare grant info
      const grantInfo = {
        grantId: grant.grantId || grant.id,
        title: grant.title,
        agency: grant.agency,
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
        source: 'manual_search'
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
        grantId: grant.grantId || grant.id,
        grantInfo: grantInfo,
        selectedDocuments: selectedDocuments
      };

      console.log('🚀 Creating proposal with input:', proposalInput);

      const response = await client.graphql({
        query: `
          mutation GenerateProposal($input: AWSJSON!) {
            generateProposal(input: $input)
          }
        `,
        variables: {
          input: JSON.stringify(proposalInput)
        },
        authMode: 'userPool'
      });

      const result = JSON.parse(response.data.generateProposal);

      if (!result || !result.proposalId) {
        throw new Error('No proposal ID returned');
      }

      setProposalId(result.proposalId);
      setShowProgress(true);
      setGenerating(false);

    } catch (err) {
      console.error('❌ Error generating proposal:', err);
      setError(err.message || 'Failed to generate proposal');
      setGenerating(false);
    }
  };

  const handleProposalComplete = (proposal) => {
    console.log('✅ Proposal completed:', proposal);
  };

  const handleProposalError = (errorMsg) => {
    console.error('❌ Proposal failed:', errorMsg);
    setError(errorMsg);
    setShowProgress(false);
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

  // Helper component to render long text with expand/collapse
  const LongTextRenderer = ({ label, text }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    console.log(`📝 LongTextRenderer for "${label}":`, {
      textLength: text?.length,
      isLong: text?.length > 500,
      preview: text?.substring(0, 100)
    });

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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 1
        }}>
          <div style={{ flex: 1, marginRight: '20px' }}>
            <h2 style={{
              margin: '0 0 10px 0',
              color: '#1976d2',
              fontSize: '20px',
              lineHeight: '1.3'
            }}>
              📄 {detailsData.opportunityTitle || searchData.title || grant.title || 'Grant Details'}
            </h2>
            {(synopsis.agencyName || searchData.agency || grant.agency) && (
              <div style={{
                color: '#666',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {synopsis.agencyName || searchData.agency || grant.agency}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleGenerateTemplate}
              disabled={generating || showProgress}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: (generating || showProgress) ? '#9ca3af' : '#28a745',
                backgroundColor: 'transparent',
                border: `1px solid ${(generating || showProgress) ? '#9ca3af' : '#28a745'}`,
                borderRadius: '4px',
                cursor: (generating || showProgress) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: (generating || showProgress) ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!generating && !showProgress) {
                  e.target.style.backgroundColor = '#28a745';
                  e.target.style.color = 'white';
                }
              }}
              onMouseOut={(e) => {
                if (!generating && !showProgress) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#28a745';
                }
              }}
            >
              {generating ? '⏳ Starting...' : '📝 Generate Proposal'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Show Progress if generating */}
          {showProgress && proposalId && (
            <div style={{ marginBottom: '20px' }}>
              <ProposalGenerationProgress proposalId={proposalId} />
            </div>
          )}

          {/* Show error if any */}
          {error && (
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b'
            }}>
              ❌ {error}
            </div>
          )}

          {/* Check if we have detailed data or basic search data */}
          {isEuGrant ? (
            // Show EU grant data
            <>
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                <div style={{ color: '#155724', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                  🇪🇺 European Commission Grant
                  {grant.hasDetailedInfo && (
                    <span style={{ marginLeft: '10px', fontSize: '12px', padding: '2px 8px', backgroundColor: '#4caf50', color: 'white', borderRadius: '12px' }}>
                      ✓ Full Details
                    </span>
                  )}
                </div>
                <div style={{ color: '#155724', fontSize: '12px' }}>
                  This is a grant from the European Commission funding programs.
                  {grant.hasDetailedInfo && ' Full details including budget, conditions, and updates are available below.'}
                </div>
              </div>

              {/* EU-specific fields */}
              {renderField('EU Reference', grant.euReference)}
              {renderField('EU Identifier', grant.euIdentifier)}
              {renderField('Call Identifier', grant.euCallIdentifier)}
              {renderField('Call Title', grant.euCallTitle)}
              {renderField('Framework Programme', grant.euFrameworkProgramme)}
              {renderField('Programme Period', grant.euProgrammePeriod)}
              {renderField('Status', grant.euStatus)}
              {renderField('Deadline Model', grant.euDeadlineModel)}
              {renderField('Language', grant.euLanguage)}
              {grant.euKeywords && renderField('EU Keywords', grant.euKeywords, true)}
              {grant.euCrossCuttingPriorities && renderField('Cross-Cutting Priorities', grant.euCrossCuttingPriorities, true)}
              {grant.euTypesOfAction && renderField('Types of Action', grant.euTypesOfAction, true)}

              {/* NEW: Budget Information */}
              {grant.euBudgetOverview && Object.keys(grant.euBudgetOverview).length > 0 && (
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
                  <div style={{ fontWeight: 'bold', color: '#2e7d32', marginBottom: '10px', fontSize: '16px' }}>
                    💰 Budget Information
                  </div>
                  {grant.euBudgetOverview.minContribution && (
                    <div style={{ marginBottom: '5px', color: '#1b5e20' }}>
                      <strong>Min Contribution:</strong> €{grant.euBudgetOverview.minContribution.toLocaleString()}
                    </div>
                  )}
                  {grant.euBudgetOverview.maxContribution && (
                    <div style={{ marginBottom: '5px', color: '#1b5e20' }}>
                      <strong>Max Contribution:</strong> €{grant.euBudgetOverview.maxContribution.toLocaleString()}
                    </div>
                  )}
                  {grant.euBudgetOverview.totalBudget && (
                    <div style={{ marginBottom: '5px', color: '#1b5e20' }}>
                      <strong>Total Budget:</strong> €{grant.euBudgetOverview.totalBudget.toLocaleString()}
                    </div>
                  )}
                  {grant.euBudgetOverview.expectedGrants && (
                    <div style={{ marginBottom: '5px', color: '#1b5e20' }}>
                      <strong>Expected Grants:</strong> {grant.euBudgetOverview.expectedGrants}
                    </div>
                  )}
                </div>
              )}

              {/* NEW: Conditions */}
              {grant.euConditions && (
                <LongTextRenderer label="📋 Grant Conditions" text={grant.euConditions} />
              )}

              {/* NEW: Support Information */}
              {grant.euSupportInfo && (
                <LongTextRenderer label="💬 Support & Contact Information" text={grant.euSupportInfo} />
              )}

              {/* NEW: Latest Updates */}
              {grant.euLatestUpdates && grant.euLatestUpdates.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3e0', borderRadius: '4px', border: '1px solid #ffe0b2' }}>
                  <div style={{ fontWeight: 'bold', color: '#e65100', marginBottom: '10px', fontSize: '16px' }}>
                    📢 Latest Updates ({grant.euLatestUpdates.length})
                  </div>
                  {grant.euLatestUpdates.map((update, idx) => (
                    <div key={idx} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: idx < grant.euLatestUpdates.length - 1 ? '1px solid #ffe0b2' : 'none' }}>
                      {update.date && (
                        <div style={{ fontSize: '12px', color: '#bf360c', fontWeight: 'bold', marginBottom: '3px' }}>
                          {new Date(update.date).toLocaleDateString()}
                        </div>
                      )}
                      {update.title && (
                        <div style={{ fontSize: '14px', color: '#e65100', fontWeight: 'bold', marginBottom: '3px' }}>
                          {update.title}
                        </div>
                      )}
                      {update.description && (
                        <div style={{ fontSize: '13px', color: '#5d4037' }}>
                          {update.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* NEW: All Deadlines */}
              {grant.euAllDeadlines && grant.euAllDeadlines.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px', fontSize: '14px' }}>
                    📅 All Deadlines ({grant.euAllDeadlines.length}):
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
                    {grant.euAllDeadlines.map((deadline, idx) => (
                      <div key={idx} style={{ marginBottom: '3px', color: '#555' }}>
                        • {new Date(deadline).toLocaleDateString()} at {new Date(deadline).toLocaleTimeString()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EU Grant URL */}
              {grant.euUrl && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px', fontSize: '14px' }}>
                    EU Grant Portal:
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
                    <a href={grant.euUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2196f3', textDecoration: 'none' }}>
                      🔗 View on EU Funding Portal
                    </a>
                  </div>
                </div>
              )}

              {/* Common fields for EU grants */}
              {renderField('Agency', grant.agency)}
              {renderField('Deadline', grant.deadline)}
              <LongTextRenderer label="Description" text={grant.description} />
              <LongTextRenderer label="Eligibility" text={grant.eligibility} />
              <LongTextRenderer label="Application Process" text={grant.applicationProcess} />
            </>
          ) : detailsData.opportunityNumber ? (
            // Show detailed US agent data
            <>
              {renderField('Opportunity Number', detailsData.opportunityNumber)}
              {renderField('Opportunity Title', detailsData.opportunityTitle)}
              {renderField('Owning Agency Code', detailsData.owningAgencyCode)}
              {renderField('Opportunity ID', detailsData.opportunityId)}
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
            </>
          ) : (
            // Show basic search data with note about limited information
            <>
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #bbdefb' }}>
                <div style={{ color: '#1565c0', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                  ℹ️ Grant Details
                </div>
                <div style={{ color: '#1565c0', fontSize: '12px' }}>
                  Showing available grant information from search results.
                </div>
              </div>

              {/* Show available basic fields */}
              {renderField('Opportunity Number', 'Not Available (requires detailed fetch)')}
              {renderField('Opportunity Title', grant.title)}
              {renderField('Owning Agency Code', 'Not Available (requires detailed fetch)')}
              {renderField('Opportunity ID', grant.grantId || grant.id)}
              {renderField('Award Ceiling', 'Not Available (requires detailed fetch)')}
              {renderField('Award Floor', 'Not Available (requires detailed fetch)')}
              {renderField('Funding Instruments', 'Not Available (requires detailed fetch)')}

              {/* Available basic information */}
              {renderField('Agency', grant.agency)}
              {renderField('Amount', grant.amount)}
              {renderField('Deadline', grant.deadline)}
              {renderField('Source', grant.source)}

              <LongTextRenderer label="Synopsis Description" text={grant.description} />
              <LongTextRenderer label="Eligibility" text={grant.eligibility} />
              <LongTextRenderer label="Application Process" text={grant.applicationProcess} />

              {/* Relevance Score - Fixed formatting */}
              {grant.relevanceScore && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px', fontSize: '14px' }}>
                    Relevance Score:
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: (grant.relevanceScore * 100) >= 70 ? '#d4edda' : (grant.relevanceScore * 100) >= 40 ? '#fff3cd' : '#f8d7da',
                    borderRadius: '4px',
                    border: '1px solid #e9ecef',
                    color: (grant.relevanceScore * 100) >= 70 ? '#155724' : (grant.relevanceScore * 100) >= 40 ? '#856404' : '#721c24',
                    fontWeight: 'bold'
                  }}>
                    {(grant.relevanceScore * 100).toFixed(2)}%
                  </div>
                </div>
              )}

              {/* Tags and Keywords */}
              {grant.tags && renderField('Tags', grant.tags, true)}
              {grant.matchedKeywords && renderField('Matched Keywords', grant.matchedKeywords, true)}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
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
    </div>
  );
};

export default GrantDetails;