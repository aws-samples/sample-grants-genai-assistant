/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createAgentConfig = /* GraphQL */ `mutation CreateAgentConfig(
  $condition: ModelAgentConfigConditionInput
  $input: CreateAgentConfigInput!
) {
  createAgentConfig(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateAgentConfigMutationVariables,
  APITypes.CreateAgentConfigMutation
>;
export const createAgentDiscoveryResult = /* GraphQL */ `mutation CreateAgentDiscoveryResult(
  $condition: ModelAgentDiscoveryResultConditionInput
  $input: CreateAgentDiscoveryResultInput!
) {
  createAgentDiscoveryResult(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateAgentDiscoveryResultMutationVariables,
  APITypes.CreateAgentDiscoveryResultMutation
>;
export const createDocumentMetadata = /* GraphQL */ `mutation CreateDocumentMetadata(
  $condition: ModelDocumentMetadataConditionInput
  $input: CreateDocumentMetadataInput!
) {
  createDocumentMetadata(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateDocumentMetadataMutationVariables,
  APITypes.CreateDocumentMetadataMutation
>;
export const createEuGrantRecord = /* GraphQL */ `mutation CreateEuGrantRecord(
  $condition: ModelEuGrantRecordConditionInput
  $input: CreateEuGrantRecordInput!
) {
  createEuGrantRecord(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateEuGrantRecordMutationVariables,
  APITypes.CreateEuGrantRecordMutation
>;
export const createGrantRecord = /* GraphQL */ `mutation CreateGrantRecord(
  $condition: ModelGrantRecordConditionInput
  $input: CreateGrantRecordInput!
) {
  createGrantRecord(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateGrantRecordMutationVariables,
  APITypes.CreateGrantRecordMutation
>;
export const createProposal = /* GraphQL */ `mutation CreateProposal(
  $condition: ModelProposalConditionInput
  $input: CreateProposalInput!
) {
  createProposal(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateProposalMutationVariables,
  APITypes.CreateProposalMutation
>;
export const createSearchEvent = /* GraphQL */ `mutation CreateSearchEvent(
  $condition: ModelSearchEventConditionInput
  $input: CreateSearchEventInput!
) {
  createSearchEvent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateSearchEventMutationVariables,
  APITypes.CreateSearchEventMutation
>;
export const createUserProfile = /* GraphQL */ `mutation CreateUserProfile(
  $condition: ModelUserProfileConditionInput
  $input: CreateUserProfileInput!
) {
  createUserProfile(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.CreateUserProfileMutationVariables,
  APITypes.CreateUserProfileMutation
>;
export const deleteAgentConfig = /* GraphQL */ `mutation DeleteAgentConfig(
  $condition: ModelAgentConfigConditionInput
  $input: DeleteAgentConfigInput!
) {
  deleteAgentConfig(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteAgentConfigMutationVariables,
  APITypes.DeleteAgentConfigMutation
>;
export const deleteAgentDiscoveryResult = /* GraphQL */ `mutation DeleteAgentDiscoveryResult(
  $condition: ModelAgentDiscoveryResultConditionInput
  $input: DeleteAgentDiscoveryResultInput!
) {
  deleteAgentDiscoveryResult(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteAgentDiscoveryResultMutationVariables,
  APITypes.DeleteAgentDiscoveryResultMutation
>;
export const deleteDocument = /* GraphQL */ `mutation DeleteDocument($documentId: String!) {
  deleteDocument(documentId: $documentId)
}
` as GeneratedMutation<
  APITypes.DeleteDocumentMutationVariables,
  APITypes.DeleteDocumentMutation
>;
export const deleteDocumentMetadata = /* GraphQL */ `mutation DeleteDocumentMetadata(
  $condition: ModelDocumentMetadataConditionInput
  $input: DeleteDocumentMetadataInput!
) {
  deleteDocumentMetadata(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteDocumentMetadataMutationVariables,
  APITypes.DeleteDocumentMetadataMutation
>;
export const deleteEuGrantRecord = /* GraphQL */ `mutation DeleteEuGrantRecord(
  $condition: ModelEuGrantRecordConditionInput
  $input: DeleteEuGrantRecordInput!
) {
  deleteEuGrantRecord(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteEuGrantRecordMutationVariables,
  APITypes.DeleteEuGrantRecordMutation
>;
export const deleteGrantRecord = /* GraphQL */ `mutation DeleteGrantRecord(
  $condition: ModelGrantRecordConditionInput
  $input: DeleteGrantRecordInput!
) {
  deleteGrantRecord(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteGrantRecordMutationVariables,
  APITypes.DeleteGrantRecordMutation
>;
export const deleteProposal = /* GraphQL */ `mutation DeleteProposal(
  $condition: ModelProposalConditionInput
  $input: DeleteProposalInput!
) {
  deleteProposal(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteProposalMutationVariables,
  APITypes.DeleteProposalMutation
>;
export const deleteSearchEvent = /* GraphQL */ `mutation DeleteSearchEvent(
  $condition: ModelSearchEventConditionInput
  $input: DeleteSearchEventInput!
) {
  deleteSearchEvent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteSearchEventMutationVariables,
  APITypes.DeleteSearchEventMutation
>;
export const deleteUserProfile = /* GraphQL */ `mutation DeleteUserProfile(
  $condition: ModelUserProfileConditionInput
  $input: DeleteUserProfileInput!
) {
  deleteUserProfile(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.DeleteUserProfileMutationVariables,
  APITypes.DeleteUserProfileMutation
>;
export const processAgentDiscoveryUpdate = /* GraphQL */ `mutation ProcessAgentDiscoveryUpdate($input: AWSJSON!) {
  processAgentDiscoveryUpdate(input: $input)
}
` as GeneratedMutation<
  APITypes.ProcessAgentDiscoveryUpdateMutationVariables,
  APITypes.ProcessAgentDiscoveryUpdateMutation
>;
export const sendChatMessage = /* GraphQL */ `mutation SendChatMessage($message: String!, $sessionId: String) {
  sendChatMessage(message: $message, sessionId: $sessionId) {
    content
    isComplete
    messageId
    sessionId
    toolCalls {
      parameters
      result
      toolName
      __typename
    }
    __typename
  }
}
` as GeneratedMutation<
  APITypes.SendChatMessageMutationVariables,
  APITypes.SendChatMessageMutation
>;
export const startEuGrantSearch = /* GraphQL */ `mutation StartEuGrantSearch($input: AWSJSON!) {
  startEuGrantSearch(input: $input)
}
` as GeneratedMutation<
  APITypes.StartEuGrantSearchMutationVariables,
  APITypes.StartEuGrantSearchMutation
>;
export const startGrantSearch = /* GraphQL */ `mutation StartGrantSearch($input: AWSJSON!) {
  startGrantSearch(input: $input)
}
` as GeneratedMutation<
  APITypes.StartGrantSearchMutationVariables,
  APITypes.StartGrantSearchMutation
>;
export const triggerAgentDiscovery = /* GraphQL */ `mutation TriggerAgentDiscovery($configId: String!) {
  triggerAgentDiscovery(configId: $configId)
}
` as GeneratedMutation<
  APITypes.TriggerAgentDiscoveryMutationVariables,
  APITypes.TriggerAgentDiscoveryMutation
>;
export const updateAgentConfig = /* GraphQL */ `mutation UpdateAgentConfig(
  $condition: ModelAgentConfigConditionInput
  $input: UpdateAgentConfigInput!
) {
  updateAgentConfig(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateAgentConfigMutationVariables,
  APITypes.UpdateAgentConfigMutation
>;
export const updateAgentDiscoveryResult = /* GraphQL */ `mutation UpdateAgentDiscoveryResult(
  $condition: ModelAgentDiscoveryResultConditionInput
  $input: UpdateAgentDiscoveryResultInput!
) {
  updateAgentDiscoveryResult(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateAgentDiscoveryResultMutationVariables,
  APITypes.UpdateAgentDiscoveryResultMutation
>;
export const updateDocumentMetadata = /* GraphQL */ `mutation UpdateDocumentMetadata(
  $condition: ModelDocumentMetadataConditionInput
  $input: UpdateDocumentMetadataInput!
) {
  updateDocumentMetadata(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateDocumentMetadataMutationVariables,
  APITypes.UpdateDocumentMetadataMutation
>;
export const updateEuGrantRecord = /* GraphQL */ `mutation UpdateEuGrantRecord(
  $condition: ModelEuGrantRecordConditionInput
  $input: UpdateEuGrantRecordInput!
) {
  updateEuGrantRecord(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateEuGrantRecordMutationVariables,
  APITypes.UpdateEuGrantRecordMutation
>;
export const updateGrantRecord = /* GraphQL */ `mutation UpdateGrantRecord(
  $condition: ModelGrantRecordConditionInput
  $input: UpdateGrantRecordInput!
) {
  updateGrantRecord(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateGrantRecordMutationVariables,
  APITypes.UpdateGrantRecordMutation
>;
export const updateProposal = /* GraphQL */ `mutation UpdateProposal(
  $condition: ModelProposalConditionInput
  $input: UpdateProposalInput!
) {
  updateProposal(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateProposalMutationVariables,
  APITypes.UpdateProposalMutation
>;
export const updateSearchEvent = /* GraphQL */ `mutation UpdateSearchEvent(
  $condition: ModelSearchEventConditionInput
  $input: UpdateSearchEventInput!
) {
  updateSearchEvent(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateSearchEventMutationVariables,
  APITypes.UpdateSearchEventMutation
>;
export const updateUserProfile = /* GraphQL */ `mutation UpdateUserProfile(
  $condition: ModelUserProfileConditionInput
  $input: UpdateUserProfileInput!
) {
  updateUserProfile(condition: $condition, input: $input) {
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
` as GeneratedMutation<
  APITypes.UpdateUserProfileMutationVariables,
  APITypes.UpdateUserProfileMutation
>;
export const uploadDocument = /* GraphQL */ `mutation UploadDocument($input: UploadDocumentInputInput!) {
  uploadDocument(input: $input) {
    documentId
    expiresIn
    s3Bucket
    s3Key
    status
    uploadUrl
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UploadDocumentMutationVariables,
  APITypes.UploadDocumentMutation
>;
