/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateAgentConfig = /* GraphQL */ `subscription OnCreateAgentConfig(
  $filter: ModelSubscriptionAgentConfigFilterInput
) {
  onCreateAgentConfig(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateAgentConfigSubscriptionVariables,
  APITypes.OnCreateAgentConfigSubscription
>;
export const onCreateAgentDiscoveryResult = /* GraphQL */ `subscription OnCreateAgentDiscoveryResult(
  $filter: ModelSubscriptionAgentDiscoveryResultFilterInput
) {
  onCreateAgentDiscoveryResult(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateAgentDiscoveryResultSubscriptionVariables,
  APITypes.OnCreateAgentDiscoveryResultSubscription
>;
export const onCreateDocumentMetadata = /* GraphQL */ `subscription OnCreateDocumentMetadata(
  $filter: ModelSubscriptionDocumentMetadataFilterInput
  $owner: String
) {
  onCreateDocumentMetadata(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateDocumentMetadataSubscriptionVariables,
  APITypes.OnCreateDocumentMetadataSubscription
>;
export const onCreateEuGrantRecord = /* GraphQL */ `subscription OnCreateEuGrantRecord(
  $filter: ModelSubscriptionEuGrantRecordFilterInput
) {
  onCreateEuGrantRecord(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateEuGrantRecordSubscriptionVariables,
  APITypes.OnCreateEuGrantRecordSubscription
>;
export const onCreateGrantRecord = /* GraphQL */ `subscription OnCreateGrantRecord(
  $filter: ModelSubscriptionGrantRecordFilterInput
) {
  onCreateGrantRecord(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateGrantRecordSubscriptionVariables,
  APITypes.OnCreateGrantRecordSubscription
>;
export const onCreateProposal = /* GraphQL */ `subscription OnCreateProposal(
  $filter: ModelSubscriptionProposalFilterInput
  $owner: String
) {
  onCreateProposal(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnCreateProposalSubscriptionVariables,
  APITypes.OnCreateProposalSubscription
>;
export const onCreateSearchEvent = /* GraphQL */ `subscription OnCreateSearchEvent(
  $filter: ModelSubscriptionSearchEventFilterInput
) {
  onCreateSearchEvent(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateSearchEventSubscriptionVariables,
  APITypes.OnCreateSearchEventSubscription
>;
export const onCreateUserProfile = /* GraphQL */ `subscription OnCreateUserProfile(
  $filter: ModelSubscriptionUserProfileFilterInput
) {
  onCreateUserProfile(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnCreateUserProfileSubscriptionVariables,
  APITypes.OnCreateUserProfileSubscription
>;
export const onDeleteAgentConfig = /* GraphQL */ `subscription OnDeleteAgentConfig(
  $filter: ModelSubscriptionAgentConfigFilterInput
) {
  onDeleteAgentConfig(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteAgentConfigSubscriptionVariables,
  APITypes.OnDeleteAgentConfigSubscription
>;
export const onDeleteAgentDiscoveryResult = /* GraphQL */ `subscription OnDeleteAgentDiscoveryResult(
  $filter: ModelSubscriptionAgentDiscoveryResultFilterInput
) {
  onDeleteAgentDiscoveryResult(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteAgentDiscoveryResultSubscriptionVariables,
  APITypes.OnDeleteAgentDiscoveryResultSubscription
>;
export const onDeleteDocumentMetadata = /* GraphQL */ `subscription OnDeleteDocumentMetadata(
  $filter: ModelSubscriptionDocumentMetadataFilterInput
  $owner: String
) {
  onDeleteDocumentMetadata(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteDocumentMetadataSubscriptionVariables,
  APITypes.OnDeleteDocumentMetadataSubscription
>;
export const onDeleteEuGrantRecord = /* GraphQL */ `subscription OnDeleteEuGrantRecord(
  $filter: ModelSubscriptionEuGrantRecordFilterInput
) {
  onDeleteEuGrantRecord(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteEuGrantRecordSubscriptionVariables,
  APITypes.OnDeleteEuGrantRecordSubscription
>;
export const onDeleteGrantRecord = /* GraphQL */ `subscription OnDeleteGrantRecord(
  $filter: ModelSubscriptionGrantRecordFilterInput
) {
  onDeleteGrantRecord(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteGrantRecordSubscriptionVariables,
  APITypes.OnDeleteGrantRecordSubscription
>;
export const onDeleteProposal = /* GraphQL */ `subscription OnDeleteProposal(
  $filter: ModelSubscriptionProposalFilterInput
  $owner: String
) {
  onDeleteProposal(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteProposalSubscriptionVariables,
  APITypes.OnDeleteProposalSubscription
>;
export const onDeleteSearchEvent = /* GraphQL */ `subscription OnDeleteSearchEvent(
  $filter: ModelSubscriptionSearchEventFilterInput
) {
  onDeleteSearchEvent(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteSearchEventSubscriptionVariables,
  APITypes.OnDeleteSearchEventSubscription
>;
export const onDeleteUserProfile = /* GraphQL */ `subscription OnDeleteUserProfile(
  $filter: ModelSubscriptionUserProfileFilterInput
) {
  onDeleteUserProfile(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnDeleteUserProfileSubscriptionVariables,
  APITypes.OnDeleteUserProfileSubscription
>;
export const onUpdateAgentConfig = /* GraphQL */ `subscription OnUpdateAgentConfig(
  $filter: ModelSubscriptionAgentConfigFilterInput
) {
  onUpdateAgentConfig(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateAgentConfigSubscriptionVariables,
  APITypes.OnUpdateAgentConfigSubscription
>;
export const onUpdateAgentDiscoveryResult = /* GraphQL */ `subscription OnUpdateAgentDiscoveryResult(
  $filter: ModelSubscriptionAgentDiscoveryResultFilterInput
) {
  onUpdateAgentDiscoveryResult(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateAgentDiscoveryResultSubscriptionVariables,
  APITypes.OnUpdateAgentDiscoveryResultSubscription
>;
export const onUpdateDocumentMetadata = /* GraphQL */ `subscription OnUpdateDocumentMetadata(
  $filter: ModelSubscriptionDocumentMetadataFilterInput
  $owner: String
) {
  onUpdateDocumentMetadata(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateDocumentMetadataSubscriptionVariables,
  APITypes.OnUpdateDocumentMetadataSubscription
>;
export const onUpdateEuGrantRecord = /* GraphQL */ `subscription OnUpdateEuGrantRecord(
  $filter: ModelSubscriptionEuGrantRecordFilterInput
) {
  onUpdateEuGrantRecord(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateEuGrantRecordSubscriptionVariables,
  APITypes.OnUpdateEuGrantRecordSubscription
>;
export const onUpdateGrantRecord = /* GraphQL */ `subscription OnUpdateGrantRecord(
  $filter: ModelSubscriptionGrantRecordFilterInput
) {
  onUpdateGrantRecord(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateGrantRecordSubscriptionVariables,
  APITypes.OnUpdateGrantRecordSubscription
>;
export const onUpdateProposal = /* GraphQL */ `subscription OnUpdateProposal(
  $filter: ModelSubscriptionProposalFilterInput
  $owner: String
) {
  onUpdateProposal(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateProposalSubscriptionVariables,
  APITypes.OnUpdateProposalSubscription
>;
export const onUpdateSearchEvent = /* GraphQL */ `subscription OnUpdateSearchEvent(
  $filter: ModelSubscriptionSearchEventFilterInput
) {
  onUpdateSearchEvent(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateSearchEventSubscriptionVariables,
  APITypes.OnUpdateSearchEventSubscription
>;
export const onUpdateUserProfile = /* GraphQL */ `subscription OnUpdateUserProfile(
  $filter: ModelSubscriptionUserProfileFilterInput
) {
  onUpdateUserProfile(filter: $filter) {
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
` as GeneratedSubscription<
  APITypes.OnUpdateUserProfileSubscriptionVariables,
  APITypes.OnUpdateUserProfileSubscription
>;
