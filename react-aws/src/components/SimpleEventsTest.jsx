import React, { useState } from 'react';
import { events } from 'aws-amplify/api';

const SimpleEventsTest = () => {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testEventsAPI = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      console.log('🔍 Testing Events API...');
      console.log('🔍 Events object:', events);
      console.log('🔍 Events methods:', Object.getOwnPropertyNames(events));
      console.log('🔍 Events.connect:', events.connect);
      console.log('🔍 Type of events.connect:', typeof events.connect);
      
      setTestResult('Events API imported successfully. Check console for details.');
      
      // Try a simple connection test
      console.log('🔌 Attempting connection...');
      const testChannel = 'test/simple-test';
      
      const connectPromise = events.connect(testChannel);
      console.log('📡 Connect promise:', connectPromise);
      console.log('📡 Promise type:', typeof connectPromise);
      console.log('📡 Is Promise?', connectPromise instanceof Promise);
      
      // Set a shorter timeout for testing
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 3000)
      );
      
      const result = await Promise.race([connectPromise, timeoutPromise]);
      console.log('✅ Connection result:', result);
      setTestResult('Connection successful!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResult(`Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Simple Events API Test</h3>
      <button 
        onClick={testEventsAPI} 
        disabled={isLoading}
        style={{ padding: '10px 20px', marginBottom: '10px' }}
      >
        {isLoading ? 'Testing...' : 'Test Events API'}
      </button>
      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <strong>Result:</strong> {testResult || 'Click button to test'}
      </div>
    </div>
  );
};

export default SimpleEventsTest;