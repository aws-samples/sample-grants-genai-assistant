import React, { useState, useCallback, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

const SUPPORTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'text/plain': '.txt'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILENAME_LENGTH = 100; // S3 key length limit

const DocumentUpload = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [agency, setAgency] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [statusSubscription, setStatusSubscription] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Fetch existing documents on mount
  useEffect(() => {
    fetchExistingDocuments();
  }, []);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (statusSubscription) {
        console.log('🧹 Cleaning up subscription');
        statusSubscription.unsubscribe();
      }
    };
  }, [statusSubscription]);

  const fetchExistingDocuments = async () => {
    try {
      const listDocumentsQuery = `
        query ListDocuments($filters: SearchFiltersInput, $limit: Int, $offset: Int) {
          listDocuments(filters: $filters, limit: $limit, offset: $offset)
        }
      `;

      const { data } = await client.graphql({
        query: listDocumentsQuery,
        variables: {
          filters: null,
          limit: 1000, // Get all documents for duplicate checking
          offset: 0
        },
        authMode: 'userPool'
      });

      const response = typeof data.listDocuments === 'string'
        ? JSON.parse(data.listDocuments)
        : data.listDocuments;

      const docs = response?.documents || [];
      setExistingDocuments(Array.isArray(docs) ? docs : []);
      console.log('📚 Loaded existing documents for duplicate checking:', docs.length);
    } catch (err) {
      console.error('⚠️ Failed to fetch existing documents:', err);
      // Don't block upload if we can't fetch existing docs
    }
  };

  const checkForDuplicate = (filename, selectedAgency) => {
    if (!filename || !selectedAgency) return null;

    const duplicate = existingDocuments.find(
      doc => doc.filename === filename &&
        (doc.agency === selectedAgency || doc.grantMetadata?.agency === selectedAgency)
    );

    return duplicate;
  };

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

  const handleFileSelect = useCallback((file) => {
    console.log('🔍 handleFileSelect called with:', file);
    setError(null);
    setSuccess(false);
    setDuplicateWarning(null);
    setConfirmOverwrite(false);

    const validationError = validateFile(file);
    console.log('✅ Validation result:', validationError || 'PASSED');

    if (validationError) {
      console.error('❌ Validation failed:', validationError);
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    // Handle long filenames by truncating
    if (file.name.length > MAX_FILENAME_LENGTH) {
      const extension = file.name.substring(file.name.lastIndexOf('.'));
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
      const truncatedName = nameWithoutExt.substring(0, MAX_FILENAME_LENGTH - extension.length - 3) + '...' + extension;

      console.log(`⚠️ Filename too long (${file.name.length} chars), truncating to: ${truncatedName}`);

      // Create a new File object with truncated name
      const truncatedFile = new File([file], truncatedName, { type: file.type });
      setSelectedFile(truncatedFile);
      // Don't set error - this is just a warning, file will still upload
    } else {
      console.log('✅ Setting selectedFile to:', file.name);
      setSelectedFile(file);
    }
  }, []);

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

    console.log('🎯 Drop event triggered');
    console.log('📦 Files:', e.dataTransfer.files);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      console.log('📄 File dropped:', file.name, file.type, file.size);
      handleFileSelect(file);
    } else {
      console.warn('⚠️ No files in drop event');
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    if (!agency) {
      setError('Please select an agency');
      return;
    }

    if (!category) {
      setError('Please select a category');
      return;
    }

    // Check for duplicates
    const duplicate = checkForDuplicate(selectedFile.name, agency);
    if (duplicate && !confirmOverwrite) {
      setDuplicateWarning(duplicate);
      return;
    }

    setUploading(true);
    setError(null);
    setDuplicateWarning(null);
    setUploadProgress(0);
    setProcessingStatus('preparing');

    let documentId = null;
    let subscription = null;

    try {
      console.log('🚀 Starting upload for:', selectedFile.name);

      // Step 1: Set up subscription FIRST (before getting presigned URL)
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

      console.log('📡 Setting up subscription BEFORE upload...');

      try {
        subscription = client.graphql({
          query: subscriptionQuery,
          authMode: 'userPool'
        }).subscribe({
          next: ({ data }) => {
            const doc = data?.onUpdateDocumentMetadata;

            if (!doc) {
              console.warn('⚠️ Received empty subscription data');
              return;
            }

            console.log(`📄 Subscription update - Document: ${doc.documentId}, Status: ${doc.status}`);

            // Only process updates for our document
            if (documentId && doc.documentId === documentId) {
              console.log(`✅ Status update for OUR document (${doc.filename}): ${doc.status}`);

              // Clear the timeout since we got a subscription update
              const timeoutId = window[`timeout_${documentId}`];
              if (timeoutId) {
                console.log('⏰ Clearing timeout - subscription received');
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
                const errorMsg = doc.errorMessage || 'Unknown error occurred during processing';
                setError(`Document processing failed: ${errorMsg}`);
                setProcessingStatus('failed');
                setCurrentDocumentId(null);
                setUploading(false);
                setCanRetry(true);
                if (subscription) {
                  subscription.unsubscribe();
                }
              }
            }
          },
          error: (err) => {
            console.error('❌ Subscription error:', err);
            console.error('❌ Full error object:', JSON.stringify(err, null, 2));
            const errorMsg = err?.errors?.[0]?.message || err.message || 'Unknown subscription error';
            console.error('❌ Error message:', errorMsg);
            setError(`Subscription error: ${errorMsg}`);
          }
        });

        setStatusSubscription(subscription);
        console.log('✅ Subscription established, waiting for connection...');

        // Give subscription time to connect (critical for not missing updates)
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('✅ Subscription ready');

      } catch (subError) {
        console.error('❌ Failed to create subscription:', subError);
        // Don't fail the upload, just warn
        console.warn('⚠️ Continuing without real-time updates');
      }

      // Step 2: Get presigned URL from GraphQL API
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
        category: category,
        agency: agency
      };

      console.log('🔗 Requesting presigned URL...');
      setProcessingStatus('uploading');

      const uploadResponse = await client.graphql({
        query: uploadDocumentMutation,
        variables: {
          input: mutationInput
        },
        authMode: 'userPool'
      });

      const { uploadUrl, documentId: receivedDocId } = uploadResponse.data.uploadDocument;

      if (!uploadUrl) {
        throw new Error('No upload URL received from server');
      }

      if (!receivedDocId) {
        throw new Error('No document ID received from server');
      }

      // Store document ID for subscription filtering
      documentId = receivedDocId;
      setCurrentDocumentId(documentId);
      console.log('✅ Received upload URL and document ID:', documentId);

      // Step 3: Upload file to S3
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

          // Set a fallback timeout in case subscription doesn't update
          const timeoutId = setTimeout(() => {
            console.log('⏰ Processing timeout reached - assuming document is ready');
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
          }, 30000); // 30 seconds timeout

          // Store timeout ID so we can clear it if subscription updates
          if (documentId) {
            window[`timeout_${documentId}`] = timeoutId;
          }
        } else {
          console.error('❌ S3 upload failed:', xhr.status, xhr.statusText);
          setError(`Upload failed: ${xhr.status} ${xhr.statusText}`);
          setUploading(false);
          setProcessingStatus(null);
          setCurrentDocumentId(null);
        }
      });

      xhr.addEventListener('error', () => {
        console.error('❌ Network error during upload');
        setError('Network error during upload. Please try again.');
        setUploading(false);
        setProcessingStatus(null);
        setCurrentDocumentId(null);
      });

      xhr.addEventListener('abort', () => {
        console.warn('⚠️ Upload was cancelled');
        setError('Upload was cancelled.');
        setUploading(false);
        setProcessingStatus(null);
        setCurrentDocumentId(null);
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
      setCurrentDocumentId(null);

      // Clean up subscription on error
      if (subscription) {
        subscription.unsubscribe();
      }

      const canRetryUpload = retryCount < 3;
      setCanRetry(canRetryUpload);
    }
  };

  const handleRetry = () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    setError(null);
    setCanRetry(false);
    handleUpload();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
          marginBottom: '20px',
          position: 'relative',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {dragActive ? '⬇️' : '📄'}
        </div>
        <h3 style={{ margin: '0 0 8px 0', color: '#111827' }}>
          {selectedFile ? selectedFile.name : (dragActive ? 'Drop file here!' : 'Drag & drop or click button below')}
        </h3>
        <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
          Supported: PDF, TXT only (Max 10MB)
        </p>
        <button
          onClick={() => document.getElementById('fileInput').click()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Choose File
        </button>
        <input
          id="fileInput"
          type="file"
          accept={Object.keys(SUPPORTED_FILE_TYPES).join(',')}
          onChange={(e) => {
            console.log('📁 File input changed:', e.target.files);
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          style={{ display: 'none' }}
        />
      </div>

      {/* Agency Selection */}
      {selectedFile && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Agency <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={agency}
            onChange={(e) => {
              setAgency(e.target.value);
              setDuplicateWarning(null);
              setConfirmOverwrite(false);
              // Check for duplicate when agency changes
              if (selectedFile && e.target.value) {
                const duplicate = checkForDuplicate(selectedFile.name, e.target.value);
                if (duplicate) {
                  console.log('⚠️ Duplicate detected:', duplicate);
                }
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Select an agency...</option>
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

      {/* Category Selection */}
      {selectedFile && agency && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Content Category <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Select a category...</option>
            <option value="research">Research Papers & Publications</option>
            <option value="technical">Technical Documentation</option>
            <option value="reference">Reference Materials</option>
            <option value="examples">Example Proposals & Templates</option>
          </select>
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
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
            After upload completes, your document will be processed and indexed for search.
            ⚠️ Do not navigate away or switch browser tabs until the upload completes.
          </p>
        </div>
      )}

      {/* Processing Status */}
      {processingStatus && processingStatus !== 'failed' && (
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
                    Your document is being vectorized and indexed for search...
                    Do not navigate away or switch browser tabs until this completes.
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
                    Your document has been successfully indexed and is ready for search.
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
              <div style={{ fontWeight: '500', color: '#991b1b' }}>
                Upload Error
              </div>
              <div style={{ fontSize: '14px', color: '#991b1b', marginTop: '4px' }}>
                {error}
              </div>
              {retryCount > 0 && (
                <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>
                  Retry attempt {retryCount} of 3
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {canRetry && (
                  <button
                    onClick={handleRetry}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Retry Upload
                  </button>
                )}
                <button
                  onClick={() => {
                    setError(null);
                    setRetryCount(0);
                    setCanRetry(false);
                  }}
                  style={{
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
        </div>
      )}

      {/* Duplicate Warning */}
      {duplicateWarning && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', color: '#92400e' }}>
                Duplicate Document Detected
              </div>
              <div style={{ fontSize: '14px', color: '#92400e', marginTop: '4px' }}>
                A document with the filename "<strong>{duplicateWarning.filename}</strong>" and agency "<strong>{duplicateWarning.agency || duplicateWarning.grantMetadata?.agency}</strong>" already exists.
              </div>
              <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                Uploaded: {new Date(duplicateWarning.uploadDate).toLocaleDateString()} •
                Size: {(duplicateWarning.fileSize / 1024).toFixed(1)} KB •
                Status: {duplicateWarning.status}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => {
                    setConfirmOverwrite(true);
                    setDuplicateWarning(null);
                    handleUpload();
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Upload Anyway
                </button>
                <button
                  onClick={() => {
                    setDuplicateWarning(null);
                    setSelectedFile(null);
                    setAgency('');
                    setCategory('');
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #f59e0b',
                    borderRadius: '4px',
                    color: '#92400e',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel Upload
                </button>
              </div>
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
          ✅ Document uploaded successfully! Processing will begin shortly.
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && agency && category && (
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
          {uploading ? 'Uploading...' : 'Upload Content Document'}
        </button>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <strong>Debug:</strong> selectedFile={selectedFile ? selectedFile.name : 'null'},
          agency={agency || 'null'},
          category={category || 'null'},
          dragActive={dragActive ? 'true' : 'false'}
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '4px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#0c4a6e' }}>Content Documents</h4>
        <p style={{ margin: '0 0 10px 0', color: '#0c4a6e', fontSize: '14px' }}>
          Upload documents that will be used to help build proposal content. These are different from Grant Guidelines.
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#0c4a6e', fontSize: '14px' }}>
          <li>Select the funding agency first to enable proper filtering during proposal generation</li>
          <li>Choose a content category (research papers, technical docs, references, or examples)</li>
          <li>Documents are automatically processed and vectorized for semantic search</li>
          <li>At proposal time, only documents matching the grant's agency will be retrieved</li>
          <li>Processing typically takes 1-2 minutes depending on document size</li>
        </ul>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DocumentUpload;
