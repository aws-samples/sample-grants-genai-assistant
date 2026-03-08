/**
 * API Configuration for Grant Matchmaking System
 * 
 * Hybrid configuration supporting both CDK and Amplify Gen 2 backends
 */

// Removed amplify-api import for clean testing

// CDK API (fallback)
const CDK_API_BASE_URL = process.env.REACT_APP_CDK_API_URL || 'https://zzhwus1ur6.execute-api.us-east-1.amazonaws.com/prod';

// Feature flags to control which backend to use
// Note: Events API handles searches, GraphQL handles profiles, CDK API handles fallbacks
const USE_AMPLIFY_API = false; // Using Events API for searches instead
const USE_AMPLIFY_PROFILES = false; // Using direct GraphQL for profiles instead

// API endpoints - all CDK managed
export const API_ENDPOINTS = {
  // Grant search endpoints
  GRANTS_SEARCH: `${CDK_API_BASE_URL}/grants-search`,
  EU_GRANTS_SEARCH: `${CDK_API_BASE_URL}/eu-grants-search`,
  GRANT_DETAILS: `${CDK_API_BASE_URL}/grant-details`,
  
  // Profile management endpoints  
  USER_PROFILE: `${CDK_API_BASE_URL}/user-profile`,
  RESEARCHER_PROFILES: `${CDK_API_BASE_URL}/researcher-profiles`,
  
  // Subscription endpoints
  SUBSCRIPTIONS: `${CDK_API_BASE_URL}/subscriptions`
};

// Helper function for Bedrock agents API calls (existing functionality)
export const apiCall = async (endpoint, data) => {
  try {
    console.log(`Making Bedrock API call to: ${endpoint}`, data);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Bedrock API response:', result);
    return result;
  } catch (error) {
    console.error('Bedrock API call failed:', error);
    throw error;
  }
};

// Helper function for researcher profiles API calls (new CDK API)
export const profilesApiCall = async (method, endpoint, data = null) => {
  try {
    console.log(`Making Profiles API call: ${method} ${endpoint}`, data);
    
    const config = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(endpoint, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('Profiles API response:', result);
    return result;
  } catch (error) {
    console.error('Profiles API call failed:', error);
    throw error;
  }
};

// Hybrid API functions that can use either CDK or Amplify
export const hybridApiCall = async (endpoint, data) => {
  // For now, use CDK API directly since Events API handles searches
  // and GraphQL handles profiles
  return apiCall(endpoint, data);
};

// Researcher Profiles API helper functions (using CDK API)
export const ResearcherProfilesAPI = {
  // List all profiles with optional search
  list: (searchParams = {}) => {
    const queryString = new URLSearchParams(searchParams).toString();
    const url = queryString ? `${API_ENDPOINTS.RESEARCHER_PROFILES}?${queryString}` : API_ENDPOINTS.RESEARCHER_PROFILES;
    return profilesApiCall('GET', url);
  },
  
  // Get specific profile by user_id
  get: (userId) => {
    return profilesApiCall('GET', `${API_ENDPOINTS.RESEARCHER_PROFILES}/${userId}`);
  },
  
  // Create new profile
  create: (profileData) => {
    return profilesApiCall('POST', API_ENDPOINTS.RESEARCHER_PROFILES, profileData);
  },
  
  // Update existing profile
  update: (userId, profileData) => {
    return profilesApiCall('PUT', `${API_ENDPOINTS.RESEARCHER_PROFILES}/${userId}`, profileData);
  },
  
  // Delete profile
  delete: (userId) => profilesApiCall('DELETE', `${API_ENDPOINTS.RESEARCHER_PROFILES}/${userId}`)
};

// Subscription API helper functions
export const SubscriptionsAPI = {
  // List all subscriptions with optional filters
  list: (searchParams = {}) => {
    const queryString = new URLSearchParams(searchParams).toString();
    const url = queryString ? `${API_ENDPOINTS.SUBSCRIPTIONS}?${queryString}` : API_ENDPOINTS.SUBSCRIPTIONS;
    return profilesApiCall('GET', url);
  },
  
  // Get subscriptions for specific user
  getByUser: (userId, searchParams = {}) => {
    const queryString = new URLSearchParams(searchParams).toString();
    const url = queryString ? `${API_ENDPOINTS.SUBSCRIPTIONS}/${userId}?${queryString}` : `${API_ENDPOINTS.SUBSCRIPTIONS}/${userId}`;
    return profilesApiCall('GET', url);
  },
  
  // Get download URL for subscription file
  getDownloadUrl: (fileId) => profilesApiCall('GET', `${API_ENDPOINTS.SUBSCRIPTIONS}/download/${fileId}`)
};