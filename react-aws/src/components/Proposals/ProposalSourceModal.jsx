import React from 'react';
import { createPortal } from 'react-dom';
import './ProposalSourceModal.css';

const ProposalSourceModal = ({ isOpen, onClose, onSelectManual, onSelectAutomatic }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="proposal-source-modal-overlay" onClick={onClose}>
      <div className="proposal-source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Knowledge Base Documents</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-content">
          <p className="modal-description">
            Choose how to select documents from your knowledge base for proposal generation:
          </p>
          
          <div className="selection-options">
            <div className="option-card" onClick={onSelectManual}>
              <div className="option-icon">📋</div>
              <h3>Manual Selection</h3>
              <p>
                Search and select specific documents for content and guidelines.
                Gives you full control over source material.
              </p>
              <div className="option-benefits">
                <span className="benefit">✓ Full control</span>
                <span className="benefit">✓ Mix agencies</span>
                <span className="benefit">✓ Specific documents</span>
              </div>
            </div>
            
            <div className="option-card" onClick={onSelectAutomatic}>
              <div className="option-icon">🔍</div>
              <h3>Automatic Search</h3>
              <p>
                Automatically find relevant documents based on the grant's agency.
                Quick and convenient for standard proposals.
              </p>
              <div className="option-benefits">
                <span className="benefit">✓ Quick & easy</span>
                <span className="benefit">✓ Agency-matched</span>
                <span className="benefit">✓ Comprehensive</span>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="action-button cancel-button"
              onClick={onClose}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProposalSourceModal;
