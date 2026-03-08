import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import DocumentStatusBadge from './DocumentStatusBadge';
import useDocumentStatusUpdates from './useDocumentStatusUpdates';

const client = generateClient();

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Real-time status updates (Task 14)
  const { statusUpdates } = useDocumentStatusUpdates();

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, agencyFilter]);

  // Update documents when status changes are received
  useEffect(() => {
    if (Object.keys(statusUpdates).length > 0) {
      setDocuments(prevDocs =>
        prevDocs.map(doc => {
          const update = statusUpdates[doc.documentId];
          if (update) {
            return {
              ...doc,
              status: update.status,
              errorMessage: update.errorMessage,
              vectorIndexed: update.vectorIndexed,
              processedAt: update.processedAt
            };
          }
          return doc;
        })
      );
    }
  }, [statusUpdates]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      // Note: The generated type is SearchFiltersInput (with Input suffix) due to Amplify codegen
      const listDocumentsQuery = `
        query ListDocuments($filters: SearchFiltersInput, $limit: Int, $offset: Int) {
          listDocuments(filters: $filters, limit: $limit, offset: $offset)
        }
      `;

      const filters = {};
      if (categoryFilter !== 'all') {
        filters.category = categoryFilter;
      }
      if (agencyFilter !== 'all') {
        filters.agency = agencyFilter;
      }

      console.log('🔍 Fetching documents with filters:', filters);

      const { data } = await client.graphql({
        query: listDocumentsQuery,
        variables: {
          filters: Object.keys(filters).length > 0 ? filters : null,
          limit: 50,
          offset: 0
        },
        authMode: 'userPool'
      });

      console.log('📦 Received data:', data);

      const response = typeof data.listDocuments === 'string'
        ? JSON.parse(data.listDocuments)
        : data.listDocuments;

      // Extract documents array from response object
      // Filter out orphaned records (blank entries with no filename — caused by tab-switch during upload)
      const docs = response?.documents || [];
      setDocuments(Array.isArray(docs) ? docs.filter(d => d.filename && d.filename.trim() !== '') : []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId) => {
    setDeleting(true);
    setError(null);

    try {
      const deleteDocumentMutation = `
        mutation DeleteDocument($documentId: String!) {
          deleteDocument(documentId: $documentId)
        }
      `;

      await client.graphql({
        query: deleteDocumentMutation,
        variables: { documentId },
        authMode: 'userPool'
      });

      // Remove from local state
      setDocuments(documents.filter(doc => doc.documentId !== documentId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏳</div>
        <p style={{ color: '#6b7280' }}>Loading documents...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ marginRight: '10px', fontWeight: 'bold', color: '#374151' }}>
              Filter by Category:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                // Reset agency filter when changing category
                if (e.target.value !== 'grant-guidelines') {
                  setAgencyFilter('all');
                }
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Categories</option>
              <option value="grant-guidelines">Grant Guidelines</option>
              <option value="research">Research Papers</option>
              <option value="proposals">Grant Proposals</option>
              <option value="reports">Reports</option>
              <option value="documentation">Documentation</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Agency Filter - Only show for grant-guidelines */}
          {(categoryFilter === 'grant-guidelines' || categoryFilter === 'all') && (
            <div>
              <label style={{ marginRight: '10px', fontWeight: 'bold', color: '#374151' }}>
                Filter by Agency:
              </label>
              <select
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Agencies</option>
                <optgroup label="🇺🇸 US Federal Agencies">
                  <option value="NSF">NSF - National Science Foundation</option>
                  <option value="NIH">NIH - National Institutes of Health</option>
                  <option value="DOD">DOD - Department of Defense</option>
                  <option value="DARPA">DARPA - Defense Advanced Research Projects Agency</option>
                  <option value="ONR">ONR - Office of Naval Research</option>
                  <option value="DOE">DOE - Department of Energy</option>
                  <option value="NASA">NASA - National Aeronautics and Space Administration</option>
                  <option value="USDA">USDA - Department of Agriculture</option>
                  <option value="ED">ED - Department of Education</option>
                  <option value="DHS">DHS - Department of Homeland Security</option>
                  <option value="DOL">DOL - Department of Labor</option>
                  <option value="DOT">DOT - Department of Transportation</option>
                  <option value="VA">VA - Department of Veterans Affairs</option>
                  <option value="HUD">HUD - Housing and Urban Development</option>
                  <option value="EPA">EPA - Environmental Protection Agency</option>
                  <option value="NEH">NEH - National Endowment for the Humanities</option>
                  <option value="CDC">CDC - Centers for Disease Control</option>
                  <option value="AHRQ">AHRQ - Agency for Healthcare Research and Quality</option>
                </optgroup>
                <optgroup label="🇪🇺 European Agencies">
                  <option value="European-Commission-Prompt">European Commission (Horizon Europe / EU Programmes)</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="OTHER">Other Agency</option>
                </optgroup>
              </select>
            </div>
          )}
        </div>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          color: '#991b1b',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>📭</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#374151' }}>No documents yet</h3>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Upload your first document using the Upload tab
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {documents.map((doc) => (
            <div
              key={doc.documentId}
              style={{
                padding: '20px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  {/* Filename and Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>
                      📄 {doc.filename}
                    </h3>
                    <DocumentStatusBadge status={doc.status} />
                  </div>

                  {/* Metadata */}
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      <strong>Category:</strong> {doc.category || 'N/A'}
                    </span>
                    {(doc.agency || doc.grantMetadata?.agency) && (
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        <strong>Agency:</strong> {doc.agency || doc.grantMetadata.agency}
                      </span>
                    )}
                    {doc.grantMetadata?.grantType && (
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        <strong>Grant Type:</strong> {doc.grantMetadata.grantType}
                      </span>
                    )}
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      <strong>Size:</strong> {formatFileSize(doc.fileSize || 0)}
                    </span>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      <strong>Uploaded:</strong> {formatDate(doc.uploadDate)}
                    </span>
                    {doc.vectorIndexed && (
                      <span style={{ fontSize: '14px', color: '#059669' }}>
                        ✓ Searchable
                      </span>
                    )}
                  </div>

                  {/* Grant Metadata Details - Show for grant-guidelines */}
                  {doc.category === 'grant-guidelines' && doc.grantMetadata && (
                    <div style={{
                      padding: '8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginTop: '8px'
                    }}>
                      <strong style={{ color: '#1e40af' }}>📋 Grant Details:</strong>{' '}
                      <span style={{ color: '#1e40af' }}>
                        {doc.grantMetadata.section && `Section: ${doc.grantMetadata.section}`}
                        {doc.grantMetadata.documentType && ` • Type: ${doc.grantMetadata.documentType}`}
                        {doc.grantMetadata.year && ` • Year: ${doc.grantMetadata.year}`}
                        {doc.grantMetadata.version && ` • Version: ${doc.grantMetadata.version}`}
                      </span>
                    </div>
                  )}

                  {/* Error Message */}
                  {doc.status === 'failed' && doc.errorMessage && (
                    <div style={{
                      padding: '8px',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#991b1b',
                      marginTop: '10px'
                    }}>
                      Error: {doc.errorMessage}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div>
                  {deleteConfirm === doc.documentId ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDelete(doc.documentId)}
                        disabled={deleting}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: deleting ? 'not-allowed' : 'pointer',
                          opacity: deleting ? 0.6 : 1
                        }}
                      >
                        {deleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleting}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: deleting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(doc.documentId)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentList;
