import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  // Persistent search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState('US');
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('IDLE');
  const [grants, setGrants] = useState([]);
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [categorizedGrants, setCategorizedGrants] = useState({
    closesoon: [],
    match: [],
    budget: [],
    other: []
  });

  const value = {
    searchQuery,
    setSearchQuery,
    searchSource,
    setSearchSource,
    sessionId,
    setSessionId,
    status,
    setStatus,
    grants,
    setGrants,
    selectedGrant,
    setSelectedGrant,
    categorizedGrants,
    setCategorizedGrants,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
