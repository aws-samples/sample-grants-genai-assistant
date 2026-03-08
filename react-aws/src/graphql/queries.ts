/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getAgentConfig = /* GraphQL */ `query GetAgentConfig($id: ID!) {
  getAgentConfig(id: $id) {
    autoOn
    createdAt
    grantsSurfaced
    id
    isActive
    lastRun
    nextRun
    profileSelected
    storageDuration
    timeInterval
    updatedAt
    userId
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetAgentConfigQueryVariables,
  APITypes.GetAgentConfigQuery
>;
export const getAgentDiscoveryResult = /* GraphQL */ `query GetAgentDiscoveryResult($id: ID!) {
  getAgentDiscoveryResult(id: $id) {
    configId
    createdAt
    errorMessage
    executionId
    executionTime
    grantsFound
    grantsStored
    id
    metadata
    profileId
    s3Bucket
    s3Key
    searchQuery
    sessionId
    status
    topGrants
    totalGrantsFound
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetAgentDiscoveryResultQueryVariables,
  APITypes.GetAgentDiscoveryResultQuery
>;
export const getChatSession = /* GraphQL */ `query GetChatSession($sessionId: String!) {
  getChatSession(sessionId: $sessionId) {
    context
    createdAt
    messages {
      content
      messageId
      role
      timestamp
      __typename
    }
    sessionId
    summary
    updatedAt
    userEmail
    userId
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetChatSessionQueryVariables,
  APITypes.GetChatSessionQuery
>;
export const getDiscoveryResultContent = /* GraphQL */ `query GetDiscoveryResultContent($key: String!) {
  getDiscoveryResultContent(key: $key)
}
` as GeneratedQuery<
  APITypes.GetDiscoveryResultContentQueryVariables,
  APITypes.GetDiscoveryResultContentQuery
>;
export const getDiscoveryResultDownloadUrl = /* GraphQL */ `query GetDiscoveryResultDownloadUrl($key: String!) {
  getDiscoveryResultDownloadUrl(key: $key)
}
` as GeneratedQuery<
  APITypes.GetDiscoveryResultDownloadUrlQueryVariables,
  APITypes.GetDiscoveryResultDownloadUrlQuery
>;
export const getDocument = /* GraphQL */ `query GetDocument($documentId: String!) {
  getDocument(documentId: $documentId)
}
` as GeneratedQuery<
  APITypes.GetDocumentQueryVariables,
  APITypes.GetDocumentQuery
>;
export const getDocumentMetadata = /* GraphQL */ `query GetDocumentMetadata($documentId: String!, $userId: String!) {
  getDocumentMetadata(documentId: $documentId, userId: $userId) {
    category
    contentType
    createdAt
    documentId
    errorMessage
    fileSize
    filename
    metadata
    owner
    processedAt
    s3Bucket
    s3Key
    status
    ttl
    updatedAt
    uploadDate
    userId
    vectorIndexed
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetDocumentMetadataQueryVariables,
  APITypes.GetDocumentMetadataQuery
>;
export const getEuGrantDetails = /* GraphQL */ `query GetEuGrantDetails($grantId: String!) {
  getEuGrantDetails(grantId: $grantId)
}
` as GeneratedQuery<
  APITypes.GetEuGrantDetailsQueryVariables,
  APITypes.GetEuGrantDetailsQuery
>;
export const getEuGrantRecord = /* GraphQL */ `query GetEuGrantRecord($id: ID!) {
  getEuGrantRecord(id: $id) {
    agency
    amount
    applicationProcess
    awardCeiling
    awardFloor
    createdAt
    deadline
    description
    eligibility
    euAllDeadlines
    euBudgetOverview
    euCallDetails
    euCallIdentifier
    euCallTitle
    euConditions
    euCrossCuttingPriorities
    euDeadlineModel
    euFrameworkProgramme
    euIdentifier
    euKeywords
    euLanguage
    euLatestUpdates
    euPortalUrl
    euProgrammePeriod
    euReference
    euStatus
    euSupportInfo
    euTypesOfAction
    euUrl
    grantId
    hasDetailedInfo
    id
    keywordScore
    matchedKeywords
    profileMatchScore
    relevanceScore
    sessionId
    source
    tags
    title
    ttl
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetEuGrantRecordQueryVariables,
  APITypes.GetEuGrantRecordQuery
>;
export const getGrantDetails = /* GraphQL */ `query GetGrantDetails($grantId: String!, $source: String) {
  getGrantDetails(grantId: $grantId, source: $source)
}
` as GeneratedQuery<
  APITypes.GetGrantDetailsQueryVariables,
  APITypes.GetGrantDetailsQuery
>;
export const getGrantRecord = /* GraphQL */ `query GetGrantRecord($id: ID!) {
  getGrantRecord(id: $id) {
    agency
    amount
    applicationProcess
    createdAt
    deadline
    description
    eligibility
    grantId
    id
    keywordScore
    matchedKeywords
    profileMatchScore
    relevanceScore
    sessionId
    source
    tags
    title
    ttl
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetGrantRecordQueryVariables,
  APITypes.GetGrantRecordQuery
>;
export const getProposal = /* GraphQL */ `query GetProposal($id: ID!) {
  getProposal(id: $id) {
    content
    createdAt
    grantId
    id
    metadata
    owner
    sections
    status
    title
    updatedAt
    userId
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetProposalQueryVariables,
  APITypes.GetProposalQuery
>;
export const getSearchEvent = /* GraphQL */ `query GetSearchEvent($id: ID!) {
  getSearchEvent(id: $id) {
    createdAt
    data
    eventType
    id
    sessionId
    timestamp
    ttl
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetSearchEventQueryVariables,
  APITypes.GetSearchEventQuery
>;
export const getUserProfile = /* GraphQL */ `query GetUserProfile($id: ID!) {
  getUserProfile(id: $id) {
    agencies
    budget_range
    collaboration_pref
    country
    createdAt
    created_date
    default_profile
    department
    duration_preference
    early_investigator
    email
    expertise
    expertise_level
    firstName
    fundingHistory
    geographic_scope
    grants_api
    grantsgov_filters
    id
    institution
    interdisciplinary
    isActive
    keyword_string
    keywords
    lastName
    last_updated
    methodologies
    name
    optimized_keywords
    orcid_id
    organization
    position
    preferences
    preferred_languages
    preferred_programs
    researchInterests
    research_areas
    researcherType
    submission_deadline
    tech_skills
    updatedAt
    use_structured_filters
    userId
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetUserProfileQueryVariables,
  APITypes.GetUserProfileQuery
>;
export const listAgentConfigs = /* GraphQL */ `query ListAgentConfigs(
  $filter: ModelAgentConfigFilterInput
  $limit: Int
  $nextToken: String
) {
  listAgentConfigs(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      autoOn
      createdAt
      grantsSurfaced
      id
      isActive
      lastRun
      nextRun
      profileSelected
      storageDuration
      timeInterval
      updatedAt
      userId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListAgentConfigsQueryVariables,
  APITypes.ListAgentConfigsQuery
>;
export const listAgentDiscoveryResults = /* GraphQL */ `query ListAgentDiscoveryResults(
  $filter: ModelAgentDiscoveryResultFilterInput
  $limit: Int
  $nextToken: String
) {
  listAgentDiscoveryResults(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      configId
      createdAt
      errorMessage
      executionId
      executionTime
      grantsFound
      grantsStored
      id
      metadata
      profileId
      s3Bucket
      s3Key
      searchQuery
      sessionId
      status
      topGrants
      totalGrantsFound
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListAgentDiscoveryResultsQueryVariables,
  APITypes.ListAgentDiscoveryResultsQuery
>;
export const listDiscoveryResults = /* GraphQL */ `query ListDiscoveryResults {
  listDiscoveryResults
}
` as GeneratedQuery<
  APITypes.ListDiscoveryResultsQueryVariables,
  APITypes.ListDiscoveryResultsQuery
>;
export const listDocumentMetadata = /* GraphQL */ `query ListDocumentMetadata(
  $documentId: ModelStringKeyConditionInput
  $filter: ModelDocumentMetadataFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
  $userId: String
) {
  listDocumentMetadata(
    documentId: $documentId
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
    userId: $userId
  ) {
    items {
      category
      contentType
      createdAt
      documentId
      errorMessage
      fileSize
      filename
      metadata
      owner
      processedAt
      s3Bucket
      s3Key
      status
      ttl
      updatedAt
      uploadDate
      userId
      vectorIndexed
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDocumentMetadataQueryVariables,
  APITypes.ListDocumentMetadataQuery
>;
export const listDocuments = /* GraphQL */ `query ListDocuments($filters: SearchFiltersInput, $limit: Int, $offset: Int) {
  listDocuments(filters: $filters, limit: $limit, offset: $offset)
}
` as GeneratedQuery<
  APITypes.ListDocumentsQueryVariables,
  APITypes.ListDocumentsQuery
>;
export const listDocumentsByDate = /* GraphQL */ `query ListDocumentsByDate(
  $filter: ModelDocumentMetadataFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
  $uploadDate: ModelStringKeyConditionInput
  $userId: String!
) {
  listDocumentsByDate(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
    uploadDate: $uploadDate
    userId: $userId
  ) {
    items {
      category
      contentType
      createdAt
      documentId
      errorMessage
      fileSize
      filename
      metadata
      owner
      processedAt
      s3Bucket
      s3Key
      status
      ttl
      updatedAt
      uploadDate
      userId
      vectorIndexed
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDocumentsByDateQueryVariables,
  APITypes.ListDocumentsByDateQuery
>;
export const listDocumentsByStatus = /* GraphQL */ `query ListDocumentsByStatus(
  $filter: ModelDocumentMetadataFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
  $status: ModelStringKeyConditionInput
  $userId: String!
) {
  listDocumentsByStatus(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
    status: $status
    userId: $userId
  ) {
    items {
      category
      contentType
      createdAt
      documentId
      errorMessage
      fileSize
      filename
      metadata
      owner
      processedAt
      s3Bucket
      s3Key
      status
      ttl
      updatedAt
      uploadDate
      userId
      vectorIndexed
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDocumentsByStatusQueryVariables,
  APITypes.ListDocumentsByStatusQuery
>;
export const listEuGrantRecords = /* GraphQL */ `query ListEuGrantRecords(
  $filter: ModelEuGrantRecordFilterInput
  $limit: Int
  $nextToken: String
) {
  listEuGrantRecords(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      agency
      amount
      applicationProcess
      awardCeiling
      awardFloor
      createdAt
      deadline
      description
      eligibility
      euAllDeadlines
      euBudgetOverview
      euCallDetails
      euCallIdentifier
      euCallTitle
      euConditions
      euCrossCuttingPriorities
      euDeadlineModel
      euFrameworkProgramme
      euIdentifier
      euKeywords
      euLanguage
      euLatestUpdates
      euPortalUrl
      euProgrammePeriod
      euReference
      euStatus
      euSupportInfo
      euTypesOfAction
      euUrl
      grantId
      hasDetailedInfo
      id
      keywordScore
      matchedKeywords
      profileMatchScore
      relevanceScore
      sessionId
      source
      tags
      title
      ttl
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListEuGrantRecordsQueryVariables,
  APITypes.ListEuGrantRecordsQuery
>;
export const listGrantRecords = /* GraphQL */ `query ListGrantRecords(
  $filter: ModelGrantRecordFilterInput
  $limit: Int
  $nextToken: String
) {
  listGrantRecords(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      agency
      amount
      applicationProcess
      createdAt
      deadline
      description
      eligibility
      grantId
      id
      keywordScore
      matchedKeywords
      profileMatchScore
      relevanceScore
      sessionId
      source
      tags
      title
      ttl
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListGrantRecordsQueryVariables,
  APITypes.ListGrantRecordsQuery
>;
export const listProposals = /* GraphQL */ `query ListProposals(
  $filter: ModelProposalFilterInput
  $limit: Int
  $nextToken: String
) {
  listProposals(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      content
      createdAt
      grantId
      id
      metadata
      owner
      sections
      status
      title
      updatedAt
      userId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListProposalsQueryVariables,
  APITypes.ListProposalsQuery
>;
export const listSearchEvents = /* GraphQL */ `query ListSearchEvents(
  $filter: ModelSearchEventFilterInput
  $limit: Int
  $nextToken: String
) {
  listSearchEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      data
      eventType
      id
      sessionId
      timestamp
      ttl
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListSearchEventsQueryVariables,
  APITypes.ListSearchEventsQuery
>;
export const listUserChatSessions = /* GraphQL */ `query ListUserChatSessions($limit: Int, $nextToken: String) {
  listUserChatSessions(limit: $limit, nextToken: $nextToken) {
    createdAt
    sessionId
    summary
    updatedAt
    userEmail
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserChatSessionsQueryVariables,
  APITypes.ListUserChatSessionsQuery
>;
export const listUserProfiles = /* GraphQL */ `query ListUserProfiles(
  $filter: ModelUserProfileFilterInput
  $limit: Int
  $nextToken: String
) {
  listUserProfiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      agencies
      budget_range
      collaboration_pref
      country
      createdAt
      created_date
      default_profile
      department
      duration_preference
      early_investigator
      email
      expertise
      expertise_level
      firstName
      fundingHistory
      geographic_scope
      grants_api
      grantsgov_filters
      id
      institution
      interdisciplinary
      isActive
      keyword_string
      keywords
      lastName
      last_updated
      methodologies
      name
      optimized_keywords
      orcid_id
      organization
      position
      preferences
      preferred_languages
      preferred_programs
      researchInterests
      research_areas
      researcherType
      submission_deadline
      tech_skills
      updatedAt
      use_structured_filters
      userId
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListUserProfilesQueryVariables,
  APITypes.ListUserProfilesQuery
>;
export const searchDocuments = /* GraphQL */ `query SearchDocuments(
  $filters: SearchFiltersInput
  $limit: Int
  $offset: Int
  $query: String!
) {
  searchDocuments(
    filters: $filters
    limit: $limit
    offset: $offset
    query: $query
  ) {
    results {
      documentId
      excerpt
      filename
      metadata
      relevanceScore
      __typename
    }
    total
    __typename
  }
}
` as GeneratedQuery<
  APITypes.SearchDocumentsQueryVariables,
  APITypes.SearchDocumentsQuery
>;
