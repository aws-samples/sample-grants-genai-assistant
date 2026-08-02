import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateClient } from 'aws-amplify/api';
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

  // Estimate a document's token usage from whatever signal is available.
  // getDocument/listDocuments do NOT return the extracted text content, and the
  // computed tokenCount metadata lives on the S3 object tags (not the DynamoDB
  // item), so we cannot rely on doc.content / metadata.tokenCount here. We use,
  // in order of accuracy:
  //   1. an explicit tokenCount (if ever present)
  //   2. extracted character count (accurate for processed PDFs) / 4
  //   3. file size in bytes (≈ characters for text files) / 4
  const estimateDocTokens = (doc) => {
    if (!doc) return 0;
    const explicitTokens = parseInt(doc.tokenCount ?? doc.metadata?.tokenCount);
    if (explicitTokens) return explicitTokens;
    // Best signal: length of the EXTRACTED TEXT that is actually chunked and
    // embedded into the vector store. For PDFs this is the extracted text, not
    // the raw (mostly binary) file — so it is the correct basis for tokens.
    const charCount = parseInt(
      doc.extractedCharCount ?? doc.characterCount ?? doc.metadata?.characterCount
    );
    if (charCount) return Math.ceil(charCount / 4);
    // Fallback: raw file size is only a reasonable proxy for PLAIN TEXT
    // (bytes ≈ characters). For PDFs / binary formats the file size is NOT
    // representative of the extracted text, so we do NOT use it (that caused a
    // 16MB PDF to read as ~4M tokens and falsely trip the limit). Return 0 and
    // let the backend's real content budget govern truncation during generation.
    const ct = (doc.contentType || '').toLowerCase();
    const name = (doc.filename || doc.title || '').toLowerCase();
    const isPlainText = ct.includes('text/') || ct.includes('markdown') ||
      name.endsWith('.txt') || name.endsWith('.md');
    if (isPlainText) return Math.ceil((parseInt(doc.fileSize) || 0) / 4);
    return 0;
  };

  // Total size of the SOURCE MATERIAL the user selected — this is NOT the amount
  // sent to the model. The backend runs a semantic search over the selected
  // documents and uses only the most relevant excerpts, capped at a content budget
  // (~30K tokens), per section. See "How Proposal Generation Works" in README.md.
  const sourceMaterialTokens = selectedDocs.reduce((total, doc) => {
    return total + (parseInt(doc.tokenCount) || estimateDocTokens(doc));
  }, 0);

  // Backend content budget actually used per section (120K chars ≈ 30K tokens).
  const CONTENT_BUDGET_TOKENS = 30000;

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
        // Estimate from size/char count now so per-doc and total token counts are
        // meaningful before selection; refined on selection via getDocument.
        tokenCount: estimateDocTokens(doc),
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

      // Prefer accurate signals from the full document (extractedCharCount for
      // processed PDFs); fall back to the list-item estimate (file size based).
      const docTokens = estimateDocTokens({ ...doc, ...fullDoc }) || estimateDocTokens(doc);
      // No hard limit here: retrieval selects only the most relevant chunks from the
      // selected documents and the backend applies its own content budget, so adding
      // more/larger documents never overflows the model. We track source-material
      // size only for user awareness.

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
          <div className="source-material-info" style={{
            background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px',
            padding: '12px 16px', marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: '#0c4a6e' }}>
                📚 Source material selected: {selectedDocs.length} document{selectedDocs.length === 1 ? '' : 's'}
                {sourceMaterialTokens > 0 && ` · ~${sourceMaterialTokens.toLocaleString()} tokens of text`}
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#0369a1' }}>
              This is how much source text you've provided — <strong>not</strong> what is sent to the model.
              For each proposal section, the system searches these documents and uses only the most
              relevant excerpts, up to a ~{CONTENT_BUDGET_TOKENS.toLocaleString()}-token budget. Selecting
              more or larger documents simply gives the search a richer pool to draw from — it won't exceed
              the model's limits.
            </p>
          </div>

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
