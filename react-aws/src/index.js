import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Note: Amplify configuration is now handled inside the component to avoid timing issues

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);