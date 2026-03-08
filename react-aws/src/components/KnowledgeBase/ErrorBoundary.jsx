import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Knowledge Base Error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          maxWidth: '600px',
          margin: '40px auto',
          backgroundColor: '#fee2e2',
          border: '2px solid #fecaca',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '20px' }}>
            ⚠️
          </div>
          <h2 style={{ color: '#991b1b', marginBottom: '16px', textAlign: 'center' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#991b1b', marginBottom: '20px', textAlign: 'center' }}>
            The Knowledge Base encountered an unexpected error. This has been logged for investigation.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginBottom: '20px', 
              padding: '12px', 
              backgroundColor: '#fff', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{ overflow: 'auto', fontSize: '11px' }}>
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
