/**
 * Proposal Generation Progress Component
 *
 * Shown inline after a proposal is queued from a grant card or grant details view.
 * Proposal generation runs in the background (Lambda + Step Functions) and does not
 * push real-time updates to the UI. Direct the user to the Proposals page to check status.
 */

import React from 'react';

const ProposalGenerationProgress = ({ proposalId }) => {
  return (
    <div style={{
      width: '100%',
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '8px',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px'
    }}>
      <span style={{ fontSize: '22px', lineHeight: 1 }}>✅</span>
      <div>
        <div style={{ fontWeight: '600', fontSize: '15px', color: '#166534', marginBottom: '6px' }}>
          Proposal queued successfully
        </div>
        <div style={{ fontSize: '14px', color: '#15803d' }}>
          Generation runs in the background and takes about 10 minutes.
          Go to the <strong>Proposals</strong> page and refresh to check the status.
        </div>
        {proposalId && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            Proposal ID: {proposalId}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalGenerationProgress;
