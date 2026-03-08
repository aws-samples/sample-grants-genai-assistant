/**
 * Proposal Generation Progress Component
 * 
 * Real-time progress tracking using AppSync Events for proposal generation.
 * Shows live progress updates, status changes, and completion notifications.
 */

import React, { useState, useEffect, useCallback } from 'react';

// AppSync Events Client (simplified - would use actual AWS SDK)
class AppSyncEventsClient {
  constructor(config) {
    this.apiId = config.apiId;
    this.apiKey = config.apiKey;
    this.region = config.region;
    this.subscriptions = new Map();
    this.connected = false;
  }

  async connect() {
    // Simulate WebSocket connection to AppSync Events
    console.log(`Connecting to AppSync Events API: ${this.apiId}`);
    this.connected = true;
    return Promise.resolve();
  }

  subscribe(channel, callback) {
    console.log(`Subscribing to channel: ${channel}`);
    this.subscriptions.set(channel, callback);
    
    // Return unsubscribe function
    return () => {
      console.log(`Unsubscribing from channel: ${channel}`);
      this.subscriptions.delete(channel);
    };
  }

  // Simulate receiving events (for demo purposes)
  simulateEvent(channel, event) {
    const callback = this.subscriptions.get(channel);
    if (callback) {
      callback(event);
    }
  }

  disconnect() {
    this.connected = false;
    this.subscriptions.clear();
  }
}

const ProposalGenerationProgress = ({ 
  proposalId, 
  userId, 
  onComplete, 
  onError,
  appSyncConfig 
}) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('QUEUED');
  const [currentStep, setCurrentStep] = useState('');
  const [message, setMessage] = useState('Initializing proposal generation...');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  const [eventsClient, setEventsClient] = useState(null);

  // Initialize AppSync Events client
  useEffect(() => {
    if (!appSyncConfig || !proposalId) return;

    const client = new AppSyncEventsClient({
      apiId: appSyncConfig.eventsApiId,
      apiKey: appSyncConfig.apiKey,
      region: appSyncConfig.region || 'us-east-1'
    });

    setEventsClient(client);

    // Connect to AppSync Events
    client.connect().then(() => {
      console.log('Connected to AppSync Events');
    }).catch(err => {
      console.error('Failed to connect to AppSync Events:', err);
      setError('Failed to connect to real-time updates');
    });

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, [appSyncConfig, proposalId]);

  // Handle proposal status updates
  const handleStatusUpdate = useCallback((event) => {
    console.log('Received status update:', event);

    if (event.eventType === 'PROPOSAL_STATUS_UPDATE' && event.proposal) {
      const { proposal } = event;
      
      setStatus(proposal.status);
      
      if (proposal.progress) {
        setProgress(proposal.progress.percentage || 0);
        setCurrentStep(proposal.progress.currentStep || '');
        
        // Enhanced message with section progress
        let displayMessage = proposal.progress.message || '';
        if (proposal.progress.currentSection) {
          displayMessage = `Generating ${proposal.progress.currentSection}...`;
          if (proposal.progress.sectionsCompleted !== undefined && proposal.progress.sectionsTotal) {
            displayMessage += ` (${proposal.progress.sectionsCompleted}/${proposal.progress.sectionsTotal} sections complete)`;
          }
        }
        setMessage(displayMessage);
      }

      // Handle completion
      if (proposal.status === 'COMPLETED') {
        setDownloadUrl(proposal.downloadUrl);
        if (onComplete) {
          onComplete(proposal);
        }
      }

      // Handle errors
      if (proposal.status === 'FAILED') {
        setError(proposal.errorMessage || 'Proposal generation failed');
        if (onError) {
          onError(proposal.errorMessage);
        }
      }
    }
  }, [onComplete, onError]);

  // Handle completion notifications
  const handleNotification = useCallback((event) => {
    console.log('Received notification:', event);

    if (event.eventType === 'PROPOSAL_COMPLETED' && event.notification) {
      const { notification } = event;
      setDownloadUrl(notification.downloadUrl);
      setMessage(notification.message);
    }

    if (event.eventType === 'PROPOSAL_FAILED' && event.notification) {
      const { notification } = event;
      setError(notification.errorMessage);
      setMessage(notification.message);
    }
  }, []);

  // Subscribe to real-time events
  useEffect(() => {
    if (!eventsClient || !proposalId || !userId) return;

    // Subscribe to proposal-specific updates
    const unsubscribeProposal = eventsClient.subscribe(
      `proposals/${proposalId}`,
      handleStatusUpdate
    );

    // Subscribe to user notifications
    const unsubscribeNotifications = eventsClient.subscribe(
      `notifications/${userId}`,
      handleNotification
    );

    return () => {
      unsubscribeProposal();
      unsubscribeNotifications();
    };
  }, [eventsClient, proposalId, userId, handleStatusUpdate, handleNotification]);

  // Get progress color based on status
  const getProgressColor = () => {
    switch (status) {
      case 'COMPLETED':
        return '#52c41a'; // Green
      case 'FAILED':
        return '#ff4d4f'; // Red
      case 'PROCESSING':
        return '#1890ff'; // Blue
      default:
        return '#d9d9d9'; // Gray
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'COMPLETED':
        return '✅';
      case 'FAILED':
        return '❌';
      case 'PROCESSING':
        return '⚙️';
      default:
        return '📝';
    }
  };

  // Format step name for display
  const formatStepName = (step) => {
    return step
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <span style={{ fontSize: '24px' }}>{getStatusIcon()}</span>
        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Proposal Generation Progress
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Progress Bar */}
        <div>
          <div style={{
            width: '100%',
            height: '24px',
            backgroundColor: '#f3f4f6',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.round(progress)}%`,
              height: '100%',
              backgroundColor: getProgressColor(),
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)'
              }}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Current Step and Message */}
        <div>
          {currentStep && (
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
              Current Step: {formatStepName(currentStep)}
            </div>
          )}
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            {message}
          </div>
        </div>

        {/* Status Information */}
        <div>
          <span>Status: </span>
          <span style={{ 
            fontWeight: '600',
            color: status === 'COMPLETED' ? '#52c41a' : 
                   status === 'FAILED' ? '#ff4d4f' : 
                   status === 'PROCESSING' ? '#1890ff' : '#666'
          }}>
            {status}
          </span>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              ❌ Generation Failed
            </div>
            <div style={{ fontSize: '14px' }}>
              {error}
            </div>
          </div>
        )}

        {/* Success and Download */}
        {status === 'COMPLETED' && (
          <div style={{
            padding: '16px',
            backgroundColor: '#d1fae5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            color: '#065f46'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
              ✅ Proposal Generated Successfully!
            </div>
            <div style={{ fontSize: '14px', marginBottom: '12px' }}>
              Your proposal has been generated and is ready for download.
            </div>
            {downloadUrl && (
              <button
                onClick={() => window.open(downloadUrl, '_blank')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📥 Download Proposal
              </button>
            )}
          </div>
        )}

        {/* Real-time Connection Status */}
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          Real-time updates: {eventsClient?.connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>

      </div>
    </div>
  );
};

export default ProposalGenerationProgress;