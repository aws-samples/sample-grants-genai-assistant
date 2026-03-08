/**
 * GraphQL Operations for Grant Platform
 * 
 * DEPRECATED: These Apollo Client operations are no longer used.
 * We've migrated to Amplify client with inline queries.
 * Keeping for reference only.
 */

import { gql } from '@apollo/client';

// ============================================================================
// QUERIES (DEPRECATED - Use Amplify client with inline queries)
// ============================================================================

export const GET_USER_PROFILE = gql`
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
`;

export const GET_PROPOSAL = gql`
  query GetProposal($id: ID!) {
    getProposal(id: $id) {
      id
      grantId
      userId
      title
      status
      content
      sections
      metadata
      createdAt
      updatedAt
    }
  }
`;

export const LIST_PROPOSALS = gql`
  query ListProposals($userId: String!) {
    listProposals(userId: $userId) {
      id
      grantId
      userId
      title
      status
      createdAt
      updatedAt
    }
  }
`;

export const searchKBDocuments = `
  query SearchKBDocuments($query: String!, $filters: AWSJSON, $limit: Int) {
    searchKBDocuments(query: $query, filters: $filters, limit: $limit) {
      id
      title
      content
      agency
      documentType
      tokenCount
      characterCount
      createdAt
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const UPDATE_USER_PROFILE = gql`
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
`;

export const START_GRANT_SEARCH = gql`
  mutation StartGrantSearch($input: AWSJSON!) {
    startGrantSearch(input: $input)
  }
`;

export const CREATE_PROPOSAL = gql`
  mutation CreateProposal($input: AWSJSON!) {
    createProposal(input: $input)
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const GRANT_SEARCH_SUBSCRIPTION = gql`
  subscription OnCreateSearchEvent($sessionId: String!) {
    onCreateSearchEvent(filter: {sessionId: {eq: $sessionId}}) {
      id
      sessionId
      eventType
      data
      timestamp
    }
  }
`;

export const GRANT_RECORDS_SUBSCRIPTION = gql`
  subscription OnCreateGrantRecord($sessionId: String!) {
    onCreateGrantRecord(filter: {sessionId: {eq: $sessionId}}) {
      id
      sessionId
      grantId
      title
      agency
      amount
      deadline
      description
      eligibility
      applicationProcess
      source
      relevanceScore
      matchedKeywords
      tags
      createdAt
    }
  }
`;

export const PROPOSAL_SUBSCRIPTION = gql`
  subscription OnProposalEvent($sessionId: ID!) {
    onProposalEvent(sessionId: $sessionId) {
      ... on GenerationStartedEvent {
        eventType
        sessionId
        proposalId
        timestamp
        message
      }
      ... on SectionCompletedEvent {
        eventType
        sessionId
        proposalId
        section {
          id
          title
          content
          order
          status
        }
        timestamp
      }
      ... on GenerationCompletedEvent {
        eventType
        sessionId
        proposalId
        proposal {
          id
          title
          status
          content
          sections {
            id
            title
            content
            order
            status
          }
          completedAt
        }
        timestamp
      }
      ... on GenerationErrorEvent {
        eventType
        sessionId
        proposalId
        error
        timestamp
      }
    }
  }
`;

// ============================================================================
// FRAGMENTS
// ============================================================================

export const GRANT_FRAGMENT = gql`
  fragment GrantDetails on Grant {
    id
    title
    agency
    amount
    deadline
    description
    eligibility
    matchScore
    category
    fundingInstrument
    awardCeiling
    awardFloor
    synopsis
    contactName
    contactEmail
    opportunityId
    postingDate
    closeDate
    hasDetailedInfo
    source
  }
`;

export const USER_PROFILE_FRAGMENT = gql`
  fragment UserProfileDetails on UserProfile {
    id
    name
    email
    institution
    department
    position
    researchAreas
    keywords
    optimizedKeywords
    methodologies
    techSkills
    budgetRange
    durationPreference
    collaborationPref
    geographicScope
    expertiseLevel
    createdAt
    updatedAt
  }
`;

export const PROPOSAL_FRAGMENT = gql`
  fragment ProposalDetails on Proposal {
    id
    grantId
    userId
    title
    status
    content
    sections {
      id
      title
      content
      order
      status
    }
    createdAt
    updatedAt
    completedAt
  }
`;