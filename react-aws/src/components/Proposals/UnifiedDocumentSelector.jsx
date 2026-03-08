import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateClient } from 'aws-amplify/api';
import TokenBudgetIndicator from './TokenBudgetIndicator';
import './UnifiedDocumentSelector.css';

const client = generateClient();

const UnifiedDocumentSelector = ({ isOpen, onClose, onContinue }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [docTypeFilter, setDocTypeFilter] = useState('all'); // 'all', 'content', 'guidelines'
  const [agencyFilter, setAgencyFilter] = useState('');

  // Auto-load documents when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 UnifiedDocumentSelector: Modal opened, loading documents...');
      loadAllDocuments();
    }
  }, [isOpen, docTypeFilter, agencyFilter]);

  const estimateTokens = (text) => Math.ceil((text?.length || 0) / 4);

  const totalTokens = selectedDocs.reduce((total, doc) => {
    return total + (parseInt(doc.tokenCount) || estimateTokens(doc.content || ''));
  }, 0) + 7000; // Base prompt tokens

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Load all user documents from DynamoDB (like DocumentList does)
  const loadAllDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📋 Loading documents with filters:', { docTypeFilter, agencyFilter });

      const listDocumentsQuery = `
        query ListDocuments($filters: SearchFiltersInput, $limit: Int, $offset: Int) {
          listDocuments(filters: $filters, limit: $limit, offset: $offset)
        }
      `;

      const filters = {};

      // Map docTypeFilter to category for DynamoDB query
      if (docTypeFilter === 'guidelines') {
        filters.category = 'grant-guidelines';
      } else if (docTypeFilter === 'content') {
        // Content includes research, proposals, reports, documentation, other
        // We'll filter this in the client after fetching
      }

      // Add agency filter
      if (agencyFilter) {
        filters.agency = agencyFilter;
      }

      // Note: status filtering is done on the backend - it returns only 'ready' docs
      console.log('🔍 Querying with filters:', filters);

      const response = await client.graphql({
        query: listDocumentsQuery,
        variables: {
          filters: Object.keys(filters).length > 0 ? filters : null,
          limit: 100,
          offset: 0
        },
        authMode: 'userPool'
      });

      console.log('📦 Received response:', response);

      const responseData = typeof response.data.listDocuments === 'string'
        ? JSON.parse(response.data.listDocuments)
        : response.data.listDocuments;

      let docs = responseData?.documents || [];
      console.log(`📄 Found ${docs.length} documents`);

      // Filter to only show 'ready' documents (client-side)
      docs = docs.filter(doc => doc.status === 'ready');
      console.log(`📄 After status filter: ${docs.length} ready documents`);

      // Client-side filtering for content type
      if (docTypeFilter === 'content') {
        docs = docs.filter(doc =>
          doc.category !== 'grant-guidelines' &&
          doc.category !== 'guidelines'
        );
        console.log(`📄 After content filter: ${docs.length} documents`);
      }

      // Format documents for display
      const formattedDocs = docs.map(doc => ({
        id: doc.documentId,
        title: doc.filename,
        excerpt: `${doc.category || 'document'} - ${formatFileSize(doc.fileSize || 0)}`,
        type: doc.category || 'unknown',
        agency: doc.agency || doc.grantMetadata?.agency || 'Unknown',
        tokenCount: estimateTokens(''), // Will be loaded when selected
        status: doc.status,
        fileSize: doc.fileSize
      }));

      console.log('✅ Formatted documents:', formattedDocs.length);
      setDocuments(formattedDocs);
    } catch (err) {
      console.error('❌ Failed to load documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      // If search is empty, reload all documents
      loadAllDocuments();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Searching for:', searchTerm);

      const searchQuery = `
        query SearchDocuments($query: String!, $filters: SearchFiltersInput, $limit: Int) {
          searchDocuments(query: $query, filters: $filters, limit: $limit, offset: 0) {
            results {
              documentId
              filename
              excerpt
              relevanceScore
              metadata
            }
            total
          }
        }
      `;

      const filters = {};
      if (docTypeFilter === 'guidelines') {
        filters.documentType = 'grant-guidelines';
      } else if (docTypeFilter === 'content') {
        filters.documentType = 'content';
      }
      if (agencyFilter) filters.agency = agencyFilter;

      const response = await client.graphql({
        query: searchQuery,
        variables: {
          query: searchTerm,
          filters: Object.keys(filters).length > 0 ? filters : null,
          limit: 20
        },
        authMode: 'userPool'
      });

      const results = response.data.searchDocuments.results || [];
      console.log(`📄 Search found ${results.length} results`);

      const uniqueDocs = new Map();

      results.forEach(result => {
        if (!uniqueDocs.has(result.documentId)) {
          uniqueDocs.set(result.documentId, {
            id: result.documentId,
            title: result.filename,
            excerpt: result.excerpt,
            type: result.metadata?.documentType || 'unknown',
            agency: result.metadata?.agency || 'Unknown',
            tokenCount: result.metadata?.tokenCount || estimateTokens(result.excerpt),
            relevanceScore: result.relevanceScore
          });
        }
      });

      setDocuments(Array.from(uniqueDocs.values()));
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFullDocument = async (documentId) => {
    try {
      console.log('📥 Fetching full document:', documentId);
      const query = `query GetDocument($documentId: String!) { getDocument(documentId: $documentId) }`;
      const response = await client.graphql({
        query,
        variables: { documentId },
        authMode: 'userPool'
      });

      const docData = typeof response.data.getDocument === 'string'
        ? JSON.parse(response.data.getDocument)
        : response.data.getDocument;

      console.log('✅ Fetched document:', docData?.filename);
      return docData;
    } catch (err) {
      console.error('❌ Failed to fetch document:', err);
      return null;
    }
  };

  const toggleDocument = async (doc) => {
    const isSelected = selectedDocs.some(d => d.id === doc.id);

    if (isSelected) {
      setSelectedDocs(selectedDocs.filter(d => d.id !== doc.id));
    } else {
      setLoading(true);
      const fullDoc = await fetchFullDocument(doc.id);
      setLoading(false);

      if (!fullDoc) {
        alert('Failed to load document. Please try again.');
        return;
      }

      const docTokens = parseInt(fullDoc.metadata?.tokenCount) || estimateTokens(fullDoc.content);
      if (totalTokens + docTokens > 160000) {
        alert('Adding this document would exceed the token limit.');
        return;
      }

      setSelectedDocs([...selectedDocs, {
        id: fullDoc.documentId,
        title: fullDoc.filename,
        content: fullDoc.content,
        type: fullDoc.metadata?.documentType || doc.type,
        agency: fullDoc.metadata?.agency || doc.agency,
        tokenCount: docTokens
      }]);
    }
  };

  const handleContinue = () => {
    onContinue(selectedDocs);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="unified-doc-selector-overlay" onClick={onClose}>
      <div className="unified-doc-selector" onClick={(e) => e.stopPropagation()}>
        <div className="selector-header">
          <h2>📚 Select Knowledge Base Documents</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="selector-body">
          <TokenBudgetIndicator tokenCount={totalTokens} maxTokens={168000} />

          {/* Document Type Toggle */}
          <div className="doc-type-toggle">
            <button
              className={docTypeFilter === 'all' ? 'active' : ''}
              onClick={() => setDocTypeFilter('all')}
            >
              All Documents
            </button>
            <button
              className={docTypeFilter === 'content' ? 'active' : ''}
              onClick={() => setDocTypeFilter('content')}
            >
              📄 Content
            </button>
            <button
              className={docTypeFilter === 'guidelines' ? 'active' : ''}
              onClick={() => setDocTypeFilter('guidelines')}
            >
              📋 Guidelines
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search documents... (e.g., 'NSF proposal guidelines')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="agency-select"
            >
              <option value="">All Agencies</option>
              <option value="NSF">NSF</option>
              <option value="NIH">NIH</option>
              <option value="DARPA">DARPA</option>
              <option value="DOE">DOE</option>
            </select>
            <button type="submit" disabled={!searchTerm.trim() || loading} className="search-btn">
              🔍 Search
            </button>
          </form>

          {/* Selected Documents */}
          {selectedDocs.length > 0 && (
            <div className="selected-docs">
              <h3>Selected ({selectedDocs.length})</h3>
              <div className="selected-list">
                {selectedDocs.map(doc => (
                  <div key={doc.id} className="selected-doc">
                    <span className="doc-type-badge">{doc.type}</span>
                    <span className="doc-title">{doc.title}</span>
                    <span className="doc-tokens">{doc.tokenCount.toLocaleString()} tokens</span>
                    <button onClick={() => toggleDocument(doc)} className="remove-btn">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="search-results">
            {loading && <div className="loading">Loading documents...</div>}
            {error && <div className="error">{error}</div>}

            {!loading && !error && documents.length > 0 && (
              <div className="results-grid">
                {documents.map(doc => {
                  const isSelected = selectedDocs.some(d => d.id === doc.id);
                  return (
                    <div key={doc.id} className={`doc-card ${isSelected ? 'selected' : ''}`}>
                      <div className="doc-card-header">
                        <span className="doc-type-badge">{doc.type}</span>
                        <span className="doc-agency">{doc.agency}</span>
                      </div>
                      <h4>{doc.title}</h4>
                      <p className="doc-excerpt">{doc.excerpt?.substring(0, 120)}...</p>
                      <button
                        onClick={() => toggleDocument(doc)}
                        className={`select-btn ${isSelected ? 'selected' : ''}`}
                      >
                        {isSelected ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && documents.length === 0 && (
              <div className="no-results">
                {searchTerm
                  ? 'No documents found. Try different search terms.'
                  : 'No documents available. Upload documents in the Knowledge Base section.'}
              </div>
            )}
          </div>
        </div>

        <div className="selector-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button
            onClick={handleContinue}
            disabled={selectedDocs.length === 0}
            className="continue-btn"
          >
            Continue with {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UnifiedDocumentSelector;
