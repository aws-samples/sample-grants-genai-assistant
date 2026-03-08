import React, { useState, useCallback, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

const SUPPORTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/plain': '.txt',
  'text/markdown': '.md'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Grant-specific metadata options
const US_AGENCIES = [
  { value: 'NSF', label: 'NSF - National Science Foundation' },
  { value: 'NIH', label: 'NIH - National Institutes of Health' },
  { value: 'DOD', label: 'DOD - Department of Defense' },
  { value: 'DARPA', label: 'DARPA - Defense Advanced Research Projects Agency' },
  { value: 'ONR', label: 'ONR - Office of Naval Research' },
  { value: 'DOE', label: 'DOE - Department of Energy' },
  { value: 'NASA', label: 'NASA - National Aeronautics and Space Administration' },
  { value: 'USDA', label: 'USDA - Department of Agriculture' },
  { value: 'ED', label: 'ED - Department of Education' },
  { value: 'DHS', label: 'DHS - Department of Homeland Security' },
  { value: 'DOL', label: 'DOL - Department of Labor' },
  { value: 'DOT', label: 'DOT - Department of Transportation' },
  { value: 'VA', label: 'VA - Department of Veterans Affairs' },
  { value: 'HUD', label: 'HUD - Housing and Urban Development' },
  { value: 'EPA', label: 'EPA - Environmental Protection Agency' },
  { value: 'NEH', label: 'NEH - National Endowment for the Humanities' },
  { value: 'CDC', label: 'CDC - Centers for Disease Control' },
  { value: 'AHRQ', label: 'AHRQ - Agency for Healthcare Research and Quality' }
];

const EU_AGENCIES = [
  { value: 'Horizon Europe (HORIZON)', label: 'Horizon Europe (HORIZON)' },
  { value: 'Digital Europe Programme (DIGITAL)', label: 'Digital Europe Programme (DIGITAL)' },
  { value: 'Connecting Europe Facility (CEF)', label: 'Connecting Europe Facility (CEF)' },
  { value: 'LIFE Programme (LIFE)', label: 'LIFE Programme (LIFE)' },
  { value: 'European Union Aviation Safety Agency (EUAF)', label: 'European Union Aviation Safety Agency (EUAF)' }
];

// Combined agencies list (currently unused but kept for reference)
// const AGENCIES = [
//   ...US_AGENCIES,
//   ...EU_AGENCIES,
//   { value: 'OTHER', label: 'Other Agency' }
// ];

const GRANT_TYPES = {
  'NIH': ['R01', 'R21', 'R03', 'K99/R00', 'F31', 'F32', 'T32', 'U01', 'P01', 'R15', 'R35', 'Other'],
  'NSF': ['Standard Grant', 'CAREER', 'RAPID', 'EAGER', 'SBIR/STTR', 'Graduate Fellowship', 'Other'],
  'DOD': ['MURI', 'DURIP', 'YIP', 'SBIR/STTR', 'Other'],
  'DARPA': ['Young Faculty Award', 'Director\'s Fellowship', 'Seedling', 'Other'],
  'ONR': ['Young Investigator', 'DURIP', 'MURI', 'Other'],
  'DOE': ['Early Career', 'SBIR/STTR', 'ARPA-E', 'Other'],
  'NASA': ['ROSES', 'SBIR/STTR', 'Space Technology', 'Other'],
  'USDA': ['AFRI', 'NIFA', 'SBIR', 'Other'],
  'ED': ['IES', 'FIPSE', 'Other'],
  'DHS': ['SBIR', 'Centers of Excellence', 'Other'],
  'DOL': ['Workforce Development', 'Other'],
  'DOT': ['SBIR', 'UTC', 'Other'],
  'VA': ['Merit Review', 'Career Development', 'Other'],
  'HUD': ['Community Development', 'Other'],
  'EPA': ['STAR', 'SBIR', 'Other'],
  'NEH': ['Research', 'Public Programs', 'Other'],
  'CDC': ['Research', 'Prevention', 'Other'],
  'AHRQ': ['Research', 'Dissertation', 'Other'],
  'EC': ['ERC Starting', 'ERC Consolidator', 'ERC Advanced', 'MSCA', 'RIA', 'IA', 'CSA', 'Other'],
  'ERC': ['Starting Grant', 'Consolidator Grant', 'Advanced Grant', 'Synergy Grant', 'Proof of Concept', 'Other'],
  'REA': ['Marie Curie', 'Other'],
  'OTHER': ['Other']
};

const SECTIONS = [
  { value: 'specific-aims', label: 'Specific Aims' },
  { value: 'significance', label: 'Significance' },
  { value: 'innovation', label: 'Innovation' },
  { value: 'approach', label: 'Approach / Research Strategy' },
  { value: 'environment', label: 'Environment / Facilities' },
  { value: 'budget', label: 'Budget & Justification' },
  { value: 'biosketch', label: 'Biographical Sketch' },
  { value: 'resource-sharing', label: 'Resource Sharing Plans' },
  { value: 'references', label: 'References Cited' },
  { value: 'preliminary-studies', label: 'Preliminary Studies' },
  { value: 'broader-impacts', label: 'Broader Impacts (NSF)' },
  { value: 'intellectual-merit', label: 'Intellectual Merit (NSF)' },
  { value: 'technical-approach', label: 'Technical Approach (DARPA)' },
  { value: 'general-guidelines', label: 'General Guidelines' },
  { value: 'formatting', label: 'Formatting Requirements' },
  { value: 'other', label: 'Other' }
];

const DOCUMENT_TYPES = [
  { value: 'guidelines', label: 'Official Guidelines' },
  { value: 'template', label: 'Template' },
  { value: 'example', label: 'Example/Sample' },
  { value: 'tips', label: 'Writing Tips' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'faq', label: 'FAQ' }
];

const GrantGuidelineUpload = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [metadata, setMetadata] = useState({
    agency: 'NIH',
    grantType: 'R01',
    section: 'specific-aims',
    documentType: 'guidelines',
    year: new Date().getFullYear().toString(),
    version: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [statusSubscription, setStatusSubscription] = useState(null);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (statusSubscription) {
        console.log('🧹 Cleaning up subscription');
        statusSubscription.unsubscribe();
      }
    };
  }, [statusSubscription]);

  const validateFile = (file) => {
    if (!file) {
      return 'Please select a file';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
      return `Unsupported file type. Supported: ${Object.values(SUPPORTED_FILE_TYPES).join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (file) => {
    setError(null);
    setSuccess(false);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => {
      const updated = { ...prev, [field]: value };

      // Reset grant type when agency changes
      if (field === 'agency') {
        const availableTypes = GRANT_TYPES[value] || ['Other'];
        updated.grantType = availableTypes[0];
      }

      return updated;
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    setProcessingStatus('preparing');

    let documentId = null;
    let subscription = null;

    try {
      console.log('🚀 Starting grant guideline upload:', selectedFile.name);
      console.log('📋 Metadata:', metadata);

      // Set up subscription
      const subscriptionQuery = `
        subscription OnUpdateDocumentMetadata {
          onUpdateDocumentMetadata {
            documentId
            userId
            filename
            status
            errorMessage
            vectorIndexed
            processedAt
          }
        }
      `;

      console.log('📡 Setting up subscription...');

      try {
        subscription = client.graphql({
          query: subscriptionQuery,
          authMode: 'userPool'
        }).subscribe({
          next: ({ data }) => {
            const doc = data?.onUpdateDocumentMetadata;
            if (!doc) return;

            if (documentId && doc.documentId === documentId) {
              console.log(`✅ Status update: ${doc.status}`);

              const timeoutId = window[`timeout_${documentId}`];
              if (timeoutId) {
                clearTimeout(timeoutId);
                delete window[`timeout_${documentId}`];
              }

              setProcessingStatus(doc.status);

              if (doc.status === 'ready') {
                console.log('🎉 Document is ready!');
                setSuccess(true);
                setTimeout(() => {
                  setProcessingStatus(null);
                  setCurrentDocumentId(null);
                  setSelectedFile(null);
                  setSuccess(false);
                  if (subscription) {
                    subscription.unsubscribe();
                  }
                  if (onUploadComplete) {
                    onUploadComplete();
                  }
                }, 3000);
              } else if (doc.status === 'failed') {
                console.error('❌ Processing failed:', doc.errorMessage);
                setError(`Processing failed: ${doc.errorMessage || 'Unknown error'}`);
                setProcessingStatus('failed');
                setCurrentDocumentId(null);
                setUploading(false);
                if (subscription) {
                  subscription.unsubscribe();
                }
              }
            }
          },
          error: (err) => {
            console.error('❌ Subscription error:', err);
            setError(`Subscription error: ${err?.errors?.[0]?.message || err.message}`);
          }
        });

        setStatusSubscription(subscription);
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('✅ Subscription ready');

      } catch (subError) {
        console.error('❌ Failed to create subscription:', subError);
        console.warn('⚠️ Continuing without real-time updates');
      }

      // Get presigned URL with enhanced metadata
      const uploadDocumentMutation = `
        mutation UploadDocument($input: UploadDocumentInput!) {
          uploadDocument(input: $input) {
            documentId
            uploadUrl
            status
            s3Key
            s3Bucket
            expiresIn
          }
        }
      `;

      const mutationInput = {
        filename: selectedFile.name,
        contentType: selectedFile.type,
        fileSize: selectedFile.size,
        category: 'grant-guidelines',
        // Enhanced metadata
        grantMetadata: {
          agency: metadata.agency,
          grantType: metadata.grantType,
          section: metadata.section,
          documentType: metadata.documentType,
          year: metadata.year,
          version: metadata.version || undefined
        }
      };

      console.log('🔗 Requesting presigned URL with metadata...');
      setProcessingStatus('uploading');

      const uploadResponse = await client.graphql({
        query: uploadDocumentMutation,
        variables: {
          input: mutationInput
        },
        authMode: 'userPool'
      });

      const { uploadUrl, documentId: receivedDocId } = uploadResponse.data.uploadDocument;

      if (!uploadUrl || !receivedDocId) {
        throw new Error('Invalid response from server');
      }

      documentId = receivedDocId;
      setCurrentDocumentId(documentId);
      console.log('✅ Received upload URL and document ID:', documentId);

      // Upload to S3
      console.log('📤 Uploading to S3...');
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          console.log('✅ S3 upload complete');
          setSuccess(true);
          setUploading(false);
          setUploadProgress(100);
          setProcessingStatus('processing');

          const timeoutId = setTimeout(() => {
            console.log('⏰ Processing timeout - assuming ready');
            setProcessingStatus('ready');
            setSuccess(true);
            setTimeout(() => {
              setProcessingStatus(null);
              setCurrentDocumentId(null);
              setSelectedFile(null);
              setSuccess(false);
              if (subscription) {
                subscription.unsubscribe();
              }
              if (onUploadComplete) {
                onUploadComplete();
              }
            }, 3000);
          }, 30000);

          if (documentId) {
            window[`timeout_${documentId}`] = timeoutId;
          }
        } else {
          console.error('❌ S3 upload failed:', xhr.status);
          setError(`Upload failed: ${xhr.status} ${xhr.statusText}`);
          setUploading(false);
          setProcessingStatus(null);
        }
      });

      xhr.addEventListener('error', () => {
        console.error('❌ Network error during upload');
        setError('Network error during upload. Please try again.');
        setUploading(false);
        setProcessingStatus(null);
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', selectedFile.type);
      xhr.send(selectedFile);

    } catch (err) {
      console.error('❌ Upload error:', err);
      let errorMessage = 'Failed to upload document';
      if (err.errors && err.errors.length > 0) {
        errorMessage = err.errors[0].message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setUploading(false);
      setProcessingStatus(null);

      if (subscription) {
        subscription.unsubscribe();
      }
    }
  };

  const availableGrantTypes = GRANT_TYPES[metadata.agency] || ['Other'];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        padding: '16px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '16px' }}>
          📚 Grant Guidelines Upload
        </h3>
        <p style={{ margin: 0, color: '#1e40af', fontSize: '14px' }}>
          Upload official grant guidelines, templates, and writing tips with structured metadata for precise retrieval during proposal generation.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '3px dashed #3b82f6' : '2px dashed #d1d5db',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#eff6ff' : '#f9fafb',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: '24px'
        }}
        onClick={() => document.getElementById('grantFileInput').click()}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#111827' }}>
          {selectedFile ? selectedFile.name : 'Drop your guideline document here or click to browse'}
        </h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          Supported: PDF, DOCX, DOC, TXT, MD (Max 10MB)
        </p>
        <input
          id="grantFileInput"
          type="file"
          accept={Object.keys(SUPPORTED_FILE_TYPES).join(',')}
          onChange={(e) => handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>

      {/* Metadata Form */}
      {selectedFile && (
        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#111827' }}>Document Metadata</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Agency */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Funding Agency *
              </label>
              <select
                value={metadata.agency}
                onChange={(e) => handleMetadataChange('agency', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <optgroup label="🇺🇸 US Federal Agencies">
                  {US_AGENCIES.map(agency => (
                    <option key={agency.value} value={agency.value}>{agency.label}</option>
                  ))}
                </optgroup>
                <optgroup label="🇪🇺 European Agencies">
                  {EU_AGENCIES.map(agency => (
                    <option key={agency.value} value={agency.value}>{agency.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  <option value="OTHER">Other Agency</option>
                </optgroup>
              </select>
            </div>

            {/* Grant Type */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Grant Type *
              </label>
              <select
                value={metadata.grantType}
                onChange={(e) => handleMetadataChange('grantType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {availableGrantTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Section/Topic *
              </label>
              <select
                value={metadata.section}
                onChange={(e) => handleMetadataChange('section', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {SECTIONS.map(section => (
                  <option key={section.value} value={section.value}>{section.label}</option>
                ))}
              </select>
            </div>

            {/* Document Type */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Document Type *
              </label>
              <select
                value={metadata.documentType}
                onChange={(e) => handleMetadataChange('documentType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Year *
              </label>
              <input
                type="text"
                value={metadata.year}
                onChange={(e) => handleMetadataChange('year', e.target.value)}
                placeholder="2024"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Version */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                Version (Optional)
              </label>
              <input
                type="text"
                value={metadata.version}
                onChange={(e) => handleMetadataChange('version', e.target.value)}
                placeholder="v1.0, Rev A, etc."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Metadata Preview */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            <strong>Tags:</strong> {metadata.agency}, {metadata.grantType}, {metadata.section}, {metadata.documentType}, {metadata.year}
            {metadata.version && `, ${metadata.version}`}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#374151' }}>Uploading...</span>
            <span style={{ fontSize: '14px', color: '#374151' }}>{uploadProgress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {/* Processing Status */}
      {processingStatus && (
        <div style={{
          padding: '16px',
          backgroundColor: processingStatus === 'processing' ? '#dbeafe' : '#d1fae5',
          border: `1px solid ${processingStatus === 'processing' ? '#93c5fd' : '#a7f3d0'}`,
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {processingStatus === 'processing' && (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid #3b82f6',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <div>
                  <div style={{ fontWeight: '500', color: '#1e40af' }}>
                    Processing Document
                  </div>
                  <div style={{ fontSize: '14px', color: '#1e40af' }}>
                    Vectorizing and indexing with metadata tags...
                  </div>
                </div>
              </>
            )}
            {processingStatus === 'ready' && (
              <>
                <div style={{ fontSize: '24px' }}>✅</div>
                <div>
                  <div style={{ fontWeight: '500', color: '#065f46' }}>
                    Document Ready!
                  </div>
                  <div style={{ fontSize: '14px', color: '#065f46' }}>
                    Guideline indexed and ready for proposal generation.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', color: '#991b1b' }}>Upload Error</div>
              <div style={{ fontSize: '14px', color: '#991b1b', marginTop: '4px' }}>{error}</div>
              <button
                onClick={() => setError(null)}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  border: '1px solid #dc2626',
                  borderRadius: '4px',
                  color: '#991b1b',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && !processingStatus && (
        <div style={{
          padding: '12px',
          backgroundColor: '#d1fae5',
          border: '1px solid #a7f3d0',
          borderRadius: '4px',
          color: '#065f46',
          marginBottom: '20px'
        }}>
          ✅ Guideline uploaded successfully! Processing will begin shortly.
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: uploading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            opacity: uploading ? 0.6 : 1
          }}
          onMouseEnter={(e) => !uploading && (e.target.style.backgroundColor = '#2563eb')}
          onMouseLeave={(e) => !uploading && (e.target.style.backgroundColor = '#3b82f6')}
        >
          {uploading ? 'Uploading...' : 'Upload Grant Guideline'}
        </button>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GrantGuidelineUpload;
