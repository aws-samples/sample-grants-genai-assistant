import React from 'react';
import { Amplify } from 'aws-amplify';
import AppLayout from './components/Layout/AppLayout';
import MainContent from './components/MainContent';
import { SearchProvider } from './contexts/SearchContext';
import outputs from './amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs);

function App() {
  return (
    <SearchProvider>
      <AppLayout>
        <MainContent />
      </AppLayout>
    </SearchProvider>
  );
}

export default App;