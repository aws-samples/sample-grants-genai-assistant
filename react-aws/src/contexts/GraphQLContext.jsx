/**
 * GraphQL Context Provider
 * 
 * This replaces the EventsApiContext with Apollo Client for GraphQL operations.
 * Provides a unified interface for GraphQL queries, mutations, and subscriptions.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

const GraphQLContext = createContext();

export const useGraphQL = () => {
  const context = useContext(GraphQLContext);
  if (!context) {
    throw new Error('useGraphQL must be used within a GraphQLProvider');
  }
  return context;
};

// Inner provider that uses Amplify client
const GraphQLContextProvider = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('default-user'); // TODO: Get from auth
  const [amplifyClient, setAmplifyClient] = useState(null);

  // Initialize Amplify client
  useEffect(() => {
    const initializeClient = async () => {
      try {
        const { generateClient } = await import('aws-amplify/data');
        const client = generateClient();
        setAmplifyClient(client);
        setConnectionStatus('connected');
      } catch (error) {
        console.error('❌ Failed to initialize Amplify client:', error);
        setError('Failed to initialize GraphQL client');
        setConnectionStatus('disconnected');
      }
    };

    initializeClient();
  }, []);

  // Helper function to get user profile
  const getUserProfile = async (userId = currentUserId) => {
    if (!amplifyClient) throw new Error('GraphQL client not initialized');
    
    try {
      const result = await amplifyClient.graphql({
        query: `
          query GetUserProfile($userId: String!) {
            getUserProfile(userId: $userId) {
              userId
              email
              firstName
              lastName
              organization
              researchInterests
              expertise
              fundingHistory
              preferences
              createdAt
              updatedAt
            }
          }
        `,
        variables: { userId }
      });
      return result.data?.getUserProfile;
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      throw error;
    }
  };

  // Helper function to update user profile
  const updateUserProfile = async (profileData, userId = currentUserId) => {
    if (!amplifyClient) throw new Error('GraphQL client not initialized');
    
    try {
      const result = await amplifyClient.graphql({
        query: `
          mutation UpdateUserProfile($userId: String!, $input: AWSJSON!) {
            updateUserProfile(userId: $userId, input: $input) {
              userId
              email
              firstName
              lastName
              organization
              researchInterests
              expertise
              fundingHistory
              preferences
              updatedAt
            }
          }
        `,
        variables: {
          userId,
          input: profileData
        }
      });
      return result.data?.updateUserProfile;
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      throw error;
    }
  };

  const value = {
    // Connection status (compatible with Events API interface)
    connectionStatus,
    error,
    isConnected: connectionStatus === 'connected',
    
    // User management
    currentUserId,
    setCurrentUserId,
    getUserProfile,
    updateUserProfile,
    
    // Amplify client instance for direct access
    amplifyClient,
    
    // Helper methods
    clearError: () => setError(null),
  };

  return (
    <GraphQLContext.Provider value={value}>
      {children}
    </GraphQLContext.Provider>
  );
};

// Main provider that uses Amplify directly
export const GraphQLProvider = ({ children }) => {
  return (
    <GraphQLContextProvider>
      {children}
    </GraphQLContextProvider>
  );
};

// Hook for user profile management using Amplify
export const useUserProfile = (userId) => {
  const { currentUserId, amplifyClient } = useGraphQL();
  const targetUserId = userId || currentUserId;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Fetch profile
  const fetchProfile = async () => {
    if (!amplifyClient || !targetUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await amplifyClient.graphql({
        query: `
          query GetUserProfile($userId: String!) {
            getUserProfile(userId: $userId) {
              userId
              email
              firstName
              lastName
              organization
              researchInterests
              expertise
              fundingHistory
              preferences
              createdAt
              updatedAt
            }
          }
        `,
        variables: { userId: targetUserId }
      });
      setProfile(result.data?.getUserProfile);
    } catch (err) {
      setError(err);
      console.error('❌ Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    if (!amplifyClient) throw new Error('GraphQL client not initialized');
    
    setUpdating(true);
    try {
      const result = await amplifyClient.graphql({
        query: `
          mutation UpdateUserProfile($userId: String!, $input: AWSJSON!) {
            updateUserProfile(userId: $userId, input: $input) {
              userId
              email
              firstName
              lastName
              organization
              researchInterests
              expertise
              fundingHistory
              preferences
              updatedAt
            }
          }
        `,
        variables: {
          userId: targetUserId,
          input: profileData
        }
      });
      const updatedProfile = result.data?.updateUserProfile;
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  // Fetch profile on mount and when dependencies change
  useEffect(() => {
    fetchProfile();
  }, [amplifyClient, targetUserId]);

  return {
    profile,
    loading,
    error,
    updating,
    updateProfile,
    refetch: fetchProfile
  };
};