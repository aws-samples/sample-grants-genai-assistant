import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

const SearchInterface = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Grant guideline filters
  const [agencyFilter, setAgencyFilter] = useState('');
  const [grantTypeFilter, setGrantTypeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();

    const trimmedQuery = query.trim();

    // Allow empty query or * to search all documents
    if (!trimmedQuery && !categoryFilter && !agencyFilter && !grantTypeFilter && !sectionFilter && !documentTypeFilter && !yearFilter) {
      setError('Please enter a search query or select at least one filter');
      return;
    }

    setSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      // Note: The generated type is SearchFiltersInput (with Input suffix) due to Amplify codegen
      const searchDocumentsQuery = `
        query SearchDocuments($query: String!, $filters: SearchFiltersInput, $limit: Int, $offset: Int) {
          searchDocuments(query: $query, filters: $filters, limit: $limit, offset: $offset) {
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

      // Build filters object with all active filters
      const filters = {};
      if (categoryFilter) filters.category = categoryFilter;
      if (agencyFilter) filters.agency = agencyFilter;
      if (grantTypeFilter) filters.grantType = grantTypeFilter;
      if (sectionFilter) filters.section = sectionFilter;
      if (documentTypeFilter) filters.documentType = documentTypeFilter;
      if (yearFilter) filters.year = yearFilter;

      const hasFilters = Object.keys(filters).length > 0;

      // Use a generic query for "show all" searches
      const searchQuery = (!trimmedQuery || trimmedQuery === '*') ? 'document' : trimmedQuery;

      const { data } = await client.graphql({
        query: searchDocumentsQuery,
        variables: {
          query: searchQuery,
          filters: hasFilters ? filters : null,
          limit: 20,
          offset: 0
        },
        authMode: 'userPool'
      });

      setResults(data.searchDocuments.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleShowAll = async () => {
    setQuery('*');
    setSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const searchDocumentsQuery = `
        query SearchDocuments($query: String!, $filters: SearchFiltersInput, $limit: Int, $offset: Int) {
          searchDocuments(query: $query, filters: $filters, limit: $limit, offset: $offset) {
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

      // Build filters object with all active filters
      const filters = {};
      if (categoryFilter) filters.category = categoryFilter;
      if (agencyFilter) filters.agency = agencyFilter;
      if (grantTypeFilter) filters.grantType = grantTypeFilter;
      if (sectionFilter) filters.section = sectionFilter;
      if (documentTypeFilter) filters.documentType = documentTypeFilter;
      if (yearFilter) filters.year = yearFilter;

      const hasFilters = Object.keys(filters).length > 0;

      // Use a broad search query that should match most documents
      const { data } = await client.graphql({
        query: searchDocumentsQuery,
        variables: {
          query: 'research grant proposal document paper report',
          filters: hasFilters ? filters : null,
          limit: 50,
          offset: 0
        },
        authMode: 'userPool'
      });

      setResults(data.searchDocuments.results || []);

      // If no results, show helpful message
      if (!data.searchDocuments.results || data.searchDocuments.results.length === 0) {
        console.log('No results from search. Check if documents are synced to Knowledge Base.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const highlightText = (text, query) => {
    if (!text || !query || query === '*') return text;

    // Escape special regex characters
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    try {
      const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ?
          <mark key={index} style={{ backgroundColor: '#fef08a', padding: '2px 4px' }}>{part}</mark> :
          part
      );
    } catch (err) {
      // If regex still fails, return original text
      console.error('Highlight error:', err);
      return text;
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Search Form */}
      <form onSubmit={handleSearch} style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your documents... (e.g., 'machine learning algorithms')"
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        {/* Filters Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px' }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Categories</option>
            <option value="grant-guidelines">Grant Guidelines</option>
            <option value="research">Research Papers</option>
            <option value="proposals">Grant Proposals</option>
            <option value="reports">Reports</option>
            <option value="documentation">Documentation</option>
            <option value="other">Other</option>
          </select>

          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Agencies</option>
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
              <option value="Horizon Europe (HORIZON)">Horizon Europe (HORIZON)</option>
              <option value="Digital Europe Programme (DIGITAL)">Digital Europe Programme (DIGITAL)</option>
              <option value="Connecting Europe Facility (CEF)">Connecting Europe Facility (CEF)</option>
              <option value="LIFE Programme (LIFE)">LIFE Programme (LIFE)</option>
              <option value="European Union Aviation Safety Agency (EUAF)">European Union Aviation Safety Agency (EUAF)</option>
            </optgroup>
            <optgroup label="Other">
              <option value="OTHER">Other Agency</option>
            </optgroup>
          </select>

          <select
            value={grantTypeFilter}
            onChange={(e) => setGrantTypeFilter(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Grant Types</option>
            <option value="R01">R01</option>
            <option value="R21">R21</option>
            <option value="SBIR">SBIR</option>
            <option value="STTR">STTR</option>
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Sections</option>
            <option value="specific-aims">Specific Aims</option>
            <option value="research-strategy">Research Strategy</option>
            <option value="budget">Budget</option>
            <option value="biosketch">Biosketch</option>
          </select>

          <select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">All Doc Types</option>
            <option value="guidelines">Guidelines</option>
            <option value="template">Template</option>
            <option value="example">Example</option>
            <option value="instructions">Instructions</option>
          </select>

          <input
            type="text"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            placeholder="Year (e.g., 2024)"
            style={{
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={searching}
            style={{
              padding: '10px 30px',
              backgroundColor: searching ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: searching ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!searching) {
                e.target.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!searching) {
                e.target.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {searching ? '🔍 Searching...' : '🔍 Search'}
          </button>

          <button
            type="button"
            onClick={handleShowAll}
            disabled={searching}
            style={{
              padding: '10px 30px',
              backgroundColor: searching ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: searching ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!searching) {
                e.target.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!searching) {
                e.target.style.backgroundColor = '#10b981';
              }
            }}
          >
            📋 Show All Documents
          </button>
        </div>
      </form>

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

      {/* Loading State */}
      {searching && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
          <p style={{ color: '#6b7280' }}>Searching your documents...</p>
        </div>
      )}

      {/* Results */}
      {!searching && hasSearched && (
        <>
          {results.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '15px' }}>🔍</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#374151' }}>No results found</h3>
              <p style={{ margin: 0, color: '#6b7280' }}>
                Try different keywords or check if your documents have been processed
              </p>
            </div>
          ) : (
            <>
              <div style={{
                marginBottom: '20px',
                padding: '10px 15px',
                backgroundColor: '#eff6ff',
                borderRadius: '4px',
                color: '#1e40af',
                fontSize: '14px'
              }}>
                Found {results.length} relevant result{results.length !== 1 ? 's' : ''}{query && query !== '*' ? ` for "${query}"` : ''}
              </div>

              <div style={{ display: 'grid', gap: '15px' }}>
                {results.map((result, index) => (
                  <div
                    key={result.documentId + index}
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
                    {/* Header with filename and relevance score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>
                        📄 {result.filename}
                      </h3>
                      <div style={{
                        padding: '4px 12px',
                        backgroundColor: getScoreColor(result.relevanceScore).bg,
                        color: getScoreColor(result.relevanceScore).text,
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        marginLeft: '10px'
                      }}>
                        {Math.round(result.relevanceScore * 100)}% match
                      </div>
                    </div>

                    {/* Excerpt */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderLeft: '3px solid #3b82f6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#374151'
                    }}>
                      {highlightText(result.excerpt, query)}
                    </div>

                    {/* Metadata */}
                    {result.metadata && (
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                        {typeof result.metadata === 'string' ? result.metadata : JSON.stringify(result.metadata)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Info Box */}
      {!hasSearched && (
        <div style={{
          padding: '20px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>💡 Search Tips</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
            <li>Use natural language queries like "machine learning for healthcare"</li>
            <li>Search is semantic - it understands meaning, not just keywords</li>
            <li>Results are ranked by relevance to your query</li>
            <li>Filter by category to narrow your search</li>
            <li>Only documents with "ready" status are searchable</li>
          </ul>
        </div>
      )}
    </div>
  );
};

const getScoreColor = (score) => {
  if (score >= 0.8) {
    return { bg: '#d1fae5', text: '#065f46' }; // Green
  } else if (score >= 0.6) {
    return { bg: '#fef3c7', text: '#92400e' }; // Yellow
  } else {
    return { bg: '#fee2e2', text: '#991b1b' }; // Red
  }
};

export default SearchInterface;
