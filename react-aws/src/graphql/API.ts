/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type AgentConfig = {
  __typename: "AgentConfig",
  autoOn?: boolean | null,
  createdAt?: string | null,
  grantsSurfaced?: number | null,
  id: string,
  isActive?: boolean | null,
  lastRun?: string | null,
  nextRun?: string | null,
  profileSelected: string,
  storageDuration?: number | null,
  timeInterval?: number | null,
  updatedAt?: string | null,
  userId: string,
};

export type AgentDiscoveryResult = {
  __typename: "AgentDiscoveryResult",
  configId: string,
  createdAt?: string | null,
  errorMessage?: string | null,
  executionId?: string | null,
  executionTime: string,
  grantsFound?: number | null,
  grantsStored?: number | null,
  id: string,
  metadata?: string | null,
  profileId: string,
  s3Bucket?: string | null,
  s3Key?: string | null,
  searchQuery?: string | null,
  sessionId: string,
  status: string,
  topGrants?: string | null,
  totalGrantsFound?: number | null,
  updatedAt?: string | null,
};

export type ChatSession = {
  __typename: "ChatSession",
  context?: string | null,
  createdAt: string,
  messages?:  Array<ChatMessage | null > | null,
  sessionId: string,
  summary?: string | null,
  updatedAt: string,
  userEmail: string,
  userId: string,
};

export type ChatMessage = {
  __typename: "ChatMessage",
  content: string,
  messageId: string,
  role: string,
  timestamp: string,
  toolCalls?:  Array<ChatToolCall | null > | null,
};

export type ChatToolCall = {
  __typename: "ChatToolCall",
  parameters?: string | null,
  result?: string | null,
  toolName: string,
};

export type DocumentMetadata = {
  __typename: "DocumentMetadata",
  category?: string | null,
  contentType?: string | null,
  createdAt: string,
  documentId: string,
  errorMessage?: string | null,
  fileSize?: number | null,
  filename: string,
  metadata?: string | null,
  owner?: string | null,
  processedAt?: string | null,
  s3Bucket?: string | null,
  s3Key: string,
  status?: DocumentMetadataStatus | null,
  ttl?: number | null,
  updatedAt: string,
  uploadDate?: string | null,
  userId: string,
  vectorIndexed?: boolean | null,
};

export enum DocumentMetadataStatus {
  failed = "failed",
  processing = "processing",
  ready = "ready",
  uploading = "uploading",
}


export type EuGrantRecord = {
  __typename: "EuGrantRecord",
  agency?: string | null,
  amount?: number | null,
  applicationProcess?: string | null,
  awardCeiling?: string | null,
  awardFloor?: number | null,
  createdAt?: string | null,
  deadline?: string | null,
  description?: string | null,
  eligibility?: string | null,
  euAllDeadlines?: string | null,
  euBudgetOverview?: string | null,
  euCallDetails?: string | null,
  euCallIdentifier?: string | null,
  euCallTitle?: string | null,
  euConditions?: string | null,
  euCrossCuttingPriorities?: Array< string | null > | null,
  euDeadlineModel?: string | null,
  euFrameworkProgramme?: string | null,
  euIdentifier?: string | null,
  euKeywords?: Array< string | null > | null,
  euLanguage?: string | null,
  euLatestUpdates?: string | null,
  euPortalUrl?: string | null,
  euProgrammePeriod?: string | null,
  euReference?: string | null,
  euStatus?: string | null,
  euSupportInfo?: string | null,
  euTypesOfAction?: Array< string | null > | null,
  euUrl?: string | null,
  grantId: string,
  hasDetailedInfo?: boolean | null,
  id: string,
  keywordScore?: number | null,
  matchedKeywords?: Array< string | null > | null,
  profileMatchScore?: number | null,
  relevanceScore?: number | null,
  sessionId: string,
  source?: string | null,
  tags?: Array< string | null > | null,
  title: string,
  ttl?: number | null,
  updatedAt: string,
};

export type GrantRecord = {
  __typename: "GrantRecord",
  agency?: string | null,
  amount?: number | null,
  applicationProcess?: string | null,
  createdAt?: string | null,
  deadline?: string | null,
  description?: string | null,
  eligibility?: string | null,
  grantId: string,
  id: string,
  keywordScore?: number | null,
  matchedKeywords?: Array< string | null > | null,
  profileMatchScore?: number | null,
  relevanceScore?: number | null,
  sessionId: string,
  source?: string | null,
  tags?: Array< string | null > | null,
  title: string,
  ttl?: number | null,
  updatedAt: string,
};

export type Proposal = {
  __typename: "Proposal",
  content?: string | null,
  createdAt: string,
  grantId: string,
  id: string,
  metadata?: string | null,
  owner?: string | null,
  sections?: string | null,
  status?: ProposalStatus | null,
  title: string,
  updatedAt: string,
  userId: string,
};

export enum ProposalStatus {
  COMPLETED = "COMPLETED",
  DRAFT = "DRAFT",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
}


export type SearchEvent = {
  __typename: "SearchEvent",
  createdAt: string,
  data?: string | null,
  eventType: string,
  id: string,
  sessionId: string,
  timestamp?: number | null,
  ttl?: number | null,
  updatedAt: string,
};

export type UserProfile = {
  __typename: "UserProfile",
  agencies?: Array< string | null > | null,
  budget_range?: string | null,
  collaboration_pref?: string | null,
  country?: string | null,
  createdAt: string,
  created_date?: string | null,
  default_profile?: boolean | null,
  department?: string | null,
  duration_preference?: string | null,
  early_investigator?: string | null,
  email: string,
  expertise?: Array< string | null > | null,
  expertise_level?: string | null,
  firstName?: string | null,
  fundingHistory?: Array< string | null > | null,
  geographic_scope?: string | null,
  grants_api?: string | null,
  grantsgov_filters?: string | null,
  id: string,
  institution?: string | null,
  interdisciplinary?: Array< string | null > | null,
  isActive?: boolean | null,
  keyword_string?: string | null,
  keywords?: Array< string | null > | null,
  lastName?: string | null,
  last_updated?: string | null,
  methodologies?: Array< string | null > | null,
  name?: string | null,
  optimized_keywords?: Array< string | null > | null,
  orcid_id?: string | null,
  organization?: string | null,
  position?: string | null,
  preferences?: string | null,
  preferred_languages?: Array< string | null > | null,
  preferred_programs?: Array< string | null > | null,
  researchInterests?: Array< string | null > | null,
  research_areas?: Array< string | null > | null,
  researcherType?: string | null,
  submission_deadline?: string | null,
  tech_skills?: Array< string | null > | null,
  updatedAt: string,
  use_structured_filters?: boolean | null,
  userId: string,
};

export type ModelAgentConfigFilterInput = {
  and?: Array< ModelAgentConfigFilterInput | null > | null,
  autoOn?: ModelBooleanInput | null,
  createdAt?: ModelStringInput | null,
  grantsSurfaced?: ModelIntInput | null,
  id?: ModelIDInput | null,
  isActive?: ModelBooleanInput | null,
  lastRun?: ModelStringInput | null,
  nextRun?: ModelStringInput | null,
  not?: ModelAgentConfigFilterInput | null,
  or?: Array< ModelAgentConfigFilterInput | null > | null,
  profileSelected?: ModelStringInput | null,
  storageDuration?: ModelIntInput | null,
  timeInterval?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
  userId?: ModelStringInput | null,
};

export type ModelBooleanInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  eq?: boolean | null,
  ne?: boolean | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIntInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelAgentConfigConnection = {
  __typename: "ModelAgentConfigConnection",
  items:  Array<AgentConfig | null >,
  nextToken?: string | null,
};

export type ModelAgentDiscoveryResultFilterInput = {
  and?: Array< ModelAgentDiscoveryResultFilterInput | null > | null,
  configId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  errorMessage?: ModelStringInput | null,
  executionId?: ModelStringInput | null,
  executionTime?: ModelStringInput | null,
  grantsFound?: ModelIntInput | null,
  grantsStored?: ModelIntInput | null,
  id?: ModelIDInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelAgentDiscoveryResultFilterInput | null,
  or?: Array< ModelAgentDiscoveryResultFilterInput | null > | null,
  profileId?: ModelStringInput | null,
  s3Bucket?: ModelStringInput | null,
  s3Key?: ModelStringInput | null,
  searchQuery?: ModelStringInput | null,
  sessionId?: ModelStringInput | null,
  status?: ModelStringInput | null,
  topGrants?: ModelStringInput | null,
  totalGrantsFound?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelAgentDiscoveryResultConnection = {
  __typename: "ModelAgentDiscoveryResultConnection",
  items:  Array<AgentDiscoveryResult | null >,
  nextToken?: string | null,
};

export type ModelStringKeyConditionInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
};

export type ModelDocumentMetadataFilterInput = {
  and?: Array< ModelDocumentMetadataFilterInput | null > | null,
  category?: ModelStringInput | null,
  contentType?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  documentId?: ModelStringInput | null,
  errorMessage?: ModelStringInput | null,
  fileSize?: ModelIntInput | null,
  filename?: ModelStringInput | null,
  id?: ModelIDInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelDocumentMetadataFilterInput | null,
  or?: Array< ModelDocumentMetadataFilterInput | null > | null,
  owner?: ModelStringInput | null,
  processedAt?: ModelStringInput | null,
  s3Bucket?: ModelStringInput | null,
  s3Key?: ModelStringInput | null,
  status?: ModelDocumentMetadataStatusInput | null,
  ttl?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
  uploadDate?: ModelStringInput | null,
  userId?: ModelStringInput | null,
  vectorIndexed?: ModelBooleanInput | null,
};

export type ModelDocumentMetadataStatusInput = {
  eq?: DocumentMetadataStatus | null,
  ne?: DocumentMetadataStatus | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelDocumentMetadataConnection = {
  __typename: "ModelDocumentMetadataConnection",
  items:  Array<DocumentMetadata | null >,
  nextToken?: string | null,
};

export type SearchFiltersInput = {
  category?: string | null,
  dateRange?: DateRangeInputInput | null,
};

export type DateRangeInputInput = {
  end?: string | null,
  start?: string | null,
};

export type ModelEuGrantRecordFilterInput = {
  agency?: ModelStringInput | null,
  amount?: ModelFloatInput | null,
  and?: Array< ModelEuGrantRecordFilterInput | null > | null,
  applicationProcess?: ModelStringInput | null,
  awardCeiling?: ModelStringInput | null,
  awardFloor?: ModelFloatInput | null,
  createdAt?: ModelStringInput | null,
  deadline?: ModelStringInput | null,
  description?: ModelStringInput | null,
  eligibility?: ModelStringInput | null,
  euAllDeadlines?: ModelStringInput | null,
  euBudgetOverview?: ModelStringInput | null,
  euCallDetails?: ModelStringInput | null,
  euCallIdentifier?: ModelStringInput | null,
  euCallTitle?: ModelStringInput | null,
  euConditions?: ModelStringInput | null,
  euCrossCuttingPriorities?: ModelStringInput | null,
  euDeadlineModel?: ModelStringInput | null,
  euFrameworkProgramme?: ModelStringInput | null,
  euIdentifier?: ModelStringInput | null,
  euKeywords?: ModelStringInput | null,
  euLanguage?: ModelStringInput | null,
  euLatestUpdates?: ModelStringInput | null,
  euPortalUrl?: ModelStringInput | null,
  euProgrammePeriod?: ModelStringInput | null,
  euReference?: ModelStringInput | null,
  euStatus?: ModelStringInput | null,
  euSupportInfo?: ModelStringInput | null,
  euTypesOfAction?: ModelStringInput | null,
  euUrl?: ModelStringInput | null,
  grantId?: ModelStringInput | null,
  hasDetailedInfo?: ModelBooleanInput | null,
  id?: ModelIDInput | null,
  keywordScore?: ModelFloatInput | null,
  matchedKeywords?: ModelStringInput | null,
  not?: ModelEuGrantRecordFilterInput | null,
  or?: Array< ModelEuGrantRecordFilterInput | null > | null,
  profileMatchScore?: ModelFloatInput | null,
  relevanceScore?: ModelFloatInput | null,
  sessionId?: ModelStringInput | null,
  source?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  title?: ModelStringInput | null,
  ttl?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelFloatInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelEuGrantRecordConnection = {
  __typename: "ModelEuGrantRecordConnection",
  items:  Array<EuGrantRecord | null >,
  nextToken?: string | null,
};

export type ModelGrantRecordFilterInput = {
  agency?: ModelStringInput | null,
  amount?: ModelFloatInput | null,
  and?: Array< ModelGrantRecordFilterInput | null > | null,
  applicationProcess?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  deadline?: ModelStringInput | null,
  description?: ModelStringInput | null,
  eligibility?: ModelStringInput | null,
  grantId?: ModelStringInput | null,
  id?: ModelIDInput | null,
  keywordScore?: ModelFloatInput | null,
  matchedKeywords?: ModelStringInput | null,
  not?: ModelGrantRecordFilterInput | null,
  or?: Array< ModelGrantRecordFilterInput | null > | null,
  profileMatchScore?: ModelFloatInput | null,
  relevanceScore?: ModelFloatInput | null,
  sessionId?: ModelStringInput | null,
  source?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  title?: ModelStringInput | null,
  ttl?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelGrantRecordConnection = {
  __typename: "ModelGrantRecordConnection",
  items:  Array<GrantRecord | null >,
  nextToken?: string | null,
};

export type ModelProposalFilterInput = {
  and?: Array< ModelProposalFilterInput | null > | null,
  content?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  grantId?: ModelStringInput | null,
  id?: ModelIDInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelProposalFilterInput | null,
  or?: Array< ModelProposalFilterInput | null > | null,
  owner?: ModelStringInput | null,
  sections?: ModelStringInput | null,
  status?: ModelProposalStatusInput | null,
  title?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  userId?: ModelStringInput | null,
};

export type ModelProposalStatusInput = {
  eq?: ProposalStatus | null,
  ne?: ProposalStatus | null,
};

export type ModelProposalConnection = {
  __typename: "ModelProposalConnection",
  items:  Array<Proposal | null >,
  nextToken?: string | null,
};

export type ModelSearchEventFilterInput = {
  and?: Array< ModelSearchEventFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  data?: ModelStringInput | null,
  eventType?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelSearchEventFilterInput | null,
  or?: Array< ModelSearchEventFilterInput | null > | null,
  sessionId?: ModelStringInput | null,
  timestamp?: ModelIntInput | null,
  ttl?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelSearchEventConnection = {
  __typename: "ModelSearchEventConnection",
  items:  Array<SearchEvent | null >,
  nextToken?: string | null,
};

export type ChatSessionSummary = {
  __typename: "ChatSessionSummary",
  createdAt: string,
  sessionId: string,
  summary?: string | null,
  updatedAt: string,
  userEmail: string,
};

export type ModelUserProfileFilterInput = {
  agencies?: ModelStringInput | null,
  and?: Array< ModelUserProfileFilterInput | null > | null,
  budget_range?: ModelStringInput | null,
  collaboration_pref?: ModelStringInput | null,
  country?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  created_date?: ModelStringInput | null,
  default_profile?: ModelBooleanInput | null,
  department?: ModelStringInput | null,
  duration_preference?: ModelStringInput | null,
  early_investigator?: ModelStringInput | null,
  email?: ModelStringInput | null,
  expertise?: ModelStringInput | null,
  expertise_level?: ModelStringInput | null,
  firstName?: ModelStringInput | null,
  fundingHistory?: ModelStringInput | null,
  geographic_scope?: ModelStringInput | null,
  grants_api?: ModelStringInput | null,
  grantsgov_filters?: ModelStringInput | null,
  id?: ModelIDInput | null,
  institution?: ModelStringInput | null,
  interdisciplinary?: ModelStringInput | null,
  isActive?: ModelBooleanInput | null,
  keyword_string?: ModelStringInput | null,
  keywords?: ModelStringInput | null,
  lastName?: ModelStringInput | null,
  last_updated?: ModelStringInput | null,
  methodologies?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelUserProfileFilterInput | null,
  optimized_keywords?: ModelStringInput | null,
  or?: Array< ModelUserProfileFilterInput | null > | null,
  orcid_id?: ModelStringInput | null,
  organization?: ModelStringInput | null,
  position?: ModelStringInput | null,
  preferences?: ModelStringInput | null,
  preferred_languages?: ModelStringInput | null,
  preferred_programs?: ModelStringInput | null,
  researchInterests?: ModelStringInput | null,
  research_areas?: ModelStringInput | null,
  researcherType?: ModelStringInput | null,
  submission_deadline?: ModelStringInput | null,
  tech_skills?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  use_structured_filters?: ModelBooleanInput | null,
  userId?: ModelStringInput | null,
};

export type ModelUserProfileConnection = {
  __typename: "ModelUserProfileConnection",
  items:  Array<UserProfile | null >,
  nextToken?: string | null,
};

export type SearchResponse = {
  __typename: "SearchResponse",
  results:  Array<SearchResult | null >,
  total: number,
};

export type SearchResult = {
  __typename: "SearchResult",
  documentId: string,
  excerpt: string,
  filename: string,
  metadata?: string | null,
  relevanceScore: number,
};

export type ModelAgentConfigConditionInput = {
  and?: Array< ModelAgentConfigConditionInput | null > | null,
  autoOn?: ModelBooleanInput | null,
  createdAt?: ModelStringInput | null,
  grantsSurfaced?: ModelIntInput | null,
  isActive?: ModelBooleanInput | null,
  lastRun?: ModelStringInput | null,
  nextRun?: ModelStringInput | null,
  not?: ModelAgentConfigConditionInput | null,
  or?: Array< ModelAgentConfigConditionInput | null > | null,
  profileSelected?: ModelStringInput | null,
  storageDuration?: ModelIntInput | null,
  timeInterval?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
  userId?: ModelStringInput | null,
};

export type CreateAgentConfigInput = {
  autoOn?: boolean | null,
  createdAt?: string | null,
  grantsSurfaced?: number | null,
  id?: string | null,
  isActive?: boolean | null,
  lastRun?: string | null,
  nextRun?: string | null,
  profileSelected: string,
  storageDuration?: number | null,
  timeInterval?: number | null,
  updatedAt?: string | null,
  userId: string,
};

export type ModelAgentDiscoveryResultConditionInput = {
  and?: Array< ModelAgentDiscoveryResultConditionInput | null > | null,
  configId?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  errorMessage?: ModelStringInput | null,
  executionId?: ModelStringInput | null,
  executionTime?: ModelStringInput | null,
  grantsFound?: ModelIntInput | null,
  grantsStored?: ModelIntInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelAgentDiscoveryResultConditionInput | null,
  or?: Array< ModelAgentDiscoveryResultConditionInput | null > | null,
  profileId?: ModelStringInput | null,
  s3Bucket?: ModelStringInput | null,
  s3Key?: ModelStringInput | null,
  searchQuery?: ModelStringInput | null,
  sessionId?: ModelStringInput | null,
  status?: ModelStringInput | null,
  topGrants?: ModelStringInput | null,
  totalGrantsFound?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateAgentDiscoveryResultInput = {
  configId: string,
  createdAt?: string | null,
  errorMessage?: string | null,
  executionId?: string | null,
  executionTime: string,
  grantsFound?: number | null,
  grantsStored?: number | null,
  id?: string | null,
  metadata?: string | null,
  profileId: string,
  s3Bucket?: string | null,
  s3Key?: string | null,
  searchQuery?: string | null,
  sessionId: string,
  status: string,
  topGrants?: string | null,
  totalGrantsFound?: number | null,
  updatedAt?: string | null,
};

export type ModelDocumentMetadataConditionInput = {
  and?: Array< ModelDocumentMetadataConditionInput | null > | null,
  category?: ModelStringInput | null,
  contentType?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  errorMessage?: ModelStringInput | null,
  fileSize?: ModelIntInput | null,
  filename?: ModelStringInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelDocumentMetadataConditionInput | null,
  or?: Array< ModelDocumentMetadataConditionInput | null > | null,
  owner?: ModelStringInput | null,
  processedAt?: ModelStringInput | null,
  s3Bucket?: ModelStringInput | null,
  s3Key?: ModelStringInput | null,
  status?: ModelDocumentMetadataStatusInput | null,
  ttl?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
  uploadDate?: ModelStringInput | null,
  vectorIndexed?: ModelBooleanInput | null,
};

export type CreateDocumentMetadataInput = {
  category?: string | null,
  contentType?: string | null,
  documentId: string,
  errorMessage?: string | null,
  fileSize?: number | null,
  filename: string,
  metadata?: string | null,
  processedAt?: string | null,
  s3Bucket?: string | null,
  s3Key: string,
  status?: DocumentMetadataStatus | null,
  ttl?: number | null,
  uploadDate?: string | null,
  userId: string,
  vectorIndexed?: boolean | null,
};

export type ModelEuGrantRecordConditionInput = {
  agency?: ModelStringInput | null,
  amount?: ModelFloatInput | null,
  and?: Array< ModelEuGrantRecordConditionInput | null > | null,
  applicationProcess?: ModelStringInput | null,
  awardCeiling?: ModelStringInput | null,
  awardFloor?: ModelFloatInput | null,
  createdAt?: ModelStringInput | null,
  deadline?: ModelStringInput | null,
  description?: ModelStringInput | null,
  eligibility?: ModelStringInput | null,
  euAllDeadlines?: ModelStringInput | null,
  euBudgetOverview?: ModelStringInput | null,
  euCallDetails?: ModelStringInput | null,
  euCallIdentifier?: ModelStringInput | null,
  euCallTitle?: ModelStringInput | null,
  euConditions?: ModelStringInput | null,
  euCrossCuttingPriorities?: ModelStringInput | null,
  euDeadlineModel?: ModelStringInput | null,
  euFrameworkProgramme?: ModelStringInput | null,
  euIdentifier?: ModelStringInput | null,
  euKeywords?: ModelStringInput | null,
  euLanguage?: ModelStringInput | null,
  euLatestUpdates?: ModelStringInput | null,
  euPortalUrl?: ModelStringInput | null,
  euProgrammePeriod?: ModelStringInput | null,
  euReference?: ModelStringInput | null,
  euStatus?: ModelStringInput | null,
  euSupportInfo?: ModelStringInput | null,
  euTypesOfAction?: ModelStringInput | null,
  euUrl?: ModelStringInput | null,
  grantId?: ModelStringInput | null,
  hasDetailedInfo?: ModelBooleanInput | null,
  keywordScore?: ModelFloatInput | null,
  matchedKeywords?: ModelStringInput | null,
  not?: ModelEuGrantRecordConditionInput | null,
  or?: Array< ModelEuGrantRecordConditionInput | null > | null,
  profileMatchScore?: ModelFloatInput | null,
  relevanceScore?: ModelFloatInput | null,
  sessionId?: ModelStringInput | null,
  source?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  title?: ModelStringInput | null,
  ttl?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateEuGrantRecordInput = {
  agency?: string | null,
  amount?: number | null,
  applicationProcess?: string | null,
  awardCeiling?: string | null,
  awardFloor?: number | null,
  createdAt?: string | null,
  deadline?: string | null,
  description?: string | null,
  eligibility?: string | null,
  euAllDeadlines?: string | null,
  euBudgetOverview?: string | null,
  euCallDetails?: string | null,
  euCallIdentifier?: string | null,
  euCallTitle?: string | null,
  euConditions?: string | null,
  euCrossCuttingPriorities?: Array< string | null > | null,
  euDeadlineModel?: string | null,
  euFrameworkProgramme?: string | null,
  euIdentifier?: string | null,
  euKeywords?: Array< string | null > | null,
  euLanguage?: string | null,
  euLatestUpdates?: string | null,
  euPortalUrl?: string | null,
  euProgrammePeriod?: string | null,
  euReference?: string | null,
  euStatus?: string | null,
  euSupportInfo?: string | null,
  euTypesOfAction?: Array< string | null > | null,
  euUrl?: string | null,
  grantId: string,
  hasDetailedInfo?: boolean | null,
  id?: string | null,
  keywordScore?: number | null,
  matchedKeywords?: Array< string | null > | null,
  profileMatchScore?: number | null,
  relevanceScore?: number | null,
  sessionId: string,
  source?: string | null,
  tags?: Array< string | null > | null,
  title: string,
  ttl?: number | null,
};

export type ModelGrantRecordConditionInput = {
  agency?: ModelStringInput | null,
  amount?: ModelFloatInput | null,
  and?: Array< ModelGrantRecordConditionInput | null > | null,
  applicationProcess?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  deadline?: ModelStringInput | null,
  description?: ModelStringInput | null,
  eligibility?: ModelStringInput | null,
  grantId?: ModelStringInput | null,
  keywordScore?: ModelFloatInput | null,
  matchedKeywords?: ModelStringInput | null,
  not?: ModelGrantRecordConditionInput | null,
  or?: Array< ModelGrantRecordConditionInput | null > | null,
  profileMatchScore?: ModelFloatInput | null,
  relevanceScore?: ModelFloatInput | null,
  sessionId?: ModelStringInput | null,
  source?: ModelStringInput | null,
  tags?: ModelStringInput | null,
  title?: ModelStringInput | null,
  ttl?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateGrantRecordInput = {
  agency?: string | null,
  amount?: number | null,
  applicationProcess?: string | null,
  createdAt?: string | null,
  deadline?: string | null,
  description?: string | null,
  eligibility?: string | null,
  grantId: string,
  id?: string | null,
  keywordScore?: number | null,
  matchedKeywords?: Array< string | null > | null,
  profileMatchScore?: number | null,
  relevanceScore?: number | null,
  sessionId: string,
  source?: string | null,
  tags?: Array< string | null > | null,
  title: string,
  ttl?: number | null,
};

export type ModelProposalConditionInput = {
  and?: Array< ModelProposalConditionInput | null > | null,
  content?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  grantId?: ModelStringInput | null,
  metadata?: ModelStringInput | null,
  not?: ModelProposalConditionInput | null,
  or?: Array< ModelProposalConditionInput | null > | null,
  owner?: ModelStringInput | null,
  sections?: ModelStringInput | null,
  status?: ModelProposalStatusInput | null,
  title?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  userId?: ModelStringInput | null,
};

export type CreateProposalInput = {
  content?: string | null,
  grantId: string,
  id?: string | null,
  metadata?: string | null,
  sections?: string | null,
  status?: ProposalStatus | null,
  title: string,
  userId: string,
};

export type ModelSearchEventConditionInput = {
  and?: Array< ModelSearchEventConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  data?: ModelStringInput | null,
  eventType?: ModelStringInput | null,
  not?: ModelSearchEventConditionInput | null,
  or?: Array< ModelSearchEventConditionInput | null > | null,
  sessionId?: ModelStringInput | null,
  timestamp?: ModelIntInput | null,
  ttl?: ModelIntInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateSearchEventInput = {
  data?: string | null,
  eventType: string,
  id?: string | null,
  sessionId: string,
  timestamp?: number | null,
  ttl?: number | null,
};

export type ModelUserProfileConditionInput = {
  agencies?: ModelStringInput | null,
  and?: Array< ModelUserProfileConditionInput | null > | null,
  budget_range?: ModelStringInput | null,
  collaboration_pref?: ModelStringInput | null,
  country?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  created_date?: ModelStringInput | null,
  default_profile?: ModelBooleanInput | null,
  department?: ModelStringInput | null,
  duration_preference?: ModelStringInput | null,
  early_investigator?: ModelStringInput | null,
  email?: ModelStringInput | null,
  expertise?: ModelStringInput | null,
  expertise_level?: ModelStringInput | null,
  firstName?: ModelStringInput | null,
  fundingHistory?: ModelStringInput | null,
  geographic_scope?: ModelStringInput | null,
  grants_api?: ModelStringInput | null,
  grantsgov_filters?: ModelStringInput | null,
  institution?: ModelStringInput | null,
  interdisciplinary?: ModelStringInput | null,
  isActive?: ModelBooleanInput | null,
  keyword_string?: ModelStringInput | null,
  keywords?: ModelStringInput | null,
  lastName?: ModelStringInput | null,
  last_updated?: ModelStringInput | null,
  methodologies?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelUserProfileConditionInput | null,
  optimized_keywords?: ModelStringInput | null,
  or?: Array< ModelUserProfileConditionInput | null > | null,
  orcid_id?: ModelStringInput | null,
  organization?: ModelStringInput | null,
  position?: ModelStringInput | null,
  preferences?: ModelStringInput | null,
  preferred_languages?: ModelStringInput | null,
  preferred_programs?: ModelStringInput | null,
  researchInterests?: ModelStringInput | null,
  research_areas?: ModelStringInput | null,
  researcherType?: ModelStringInput | null,
  submission_deadline?: ModelStringInput | null,
  tech_skills?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  use_structured_filters?: ModelBooleanInput | null,
  userId?: ModelStringInput | null,
};

export type CreateUserProfileInput = {
  agencies?: Array< string | null > | null,
  budget_range?: string | null,
  collaboration_pref?: string | null,
  country?: string | null,
  created_date?: string | null,
  default_profile?: boolean | null,
  department?: string | null,
  duration_preference?: string | null,
  early_investigator?: string | null,
  email: string,
  expertise?: Array< string | null > | null,
  expertise_level?: string | null,
  firstName?: string | null,
  fundingHistory?: Array< string | null > | null,
  geographic_scope?: string | null,
  grants_api?: string | null,
  grantsgov_filters?: string | null,
  id?: string | null,
  institution?: string | null,
  interdisciplinary?: Array< string | null > | null,
  isActive?: boolean | null,
  keyword_string?: string | null,
  keywords?: Array< string | null > | null,
  lastName?: string | null,
  last_updated?: string | null,
  methodologies?: Array< string | null > | null,
  name?: string | null,
  optimized_keywords?: Array< string | null > | null,
  orcid_id?: string | null,
  organization?: string | null,
  position?: string | null,
  preferences?: string | null,
  preferred_languages?: Array< string | null > | null,
  preferred_programs?: Array< string | null > | null,
  researchInterests?: Array< string | null > | null,
  research_areas?: Array< string | null > | null,
  researcherType?: string | null,
  submission_deadline?: string | null,
  tech_skills?: Array< string | null > | null,
  use_structured_filters?: boolean | null,
  userId: string,
};

export type DeleteAgentConfigInput = {
  id: string,
};

export type DeleteAgentDiscoveryResultInput = {
  id: string,
};

export type DeleteDocumentMetadataInput = {
  documentId: string,
  userId: string,
};

export type DeleteEuGrantRecordInput = {
  id: string,
};

export type DeleteGrantRecordInput = {
  id: string,
};

export type DeleteProposalInput = {
  id: string,
};

export type DeleteSearchEventInput = {
  id: string,
};

export type DeleteUserProfileInput = {
  id: string,
};

export type ChatMessageResponse = {
  __typename: "ChatMessageResponse",
  content: string,
  isComplete: boolean,
  messageId: string,
  sessionId: string,
  toolCalls?:  Array<ChatToolCall | null > | null,
};

export type UpdateAgentConfigInput = {
  autoOn?: boolean | null,
  createdAt?: string | null,
  grantsSurfaced?: number | null,
  id: string,
  isActive?: boolean | null,
  lastRun?: string | null,
  nextRun?: string | null,
  profileSelected?: string | null,
  storageDuration?: number | null,
  timeInterval?: number | null,
  updatedAt?: string | null,
  userId?: string | null,
};

export type UpdateAgentDiscoveryResultInput = {
  configId?: string | null,
  createdAt?: string | null,
  errorMessage?: string | null,
  executionId?: string | null,
  executionTime?: string | null,
  grantsFound?: number | null,
  grantsStored?: number | null,
  id: string,
  metadata?: string | null,
  profileId?: string | null,
  s3Bucket?: string | null,
  s3Key?: string | null,
  searchQuery?: string | null,
  sessionId?: string | null,
  status?: string | null,
  topGrants?: string | null,
  totalGrantsFound?: number | null,
  updatedAt?: string | null,
};

export type UpdateDocumentMetadataInput = {
  category?: string | null,
  contentType?: string | null,
  documentId: string,
  errorMessage?: string | null,
  fileSize?: number | null,
  filename?: string | null,
  metadata?: string | null,
  processedAt?: string | null,
  s3Bucket?: string | null,
  s3Key?: string | null,
  status?: DocumentMetadataStatus | null,
  ttl?: number | null,
  uploadDate?: string | null,
  userId: string,
  vectorIndexed?: boolean | null,
};

export type UpdateEuGrantRecordInput = {
  agency?: string | null,
  amount?: number | null,
  applicationProcess?: string | null,
  awardCeiling?: string | null,
  awardFloor?: number | null,
  createdAt?: string | null,
  deadline?: string | null,
  description?: string | null,
  eligibility?: string | null,
  euAllDeadlines?: string | null,
  euBudgetOverview?: string | null,
  euCallDetails?: string | null,
  euCallIdentifier?: string | null,
  euCallTitle?: string | null,
  euConditions?: string | null,
  euCrossCuttingPriorities?: Array< string | null > | null,
  euDeadlineModel?: string | null,
  euFrameworkProgramme?: string | null,
  euIdentifier?: string | null,
  euKeywords?: Array< string | null > | null,
  euLanguage?: string | null,
  euLatestUpdates?: string | null,
  euPortalUrl?: string | null,
  euProgrammePeriod?: string | null,
  euReference?: string | null,
  euStatus?: string | null,
  euSupportInfo?: string | null,
  euTypesOfAction?: Array< string | null > | null,
  euUrl?: string | null,
  grantId?: string | null,
  hasDetailedInfo?: boolean | null,
  id: string,
  keywordScore?: number | null,
  matchedKeywords?: Array< string | null > | null,
  profileMatchScore?: number | null,
  relevanceScore?: number | null,
  sessionId?: string | null,
  source?: string | null,
  tags?: Array< string | null > | null,
  title?: string | null,
  ttl?: number | null,
};

export type UpdateGrantRecordInput = {
  agency?: string | null,
  amount?: number | null,
  applicationProcess?: string | null,
  createdAt?: string | null,
  deadline?: string | null,
  description?: string | null,
  eligibility?: string | null,
  grantId?: string | null,
  id: string,
  keywordScore?: number | null,
  matchedKeywords?: Array< string | null > | null,
  profileMatchScore?: number | null,
  relevanceScore?: number | null,
  sessionId?: string | null,
  source?: string | null,
  tags?: Array< string | null > | null,
  title?: string | null,
  ttl?: number | null,
};

export type UpdateProposalInput = {
  content?: string | null,
  grantId?: string | null,
  id: string,
  metadata?: string | null,
  sections?: string | null,
  status?: ProposalStatus | null,
  title?: string | null,
  userId?: string | null,
};

export type UpdateSearchEventInput = {
  data?: string | null,
  eventType?: string | null,
  id: string,
  sessionId?: string | null,
  timestamp?: number | null,
  ttl?: number | null,
};

export type UpdateUserProfileInput = {
  agencies?: Array< string | null > | null,
  budget_range?: string | null,
  collaboration_pref?: string | null,
  country?: string | null,
  created_date?: string | null,
  default_profile?: boolean | null,
  department?: string | null,
  duration_preference?: string | null,
  early_investigator?: string | null,
  email?: string | null,
  expertise?: Array< string | null > | null,
  expertise_level?: string | null,
  firstName?: string | null,
  fundingHistory?: Array< string | null > | null,
  geographic_scope?: string | null,
  grants_api?: string | null,
  grantsgov_filters?: string | null,
  id: string,
  institution?: string | null,
  interdisciplinary?: Array< string | null > | null,
  isActive?: boolean | null,
  keyword_string?: string | null,
  keywords?: Array< string | null > | null,
  lastName?: string | null,
  last_updated?: string | null,
  methodologies?: Array< string | null > | null,
  name?: string | null,
  optimized_keywords?: Array< string | null > | null,
  orcid_id?: string | null,
  organization?: string | null,
  position?: string | null,
  preferences?: string | null,
  preferred_languages?: Array< string | null > | null,
  preferred_programs?: Array< string | null > | null,
  researchInterests?: Array< string | null > | null,
  research_areas?: Array< string | null > | null,
  researcherType?: string | null,
  submission_deadline?: string | null,
  tech_skills?: Array< string | null > | null,
  use_structured_filters?: boolean | null,
  userId?: string | null,
};

export type UploadDocumentInputInput = {
  category?: string | null,
  contentType: string,
  fileSize: number,
  filename: string,
};

export type UploadDocumentResponse = {
  __typename: "UploadDocumentResponse",
  documentId: string,
  expiresIn: number,
  s3Bucket: string,
  s3Key: string,
  status: string,
  uploadUrl: string,
};

export type ModelSubscriptionAgentConfigFilterInput = {
  and?: Array< ModelSubscriptionAgentConfigFilterInput | null > | null,
  autoOn?: ModelSubscriptionBooleanInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  grantsSurfaced?: ModelSubscriptionIntInput | null,
  id?: ModelSubscriptionIDInput | null,
  isActive?: ModelSubscriptionBooleanInput | null,
  lastRun?: ModelSubscriptionStringInput | null,
  nextRun?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionAgentConfigFilterInput | null > | null,
  profileSelected?: ModelSubscriptionStringInput | null,
  storageDuration?: ModelSubscriptionIntInput | null,
  timeInterval?: ModelSubscriptionIntInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  userId?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionBooleanInput = {
  eq?: boolean | null,
  ne?: boolean | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionIntInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  in?: Array< number | null > | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionAgentDiscoveryResultFilterInput = {
  and?: Array< ModelSubscriptionAgentDiscoveryResultFilterInput | null > | null,
  configId?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  errorMessage?: ModelSubscriptionStringInput | null,
  executionId?: ModelSubscriptionStringInput | null,
  executionTime?: ModelSubscriptionStringInput | null,
  grantsFound?: ModelSubscriptionIntInput | null,
  grantsStored?: ModelSubscriptionIntInput | null,
  id?: ModelSubscriptionIDInput | null,
  metadata?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionAgentDiscoveryResultFilterInput | null > | null,
  profileId?: ModelSubscriptionStringInput | null,
  s3Bucket?: ModelSubscriptionStringInput | null,
  s3Key?: ModelSubscriptionStringInput | null,
  searchQuery?: ModelSubscriptionStringInput | null,
  sessionId?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  topGrants?: ModelSubscriptionStringInput | null,
  totalGrantsFound?: ModelSubscriptionIntInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionDocumentMetadataFilterInput = {
  and?: Array< ModelSubscriptionDocumentMetadataFilterInput | null > | null,
  category?: ModelSubscriptionStringInput | null,
  contentType?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  documentId?: ModelSubscriptionStringInput | null,
  errorMessage?: ModelSubscriptionStringInput | null,
  fileSize?: ModelSubscriptionIntInput | null,
  filename?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  metadata?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionDocumentMetadataFilterInput | null > | null,
  owner?: ModelStringInput | null,
  processedAt?: ModelSubscriptionStringInput | null,
  s3Bucket?: ModelSubscriptionStringInput | null,
  s3Key?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  ttl?: ModelSubscriptionIntInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  uploadDate?: ModelSubscriptionStringInput | null,
  userId?: ModelSubscriptionStringInput | null,
  vectorIndexed?: ModelSubscriptionBooleanInput | null,
};

export type ModelSubscriptionEuGrantRecordFilterInput = {
  agency?: ModelSubscriptionStringInput | null,
  amount?: ModelSubscriptionFloatInput | null,
  and?: Array< ModelSubscriptionEuGrantRecordFilterInput | null > | null,
  applicationProcess?: ModelSubscriptionStringInput | null,
  awardCeiling?: ModelSubscriptionStringInput | null,
  awardFloor?: ModelSubscriptionFloatInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  deadline?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  eligibility?: ModelSubscriptionStringInput | null,
  euAllDeadlines?: ModelSubscriptionStringInput | null,
  euBudgetOverview?: ModelSubscriptionStringInput | null,
  euCallDetails?: ModelSubscriptionStringInput | null,
  euCallIdentifier?: ModelSubscriptionStringInput | null,
  euCallTitle?: ModelSubscriptionStringInput | null,
  euConditions?: ModelSubscriptionStringInput | null,
  euCrossCuttingPriorities?: ModelSubscriptionStringInput | null,
  euDeadlineModel?: ModelSubscriptionStringInput | null,
  euFrameworkProgramme?: ModelSubscriptionStringInput | null,
  euIdentifier?: ModelSubscriptionStringInput | null,
  euKeywords?: ModelSubscriptionStringInput | null,
  euLanguage?: ModelSubscriptionStringInput | null,
  euLatestUpdates?: ModelSubscriptionStringInput | null,
  euPortalUrl?: ModelSubscriptionStringInput | null,
  euProgrammePeriod?: ModelSubscriptionStringInput | null,
  euReference?: ModelSubscriptionStringInput | null,
  euStatus?: ModelSubscriptionStringInput | null,
  euSupportInfo?: ModelSubscriptionStringInput | null,
  euTypesOfAction?: ModelSubscriptionStringInput | null,
  euUrl?: ModelSubscriptionStringInput | null,
  grantId?: ModelSubscriptionStringInput | null,
  hasDetailedInfo?: ModelSubscriptionBooleanInput | null,
  id?: ModelSubscriptionIDInput | null,
  keywordScore?: ModelSubscriptionFloatInput | null,
  matchedKeywords?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionEuGrantRecordFilterInput | null > | null,
  profileMatchScore?: ModelSubscriptionFloatInput | null,
  relevanceScore?: ModelSubscriptionFloatInput | null,
  sessionId?: ModelSubscriptionStringInput | null,
  source?: ModelSubscriptionStringInput | null,
  tags?: ModelSubscriptionStringInput | null,
  title?: ModelSubscriptionStringInput | null,
  ttl?: ModelSubscriptionIntInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionFloatInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  in?: Array< number | null > | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionGrantRecordFilterInput = {
  agency?: ModelSubscriptionStringInput | null,
  amount?: ModelSubscriptionFloatInput | null,
  and?: Array< ModelSubscriptionGrantRecordFilterInput | null > | null,
  applicationProcess?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  deadline?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  eligibility?: ModelSubscriptionStringInput | null,
  grantId?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  keywordScore?: ModelSubscriptionFloatInput | null,
  matchedKeywords?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionGrantRecordFilterInput | null > | null,
  profileMatchScore?: ModelSubscriptionFloatInput | null,
  relevanceScore?: ModelSubscriptionFloatInput | null,
  sessionId?: ModelSubscriptionStringInput | null,
  source?: ModelSubscriptionStringInput | null,
  tags?: ModelSubscriptionStringInput | null,
  title?: ModelSubscriptionStringInput | null,
  ttl?: ModelSubscriptionIntInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionProposalFilterInput = {
  and?: Array< ModelSubscriptionProposalFilterInput | null > | null,
  content?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  grantId?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  metadata?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionProposalFilterInput | null > | null,
  owner?: ModelStringInput | null,
  sections?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  title?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  userId?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionSearchEventFilterInput = {
  and?: Array< ModelSubscriptionSearchEventFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  data?: ModelSubscriptionStringInput | null,
  eventType?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionSearchEventFilterInput | null > | null,
  sessionId?: ModelSubscriptionStringInput | null,
  timestamp?: ModelSubscriptionIntInput | null,
  ttl?: ModelSubscriptionIntInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionUserProfileFilterInput = {
  agencies?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionUserProfileFilterInput | null > | null,
  budget_range?: ModelSubscriptionStringInput | null,
  collaboration_pref?: ModelSubscriptionStringInput | null,
  country?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  created_date?: ModelSubscriptionStringInput | null,
  default_profile?: ModelSubscriptionBooleanInput | null,
  department?: ModelSubscriptionStringInput | null,
  duration_preference?: ModelSubscriptionStringInput | null,
  early_investigator?: ModelSubscriptionStringInput | null,
  email?: ModelSubscriptionStringInput | null,
  expertise?: ModelSubscriptionStringInput | null,
  expertise_level?: ModelSubscriptionStringInput | null,
  firstName?: ModelSubscriptionStringInput | null,
  fundingHistory?: ModelSubscriptionStringInput | null,
  geographic_scope?: ModelSubscriptionStringInput | null,
  grants_api?: ModelSubscriptionStringInput | null,
  grantsgov_filters?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  institution?: ModelSubscriptionStringInput | null,
  interdisciplinary?: ModelSubscriptionStringInput | null,
  isActive?: ModelSubscriptionBooleanInput | null,
  keyword_string?: ModelSubscriptionStringInput | null,
  keywords?: ModelSubscriptionStringInput | null,
  lastName?: ModelSubscriptionStringInput | null,
  last_updated?: ModelSubscriptionStringInput | null,
  methodologies?: ModelSubscriptionStringInput | null,
  name?: ModelSubscriptionStringInput | null,
  optimized_keywords?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionUserProfileFilterInput | null > | null,
  orcid_id?: ModelSubscriptionStringInput | null,
  organization?: ModelSubscriptionStringInput | null,
  position?: ModelSubscriptionStringInput | null,
  preferences?: ModelSubscriptionStringInput | null,
  preferred_languages?: ModelSubscriptionStringInput | null,
  preferred_programs?: ModelSubscriptionStringInput | null,
  researchInterests?: ModelSubscriptionStringInput | null,
  research_areas?: ModelSubscriptionStringInput | null,
  researcherType?: ModelSubscriptionStringInput | null,
  submission_deadline?: ModelSubscriptionStringInput | null,
  tech_skills?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  use_structured_filters?: ModelSubscriptionBooleanInput | null,
  userId?: ModelSubscriptionStringInput | null,
};

export type GetAgentConfigQueryVariables = {
  id: string,
};

export type GetAgentConfigQuery = {
  getAgentConfig?:  {
    __typename: "AgentConfig",
    autoOn?: boolean | null,
    createdAt?: string | null,
    grantsSurfaced?: number | null,
    id: string,
    isActive?: boolean | null,
    lastRun?: string | null,
    nextRun?: string | null,
    profileSelected: string,
    storageDuration?: number | null,
    timeInterval?: number | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type GetAgentDiscoveryResultQueryVariables = {
  id: string,
};

export type GetAgentDiscoveryResultQuery = {
  getAgentDiscoveryResult?:  {
    __typename: "AgentDiscoveryResult",
    configId: string,
    createdAt?: string | null,
    errorMessage?: string | null,
    executionId?: string | null,
    executionTime: string,
    grantsFound?: number | null,
    grantsStored?: number | null,
    id: string,
    metadata?: string | null,
    profileId: string,
    s3Bucket?: string | null,
    s3Key?: string | null,
    searchQuery?: string | null,
    sessionId: string,
    status: string,
    topGrants?: string | null,
    totalGrantsFound?: number | null,
    updatedAt?: string | null,
  } | null,
};

export type GetChatSessionQueryVariables = {
  sessionId: string,
};

export type GetChatSessionQuery = {
  getChatSession?:  {
    __typename: "ChatSession",
    context?: string | null,
    createdAt: string,
    messages?:  Array< {
      __typename: "ChatMessage",
      content: string,
      messageId: string,
      role: string,
      timestamp: string,
    } | null > | null,
    sessionId: string,
    summary?: string | null,
    updatedAt: string,
    userEmail: string,
    userId: string,
  } | null,
};

export type GetDiscoveryResultContentQueryVariables = {
  key: string,
};

export type GetDiscoveryResultContentQuery = {
  getDiscoveryResultContent?: string | null,
};

export type GetDiscoveryResultDownloadUrlQueryVariables = {
  key: string,
};

export type GetDiscoveryResultDownloadUrlQuery = {
  getDiscoveryResultDownloadUrl?: string | null,
};

export type GetDocumentQueryVariables = {
  documentId: string,
};

export type GetDocumentQuery = {
  getDocument?: string | null,
};

export type GetDocumentMetadataQueryVariables = {
  documentId: string,
  userId: string,
};

export type GetDocumentMetadataQuery = {
  getDocumentMetadata?:  {
    __typename: "DocumentMetadata",
    category?: string | null,
    contentType?: string | null,
    createdAt: string,
    documentId: string,
    errorMessage?: string | null,
    fileSize?: number | null,
    filename: string,
    metadata?: string | null,
    owner?: string | null,
    processedAt?: string | null,
    s3Bucket?: string | null,
    s3Key: string,
    status?: DocumentMetadataStatus | null,
    ttl?: number | null,
    updatedAt: string,
    uploadDate?: string | null,
    userId: string,
    vectorIndexed?: boolean | null,
  } | null,
};

export type GetEuGrantDetailsQueryVariables = {
  grantId: string,
};

export type GetEuGrantDetailsQuery = {
  getEuGrantDetails?: string | null,
};

export type GetEuGrantRecordQueryVariables = {
  id: string,
};

export type GetEuGrantRecordQuery = {
  getEuGrantRecord?:  {
    __typename: "EuGrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    awardCeiling?: string | null,
    awardFloor?: number | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    euAllDeadlines?: string | null,
    euBudgetOverview?: string | null,
    euCallDetails?: string | null,
    euCallIdentifier?: string | null,
    euCallTitle?: string | null,
    euConditions?: string | null,
    euCrossCuttingPriorities?: Array< string | null > | null,
    euDeadlineModel?: string | null,
    euFrameworkProgramme?: string | null,
    euIdentifier?: string | null,
    euKeywords?: Array< string | null > | null,
    euLanguage?: string | null,
    euLatestUpdates?: string | null,
    euPortalUrl?: string | null,
    euProgrammePeriod?: string | null,
    euReference?: string | null,
    euStatus?: string | null,
    euSupportInfo?: string | null,
    euTypesOfAction?: Array< string | null > | null,
    euUrl?: string | null,
    grantId: string,
    hasDetailedInfo?: boolean | null,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type GetGrantDetailsQueryVariables = {
  grantId: string,
  source?: string | null,
};

export type GetGrantDetailsQuery = {
  getGrantDetails?: string | null,
};

export type GetGrantRecordQueryVariables = {
  id: string,
};

export type GetGrantRecordQuery = {
  getGrantRecord?:  {
    __typename: "GrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    grantId: string,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type GetProposalQueryVariables = {
  id: string,
};

export type GetProposalQuery = {
  getProposal?:  {
    __typename: "Proposal",
    content?: string | null,
    createdAt: string,
    grantId: string,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    sections?: string | null,
    status?: ProposalStatus | null,
    title: string,
    updatedAt: string,
    userId: string,
  } | null,
};

export type GetSearchEventQueryVariables = {
  id: string,
};

export type GetSearchEventQuery = {
  getSearchEvent?:  {
    __typename: "SearchEvent",
    createdAt: string,
    data?: string | null,
    eventType: string,
    id: string,
    sessionId: string,
    timestamp?: number | null,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type GetUserProfileQueryVariables = {
  id: string,
};

export type GetUserProfileQuery = {
  getUserProfile?:  {
    __typename: "UserProfile",
    agencies?: Array< string | null > | null,
    budget_range?: string | null,
    collaboration_pref?: string | null,
    country?: string | null,
    createdAt: string,
    created_date?: string | null,
    default_profile?: boolean | null,
    department?: string | null,
    duration_preference?: string | null,
    early_investigator?: string | null,
    email: string,
    expertise?: Array< string | null > | null,
    expertise_level?: string | null,
    firstName?: string | null,
    fundingHistory?: Array< string | null > | null,
    geographic_scope?: string | null,
    grants_api?: string | null,
    grantsgov_filters?: string | null,
    id: string,
    institution?: string | null,
    interdisciplinary?: Array< string | null > | null,
    isActive?: boolean | null,
    keyword_string?: string | null,
    keywords?: Array< string | null > | null,
    lastName?: string | null,
    last_updated?: string | null,
    methodologies?: Array< string | null > | null,
    name?: string | null,
    optimized_keywords?: Array< string | null > | null,
    orcid_id?: string | null,
    organization?: string | null,
    position?: string | null,
    preferences?: string | null,
    preferred_languages?: Array< string | null > | null,
    preferred_programs?: Array< string | null > | null,
    researchInterests?: Array< string | null > | null,
    research_areas?: Array< string | null > | null,
    researcherType?: string | null,
    submission_deadline?: string | null,
    tech_skills?: Array< string | null > | null,
    updatedAt: string,
    use_structured_filters?: boolean | null,
    userId: string,
  } | null,
};

export type ListAgentConfigsQueryVariables = {
  filter?: ModelAgentConfigFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListAgentConfigsQuery = {
  listAgentConfigs?:  {
    __typename: "ModelAgentConfigConnection",
    items:  Array< {
      __typename: "AgentConfig",
      autoOn?: boolean | null,
      createdAt?: string | null,
      grantsSurfaced?: number | null,
      id: string,
      isActive?: boolean | null,
      lastRun?: string | null,
      nextRun?: string | null,
      profileSelected: string,
      storageDuration?: number | null,
      timeInterval?: number | null,
      updatedAt?: string | null,
      userId: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListAgentDiscoveryResultsQueryVariables = {
  filter?: ModelAgentDiscoveryResultFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListAgentDiscoveryResultsQuery = {
  listAgentDiscoveryResults?:  {
    __typename: "ModelAgentDiscoveryResultConnection",
    items:  Array< {
      __typename: "AgentDiscoveryResult",
      configId: string,
      createdAt?: string | null,
      errorMessage?: string | null,
      executionId?: string | null,
      executionTime: string,
      grantsFound?: number | null,
      grantsStored?: number | null,
      id: string,
      metadata?: string | null,
      profileId: string,
      s3Bucket?: string | null,
      s3Key?: string | null,
      searchQuery?: string | null,
      sessionId: string,
      status: string,
      topGrants?: string | null,
      totalGrantsFound?: number | null,
      updatedAt?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListDiscoveryResultsQueryVariables = {
};

export type ListDiscoveryResultsQuery = {
  listDiscoveryResults?: string | null,
};

export type ListDocumentMetadataQueryVariables = {
  documentId?: ModelStringKeyConditionInput | null,
  filter?: ModelDocumentMetadataFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
  userId?: string | null,
};

export type ListDocumentMetadataQuery = {
  listDocumentMetadata?:  {
    __typename: "ModelDocumentMetadataConnection",
    items:  Array< {
      __typename: "DocumentMetadata",
      category?: string | null,
      contentType?: string | null,
      createdAt: string,
      documentId: string,
      errorMessage?: string | null,
      fileSize?: number | null,
      filename: string,
      metadata?: string | null,
      owner?: string | null,
      processedAt?: string | null,
      s3Bucket?: string | null,
      s3Key: string,
      status?: DocumentMetadataStatus | null,
      ttl?: number | null,
      updatedAt: string,
      uploadDate?: string | null,
      userId: string,
      vectorIndexed?: boolean | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListDocumentsQueryVariables = {
  filters?: SearchFiltersInput | null,
  limit?: number | null,
  offset?: number | null,
};

export type ListDocumentsQuery = {
  listDocuments?: string | null,
};

export type ListDocumentsByDateQueryVariables = {
  filter?: ModelDocumentMetadataFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
  uploadDate?: ModelStringKeyConditionInput | null,
  userId: string,
};

export type ListDocumentsByDateQuery = {
  listDocumentsByDate?:  {
    __typename: "ModelDocumentMetadataConnection",
    items:  Array< {
      __typename: "DocumentMetadata",
      category?: string | null,
      contentType?: string | null,
      createdAt: string,
      documentId: string,
      errorMessage?: string | null,
      fileSize?: number | null,
      filename: string,
      metadata?: string | null,
      owner?: string | null,
      processedAt?: string | null,
      s3Bucket?: string | null,
      s3Key: string,
      status?: DocumentMetadataStatus | null,
      ttl?: number | null,
      updatedAt: string,
      uploadDate?: string | null,
      userId: string,
      vectorIndexed?: boolean | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListDocumentsByStatusQueryVariables = {
  filter?: ModelDocumentMetadataFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
  status?: ModelStringKeyConditionInput | null,
  userId: string,
};

export type ListDocumentsByStatusQuery = {
  listDocumentsByStatus?:  {
    __typename: "ModelDocumentMetadataConnection",
    items:  Array< {
      __typename: "DocumentMetadata",
      category?: string | null,
      contentType?: string | null,
      createdAt: string,
      documentId: string,
      errorMessage?: string | null,
      fileSize?: number | null,
      filename: string,
      metadata?: string | null,
      owner?: string | null,
      processedAt?: string | null,
      s3Bucket?: string | null,
      s3Key: string,
      status?: DocumentMetadataStatus | null,
      ttl?: number | null,
      updatedAt: string,
      uploadDate?: string | null,
      userId: string,
      vectorIndexed?: boolean | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListEuGrantRecordsQueryVariables = {
  filter?: ModelEuGrantRecordFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListEuGrantRecordsQuery = {
  listEuGrantRecords?:  {
    __typename: "ModelEuGrantRecordConnection",
    items:  Array< {
      __typename: "EuGrantRecord",
      agency?: string | null,
      amount?: number | null,
      applicationProcess?: string | null,
      awardCeiling?: string | null,
      awardFloor?: number | null,
      createdAt?: string | null,
      deadline?: string | null,
      description?: string | null,
      eligibility?: string | null,
      euAllDeadlines?: string | null,
      euBudgetOverview?: string | null,
      euCallDetails?: string | null,
      euCallIdentifier?: string | null,
      euCallTitle?: string | null,
      euConditions?: string | null,
      euCrossCuttingPriorities?: Array< string | null > | null,
      euDeadlineModel?: string | null,
      euFrameworkProgramme?: string | null,
      euIdentifier?: string | null,
      euKeywords?: Array< string | null > | null,
      euLanguage?: string | null,
      euLatestUpdates?: string | null,
      euPortalUrl?: string | null,
      euProgrammePeriod?: string | null,
      euReference?: string | null,
      euStatus?: string | null,
      euSupportInfo?: string | null,
      euTypesOfAction?: Array< string | null > | null,
      euUrl?: string | null,
      grantId: string,
      hasDetailedInfo?: boolean | null,
      id: string,
      keywordScore?: number | null,
      matchedKeywords?: Array< string | null > | null,
      profileMatchScore?: number | null,
      relevanceScore?: number | null,
      sessionId: string,
      source?: string | null,
      tags?: Array< string | null > | null,
      title: string,
      ttl?: number | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListGrantRecordsQueryVariables = {
  filter?: ModelGrantRecordFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListGrantRecordsQuery = {
  listGrantRecords?:  {
    __typename: "ModelGrantRecordConnection",
    items:  Array< {
      __typename: "GrantRecord",
      agency?: string | null,
      amount?: number | null,
      applicationProcess?: string | null,
      createdAt?: string | null,
      deadline?: string | null,
      description?: string | null,
      eligibility?: string | null,
      grantId: string,
      id: string,
      keywordScore?: number | null,
      matchedKeywords?: Array< string | null > | null,
      profileMatchScore?: number | null,
      relevanceScore?: number | null,
      sessionId: string,
      source?: string | null,
      tags?: Array< string | null > | null,
      title: string,
      ttl?: number | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListProposalsQueryVariables = {
  filter?: ModelProposalFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListProposalsQuery = {
  listProposals?:  {
    __typename: "ModelProposalConnection",
    items:  Array< {
      __typename: "Proposal",
      content?: string | null,
      createdAt: string,
      grantId: string,
      id: string,
      metadata?: string | null,
      owner?: string | null,
      sections?: string | null,
      status?: ProposalStatus | null,
      title: string,
      updatedAt: string,
      userId: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListSearchEventsQueryVariables = {
  filter?: ModelSearchEventFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListSearchEventsQuery = {
  listSearchEvents?:  {
    __typename: "ModelSearchEventConnection",
    items:  Array< {
      __typename: "SearchEvent",
      createdAt: string,
      data?: string | null,
      eventType: string,
      id: string,
      sessionId: string,
      timestamp?: number | null,
      ttl?: number | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListUserChatSessionsQueryVariables = {
  limit?: number | null,
  nextToken?: string | null,
};

export type ListUserChatSessionsQuery = {
  listUserChatSessions?:  Array< {
    __typename: "ChatSessionSummary",
    createdAt: string,
    sessionId: string,
    summary?: string | null,
    updatedAt: string,
    userEmail: string,
  } | null > | null,
};

export type ListUserProfilesQueryVariables = {
  filter?: ModelUserProfileFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListUserProfilesQuery = {
  listUserProfiles?:  {
    __typename: "ModelUserProfileConnection",
    items:  Array< {
      __typename: "UserProfile",
      agencies?: Array< string | null > | null,
      budget_range?: string | null,
      collaboration_pref?: string | null,
      country?: string | null,
      createdAt: string,
      created_date?: string | null,
      default_profile?: boolean | null,
      department?: string | null,
      duration_preference?: string | null,
      early_investigator?: string | null,
      email: string,
      expertise?: Array< string | null > | null,
      expertise_level?: string | null,
      firstName?: string | null,
      fundingHistory?: Array< string | null > | null,
      geographic_scope?: string | null,
      grants_api?: string | null,
      grantsgov_filters?: string | null,
      id: string,
      institution?: string | null,
      interdisciplinary?: Array< string | null > | null,
      isActive?: boolean | null,
      keyword_string?: string | null,
      keywords?: Array< string | null > | null,
      lastName?: string | null,
      last_updated?: string | null,
      methodologies?: Array< string | null > | null,
      name?: string | null,
      optimized_keywords?: Array< string | null > | null,
      orcid_id?: string | null,
      organization?: string | null,
      position?: string | null,
      preferences?: string | null,
      preferred_languages?: Array< string | null > | null,
      preferred_programs?: Array< string | null > | null,
      researchInterests?: Array< string | null > | null,
      research_areas?: Array< string | null > | null,
      researcherType?: string | null,
      submission_deadline?: string | null,
      tech_skills?: Array< string | null > | null,
      updatedAt: string,
      use_structured_filters?: boolean | null,
      userId: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type SearchDocumentsQueryVariables = {
  filters?: SearchFiltersInput | null,
  limit?: number | null,
  offset?: number | null,
  query: string,
};

export type SearchDocumentsQuery = {
  searchDocuments?:  {
    __typename: "SearchResponse",
    results:  Array< {
      __typename: "SearchResult",
      documentId: string,
      excerpt: string,
      filename: string,
      metadata?: string | null,
      relevanceScore: number,
    } | null >,
    total: number,
  } | null,
};

export type CreateAgentConfigMutationVariables = {
  condition?: ModelAgentConfigConditionInput | null,
  input: CreateAgentConfigInput,
};

export type CreateAgentConfigMutation = {
  createAgentConfig?:  {
    __typename: "AgentConfig",
    autoOn?: boolean | null,
    createdAt?: string | null,
    grantsSurfaced?: number | null,
    id: string,
    isActive?: boolean | null,
    lastRun?: string | null,
    nextRun?: string | null,
    profileSelected: string,
    storageDuration?: number | null,
    timeInterval?: number | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type CreateAgentDiscoveryResultMutationVariables = {
  condition?: ModelAgentDiscoveryResultConditionInput | null,
  input: CreateAgentDiscoveryResultInput,
};

export type CreateAgentDiscoveryResultMutation = {
  createAgentDiscoveryResult?:  {
    __typename: "AgentDiscoveryResult",
    configId: string,
    createdAt?: string | null,
    errorMessage?: string | null,
    executionId?: string | null,
    executionTime: string,
    grantsFound?: number | null,
    grantsStored?: number | null,
    id: string,
    metadata?: string | null,
    profileId: string,
    s3Bucket?: string | null,
    s3Key?: string | null,
    searchQuery?: string | null,
    sessionId: string,
    status: string,
    topGrants?: string | null,
    totalGrantsFound?: number | null,
    updatedAt?: string | null,
  } | null,
};

export type CreateDocumentMetadataMutationVariables = {
  condition?: ModelDocumentMetadataConditionInput | null,
  input: CreateDocumentMetadataInput,
};

export type CreateDocumentMetadataMutation = {
  createDocumentMetadata?:  {
    __typename: "DocumentMetadata",
    category?: string | null,
    contentType?: string | null,
    createdAt: string,
    documentId: string,
    errorMessage?: string | null,
    fileSize?: number | null,
    filename: string,
    metadata?: string | null,
    owner?: string | null,
    processedAt?: string | null,
    s3Bucket?: string | null,
    s3Key: string,
    status?: DocumentMetadataStatus | null,
    ttl?: number | null,
    updatedAt: string,
    uploadDate?: string | null,
    userId: string,
    vectorIndexed?: boolean | null,
  } | null,
};

export type CreateEuGrantRecordMutationVariables = {
  condition?: ModelEuGrantRecordConditionInput | null,
  input: CreateEuGrantRecordInput,
};

export type CreateEuGrantRecordMutation = {
  createEuGrantRecord?:  {
    __typename: "EuGrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    awardCeiling?: string | null,
    awardFloor?: number | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    euAllDeadlines?: string | null,
    euBudgetOverview?: string | null,
    euCallDetails?: string | null,
    euCallIdentifier?: string | null,
    euCallTitle?: string | null,
    euConditions?: string | null,
    euCrossCuttingPriorities?: Array< string | null > | null,
    euDeadlineModel?: string | null,
    euFrameworkProgramme?: string | null,
    euIdentifier?: string | null,
    euKeywords?: Array< string | null > | null,
    euLanguage?: string | null,
    euLatestUpdates?: string | null,
    euPortalUrl?: string | null,
    euProgrammePeriod?: string | null,
    euReference?: string | null,
    euStatus?: string | null,
    euSupportInfo?: string | null,
    euTypesOfAction?: Array< string | null > | null,
    euUrl?: string | null,
    grantId: string,
    hasDetailedInfo?: boolean | null,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type CreateGrantRecordMutationVariables = {
  condition?: ModelGrantRecordConditionInput | null,
  input: CreateGrantRecordInput,
};

export type CreateGrantRecordMutation = {
  createGrantRecord?:  {
    __typename: "GrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    grantId: string,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type CreateProposalMutationVariables = {
  condition?: ModelProposalConditionInput | null,
  input: CreateProposalInput,
};

export type CreateProposalMutation = {
  createProposal?:  {
    __typename: "Proposal",
    content?: string | null,
    createdAt: string,
    grantId: string,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    sections?: string | null,
    status?: ProposalStatus | null,
    title: string,
    updatedAt: string,
    userId: string,
  } | null,
};

export type CreateSearchEventMutationVariables = {
  condition?: ModelSearchEventConditionInput | null,
  input: CreateSearchEventInput,
};

export type CreateSearchEventMutation = {
  createSearchEvent?:  {
    __typename: "SearchEvent",
    createdAt: string,
    data?: string | null,
    eventType: string,
    id: string,
    sessionId: string,
    timestamp?: number | null,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type CreateUserProfileMutationVariables = {
  condition?: ModelUserProfileConditionInput | null,
  input: CreateUserProfileInput,
};

export type CreateUserProfileMutation = {
  createUserProfile?:  {
    __typename: "UserProfile",
    agencies?: Array< string | null > | null,
    budget_range?: string | null,
    collaboration_pref?: string | null,
    country?: string | null,
    createdAt: string,
    created_date?: string | null,
    default_profile?: boolean | null,
    department?: string | null,
    duration_preference?: string | null,
    early_investigator?: string | null,
    email: string,
    expertise?: Array< string | null > | null,
    expertise_level?: string | null,
    firstName?: string | null,
    fundingHistory?: Array< string | null > | null,
    geographic_scope?: string | null,
    grants_api?: string | null,
    grantsgov_filters?: string | null,
    id: string,
    institution?: string | null,
    interdisciplinary?: Array< string | null > | null,
    isActive?: boolean | null,
    keyword_string?: string | null,
    keywords?: Array< string | null > | null,
    lastName?: string | null,
    last_updated?: string | null,
    methodologies?: Array< string | null > | null,
    name?: string | null,
    optimized_keywords?: Array< string | null > | null,
    orcid_id?: string | null,
    organization?: string | null,
    position?: string | null,
    preferences?: string | null,
    preferred_languages?: Array< string | null > | null,
    preferred_programs?: Array< string | null > | null,
    researchInterests?: Array< string | null > | null,
    research_areas?: Array< string | null > | null,
    researcherType?: string | null,
    submission_deadline?: string | null,
    tech_skills?: Array< string | null > | null,
    updatedAt: string,
    use_structured_filters?: boolean | null,
    userId: string,
  } | null,
};

export type DeleteAgentConfigMutationVariables = {
  condition?: ModelAgentConfigConditionInput | null,
  input: DeleteAgentConfigInput,
};

export type DeleteAgentConfigMutation = {
  deleteAgentConfig?:  {
    __typename: "AgentConfig",
    autoOn?: boolean | null,
    createdAt?: string | null,
    grantsSurfaced?: number | null,
    id: string,
    isActive?: boolean | null,
    lastRun?: string | null,
    nextRun?: string | null,
    profileSelected: string,
    storageDuration?: number | null,
    timeInterval?: number | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type DeleteAgentDiscoveryResultMutationVariables = {
  condition?: ModelAgentDiscoveryResultConditionInput | null,
  input: DeleteAgentDiscoveryResultInput,
};

export type DeleteAgentDiscoveryResultMutation = {
  deleteAgentDiscoveryResult?:  {
    __typename: "AgentDiscoveryResult",
    configId: string,
    createdAt?: string | null,
    errorMessage?: string | null,
    executionId?: string | null,
    executionTime: string,
    grantsFound?: number | null,
    grantsStored?: number | null,
    id: string,
    metadata?: string | null,
    profileId: string,
    s3Bucket?: string | null,
    s3Key?: string | null,
    searchQuery?: string | null,
    sessionId: string,
    status: string,
    topGrants?: string | null,
    totalGrantsFound?: number | null,
    updatedAt?: string | null,
  } | null,
};

export type DeleteDocumentMutationVariables = {
  documentId: string,
};

export type DeleteDocumentMutation = {
  deleteDocument?: boolean | null,
};

export type DeleteDocumentMetadataMutationVariables = {
  condition?: ModelDocumentMetadataConditionInput | null,
  input: DeleteDocumentMetadataInput,
};

export type DeleteDocumentMetadataMutation = {
  deleteDocumentMetadata?:  {
    __typename: "DocumentMetadata",
    category?: string | null,
    contentType?: string | null,
    createdAt: string,
    documentId: string,
    errorMessage?: string | null,
    fileSize?: number | null,
    filename: string,
    metadata?: string | null,
    owner?: string | null,
    processedAt?: string | null,
    s3Bucket?: string | null,
    s3Key: string,
    status?: DocumentMetadataStatus | null,
    ttl?: number | null,
    updatedAt: string,
    uploadDate?: string | null,
    userId: string,
    vectorIndexed?: boolean | null,
  } | null,
};

export type DeleteEuGrantRecordMutationVariables = {
  condition?: ModelEuGrantRecordConditionInput | null,
  input: DeleteEuGrantRecordInput,
};

export type DeleteEuGrantRecordMutation = {
  deleteEuGrantRecord?:  {
    __typename: "EuGrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    awardCeiling?: string | null,
    awardFloor?: number | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    euAllDeadlines?: string | null,
    euBudgetOverview?: string | null,
    euCallDetails?: string | null,
    euCallIdentifier?: string | null,
    euCallTitle?: string | null,
    euConditions?: string | null,
    euCrossCuttingPriorities?: Array< string | null > | null,
    euDeadlineModel?: string | null,
    euFrameworkProgramme?: string | null,
    euIdentifier?: string | null,
    euKeywords?: Array< string | null > | null,
    euLanguage?: string | null,
    euLatestUpdates?: string | null,
    euPortalUrl?: string | null,
    euProgrammePeriod?: string | null,
    euReference?: string | null,
    euStatus?: string | null,
    euSupportInfo?: string | null,
    euTypesOfAction?: Array< string | null > | null,
    euUrl?: string | null,
    grantId: string,
    hasDetailedInfo?: boolean | null,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type DeleteGrantRecordMutationVariables = {
  condition?: ModelGrantRecordConditionInput | null,
  input: DeleteGrantRecordInput,
};

export type DeleteGrantRecordMutation = {
  deleteGrantRecord?:  {
    __typename: "GrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    grantId: string,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type DeleteProposalMutationVariables = {
  condition?: ModelProposalConditionInput | null,
  input: DeleteProposalInput,
};

export type DeleteProposalMutation = {
  deleteProposal?:  {
    __typename: "Proposal",
    content?: string | null,
    createdAt: string,
    grantId: string,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    sections?: string | null,
    status?: ProposalStatus | null,
    title: string,
    updatedAt: string,
    userId: string,
  } | null,
};

export type DeleteSearchEventMutationVariables = {
  condition?: ModelSearchEventConditionInput | null,
  input: DeleteSearchEventInput,
};

export type DeleteSearchEventMutation = {
  deleteSearchEvent?:  {
    __typename: "SearchEvent",
    createdAt: string,
    data?: string | null,
    eventType: string,
    id: string,
    sessionId: string,
    timestamp?: number | null,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type DeleteUserProfileMutationVariables = {
  condition?: ModelUserProfileConditionInput | null,
  input: DeleteUserProfileInput,
};

export type DeleteUserProfileMutation = {
  deleteUserProfile?:  {
    __typename: "UserProfile",
    agencies?: Array< string | null > | null,
    budget_range?: string | null,
    collaboration_pref?: string | null,
    country?: string | null,
    createdAt: string,
    created_date?: string | null,
    default_profile?: boolean | null,
    department?: string | null,
    duration_preference?: string | null,
    early_investigator?: string | null,
    email: string,
    expertise?: Array< string | null > | null,
    expertise_level?: string | null,
    firstName?: string | null,
    fundingHistory?: Array< string | null > | null,
    geographic_scope?: string | null,
    grants_api?: string | null,
    grantsgov_filters?: string | null,
    id: string,
    institution?: string | null,
    interdisciplinary?: Array< string | null > | null,
    isActive?: boolean | null,
    keyword_string?: string | null,
    keywords?: Array< string | null > | null,
    lastName?: string | null,
    last_updated?: string | null,
    methodologies?: Array< string | null > | null,
    name?: string | null,
    optimized_keywords?: Array< string | null > | null,
    orcid_id?: string | null,
    organization?: string | null,
    position?: string | null,
    preferences?: string | null,
    preferred_languages?: Array< string | null > | null,
    preferred_programs?: Array< string | null > | null,
    researchInterests?: Array< string | null > | null,
    research_areas?: Array< string | null > | null,
    researcherType?: string | null,
    submission_deadline?: string | null,
    tech_skills?: Array< string | null > | null,
    updatedAt: string,
    use_structured_filters?: boolean | null,
    userId: string,
  } | null,
};

export type ProcessAgentDiscoveryUpdateMutationVariables = {
  input: string,
};

export type ProcessAgentDiscoveryUpdateMutation = {
  processAgentDiscoveryUpdate?: string | null,
};

export type SendChatMessageMutationVariables = {
  message: string,
  sessionId?: string | null,
};

export type SendChatMessageMutation = {
  sendChatMessage?:  {
    __typename: "ChatMessageResponse",
    content: string,
    isComplete: boolean,
    messageId: string,
    sessionId: string,
    toolCalls?:  Array< {
      __typename: "ChatToolCall",
      parameters?: string | null,
      result?: string | null,
      toolName: string,
    } | null > | null,
  } | null,
};

export type StartEuGrantSearchMutationVariables = {
  input: string,
};

export type StartEuGrantSearchMutation = {
  startEuGrantSearch?: string | null,
};

export type StartGrantSearchMutationVariables = {
  input: string,
};

export type StartGrantSearchMutation = {
  startGrantSearch?: string | null,
};

export type TriggerAgentDiscoveryMutationVariables = {
  configId: string,
};

export type TriggerAgentDiscoveryMutation = {
  triggerAgentDiscovery?: string | null,
};

export type UpdateAgentConfigMutationVariables = {
  condition?: ModelAgentConfigConditionInput | null,
  input: UpdateAgentConfigInput,
};

export type UpdateAgentConfigMutation = {
  updateAgentConfig?:  {
    __typename: "AgentConfig",
    autoOn?: boolean | null,
    createdAt?: string | null,
    grantsSurfaced?: number | null,
    id: string,
    isActive?: boolean | null,
    lastRun?: string | null,
    nextRun?: string | null,
    profileSelected: string,
    storageDuration?: number | null,
    timeInterval?: number | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type UpdateAgentDiscoveryResultMutationVariables = {
  condition?: ModelAgentDiscoveryResultConditionInput | null,
  input: UpdateAgentDiscoveryResultInput,
};

export type UpdateAgentDiscoveryResultMutation = {
  updateAgentDiscoveryResult?:  {
    __typename: "AgentDiscoveryResult",
    configId: string,
    createdAt?: string | null,
    errorMessage?: string | null,
    executionId?: string | null,
    executionTime: string,
    grantsFound?: number | null,
    grantsStored?: number | null,
    id: string,
    metadata?: string | null,
    profileId: string,
    s3Bucket?: string | null,
    s3Key?: string | null,
    searchQuery?: string | null,
    sessionId: string,
    status: string,
    topGrants?: string | null,
    totalGrantsFound?: number | null,
    updatedAt?: string | null,
  } | null,
};

export type UpdateDocumentMetadataMutationVariables = {
  condition?: ModelDocumentMetadataConditionInput | null,
  input: UpdateDocumentMetadataInput,
};

export type UpdateDocumentMetadataMutation = {
  updateDocumentMetadata?:  {
    __typename: "DocumentMetadata",
    category?: string | null,
    contentType?: string | null,
    createdAt: string,
    documentId: string,
    errorMessage?: string | null,
    fileSize?: number | null,
    filename: string,
    metadata?: string | null,
    owner?: string | null,
    processedAt?: string | null,
    s3Bucket?: string | null,
    s3Key: string,
    status?: DocumentMetadataStatus | null,
    ttl?: number | null,
    updatedAt: string,
    uploadDate?: string | null,
    userId: string,
    vectorIndexed?: boolean | null,
  } | null,
};

export type UpdateEuGrantRecordMutationVariables = {
  condition?: ModelEuGrantRecordConditionInput | null,
  input: UpdateEuGrantRecordInput,
};

export type UpdateEuGrantRecordMutation = {
  updateEuGrantRecord?:  {
    __typename: "EuGrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    awardCeiling?: string | null,
    awardFloor?: number | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    euAllDeadlines?: string | null,
    euBudgetOverview?: string | null,
    euCallDetails?: string | null,
    euCallIdentifier?: string | null,
    euCallTitle?: string | null,
    euConditions?: string | null,
    euCrossCuttingPriorities?: Array< string | null > | null,
    euDeadlineModel?: string | null,
    euFrameworkProgramme?: string | null,
    euIdentifier?: string | null,
    euKeywords?: Array< string | null > | null,
    euLanguage?: string | null,
    euLatestUpdates?: string | null,
    euPortalUrl?: string | null,
    euProgrammePeriod?: string | null,
    euReference?: string | null,
    euStatus?: string | null,
    euSupportInfo?: string | null,
    euTypesOfAction?: Array< string | null > | null,
    euUrl?: string | null,
    grantId: string,
    hasDetailedInfo?: boolean | null,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type UpdateGrantRecordMutationVariables = {
  condition?: ModelGrantRecordConditionInput | null,
  input: UpdateGrantRecordInput,
};

export type UpdateGrantRecordMutation = {
  updateGrantRecord?:  {
    __typename: "GrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    grantId: string,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type UpdateProposalMutationVariables = {
  condition?: ModelProposalConditionInput | null,
  input: UpdateProposalInput,
};

export type UpdateProposalMutation = {
  updateProposal?:  {
    __typename: "Proposal",
    content?: string | null,
    createdAt: string,
    grantId: string,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    sections?: string | null,
    status?: ProposalStatus | null,
    title: string,
    updatedAt: string,
    userId: string,
  } | null,
};

export type UpdateSearchEventMutationVariables = {
  condition?: ModelSearchEventConditionInput | null,
  input: UpdateSearchEventInput,
};

export type UpdateSearchEventMutation = {
  updateSearchEvent?:  {
    __typename: "SearchEvent",
    createdAt: string,
    data?: string | null,
    eventType: string,
    id: string,
    sessionId: string,
    timestamp?: number | null,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type UpdateUserProfileMutationVariables = {
  condition?: ModelUserProfileConditionInput | null,
  input: UpdateUserProfileInput,
};

export type UpdateUserProfileMutation = {
  updateUserProfile?:  {
    __typename: "UserProfile",
    agencies?: Array< string | null > | null,
    budget_range?: string | null,
    collaboration_pref?: string | null,
    country?: string | null,
    createdAt: string,
    created_date?: string | null,
    default_profile?: boolean | null,
    department?: string | null,
    duration_preference?: string | null,
    early_investigator?: string | null,
    email: string,
    expertise?: Array< string | null > | null,
    expertise_level?: string | null,
    firstName?: string | null,
    fundingHistory?: Array< string | null > | null,
    geographic_scope?: string | null,
    grants_api?: string | null,
    grantsgov_filters?: string | null,
    id: string,
    institution?: string | null,
    interdisciplinary?: Array< string | null > | null,
    isActive?: boolean | null,
    keyword_string?: string | null,
    keywords?: Array< string | null > | null,
    lastName?: string | null,
    last_updated?: string | null,
    methodologies?: Array< string | null > | null,
    name?: string | null,
    optimized_keywords?: Array< string | null > | null,
    orcid_id?: string | null,
    organization?: string | null,
    position?: string | null,
    preferences?: string | null,
    preferred_languages?: Array< string | null > | null,
    preferred_programs?: Array< string | null > | null,
    researchInterests?: Array< string | null > | null,
    research_areas?: Array< string | null > | null,
    researcherType?: string | null,
    submission_deadline?: string | null,
    tech_skills?: Array< string | null > | null,
    updatedAt: string,
    use_structured_filters?: boolean | null,
    userId: string,
  } | null,
};

export type UploadDocumentMutationVariables = {
  input: UploadDocumentInputInput,
};

export type UploadDocumentMutation = {
  uploadDocument?:  {
    __typename: "UploadDocumentResponse",
    documentId: string,
    expiresIn: number,
    s3Bucket: string,
    s3Key: string,
    status: string,
    uploadUrl: string,
  } | null,
};

export type OnCreateAgentConfigSubscriptionVariables = {
  filter?: ModelSubscriptionAgentConfigFilterInput | null,
};

export type OnCreateAgentConfigSubscription = {
  onCreateAgentConfig?:  {
    __typename: "AgentConfig",
    autoOn?: boolean | null,
    createdAt?: string | null,
    grantsSurfaced?: number | null,
    id: string,
    isActive?: boolean | null,
    lastRun?: string | null,
    nextRun?: string | null,
    profileSelected: string,
    storageDuration?: number | null,
    timeInterval?: number | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type OnCreateAgentDiscoveryResultSubscriptionVariables = {
  filter?: ModelSubscriptionAgentDiscoveryResultFilterInput | null,
};

export type OnCreateAgentDiscoveryResultSubscription = {
  onCreateAgentDiscoveryResult?:  {
    __typename: "AgentDiscoveryResult",
    configId: string,
    createdAt?: string | null,
    errorMessage?: string | null,
    executionId?: string | null,
    executionTime: string,
    grantsFound?: number | null,
    grantsStored?: number | null,
    id: string,
    metadata?: string | null,
    profileId: string,
    s3Bucket?: string | null,
    s3Key?: string | null,
    searchQuery?: string | null,
    sessionId: string,
    status: string,
    topGrants?: string | null,
    totalGrantsFound?: number | null,
    updatedAt?: string | null,
  } | null,
};

export type OnCreateDocumentMetadataSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentMetadataFilterInput | null,
  owner?: string | null,
};

export type OnCreateDocumentMetadataSubscription = {
  onCreateDocumentMetadata?:  {
    __typename: "DocumentMetadata",
    category?: string | null,
    contentType?: string | null,
    createdAt: string,
    documentId: string,
    errorMessage?: string | null,
    fileSize?: number | null,
    filename: string,
    metadata?: string | null,
    owner?: string | null,
    processedAt?: string | null,
    s3Bucket?: string | null,
    s3Key: string,
    status?: DocumentMetadataStatus | null,
    ttl?: number | null,
    updatedAt: string,
    uploadDate?: string | null,
    userId: string,
    vectorIndexed?: boolean | null,
  } | null,
};

export type OnCreateEuGrantRecordSubscriptionVariables = {
  filter?: ModelSubscriptionEuGrantRecordFilterInput | null,
};

export type OnCreateEuGrantRecordSubscription = {
  onCreateEuGrantRecord?:  {
    __typename: "EuGrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    awardCeiling?: string | null,
    awardFloor?: number | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    euAllDeadlines?: string | null,
    euBudgetOverview?: string | null,
    euCallDetails?: string | null,
    euCallIdentifier?: string | null,
    euCallTitle?: string | null,
    euConditions?: string | null,
    euCrossCuttingPriorities?: Array< string | null > | null,
    euDeadlineModel?: string | null,
    euFrameworkProgramme?: string | null,
    euIdentifier?: string | null,
    euKeywords?: Array< string | null > | null,
    euLanguage?: string | null,
    euLatestUpdates?: string | null,
    euPortalUrl?: string | null,
    euProgrammePeriod?: string | null,
    euReference?: string | null,
    euStatus?: string | null,
    euSupportInfo?: string | null,
    euTypesOfAction?: Array< string | null > | null,
    euUrl?: string | null,
    grantId: string,
    hasDetailedInfo?: boolean | null,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnCreateGrantRecordSubscriptionVariables = {
  filter?: ModelSubscriptionGrantRecordFilterInput | null,
};

export type OnCreateGrantRecordSubscription = {
  onCreateGrantRecord?:  {
    __typename: "GrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    grantId: string,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnCreateProposalSubscriptionVariables = {
  filter?: ModelSubscriptionProposalFilterInput | null,
  owner?: string | null,
};

export type OnCreateProposalSubscription = {
  onCreateProposal?:  {
    __typename: "Proposal",
    content?: string | null,
    createdAt: string,
    grantId: string,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    sections?: string | null,
    status?: ProposalStatus | null,
    title: string,
    updatedAt: string,
    userId: string,
  } | null,
};

export type OnCreateSearchEventSubscriptionVariables = {
  filter?: ModelSubscriptionSearchEventFilterInput | null,
};

export type OnCreateSearchEventSubscription = {
  onCreateSearchEvent?:  {
    __typename: "SearchEvent",
    createdAt: string,
    data?: string | null,
    eventType: string,
    id: string,
    sessionId: string,
    timestamp?: number | null,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnCreateUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
};

export type OnCreateUserProfileSubscription = {
  onCreateUserProfile?:  {
    __typename: "UserProfile",
    agencies?: Array< string | null > | null,
    budget_range?: string | null,
    collaboration_pref?: string | null,
    country?: string | null,
    createdAt: string,
    created_date?: string | null,
    default_profile?: boolean | null,
    department?: string | null,
    duration_preference?: string | null,
    early_investigator?: string | null,
    email: string,
    expertise?: Array< string | null > | null,
    expertise_level?: string | null,
    firstName?: string | null,
    fundingHistory?: Array< string | null > | null,
    geographic_scope?: string | null,
    grants_api?: string | null,
    grantsgov_filters?: string | null,
    id: string,
    institution?: string | null,
    interdisciplinary?: Array< string | null > | null,
    isActive?: boolean | null,
    keyword_string?: string | null,
    keywords?: Array< string | null > | null,
    lastName?: string | null,
    last_updated?: string | null,
    methodologies?: Array< string | null > | null,
    name?: string | null,
    optimized_keywords?: Array< string | null > | null,
    orcid_id?: string | null,
    organization?: string | null,
    position?: string | null,
    preferences?: string | null,
    preferred_languages?: Array< string | null > | null,
    preferred_programs?: Array< string | null > | null,
    researchInterests?: Array< string | null > | null,
    research_areas?: Array< string | null > | null,
    researcherType?: string | null,
    submission_deadline?: string | null,
    tech_skills?: Array< string | null > | null,
    updatedAt: string,
    use_structured_filters?: boolean | null,
    userId: string,
  } | null,
};

export type OnDeleteAgentConfigSubscriptionVariables = {
  filter?: ModelSubscriptionAgentConfigFilterInput | null,
};

export type OnDeleteAgentConfigSubscription = {
  onDeleteAgentConfig?:  {
    __typename: "AgentConfig",
    autoOn?: boolean | null,
    createdAt?: string | null,
    grantsSurfaced?: number | null,
    id: string,
    isActive?: boolean | null,
    lastRun?: string | null,
    nextRun?: string | null,
    profileSelected: string,
    storageDuration?: number | null,
    timeInterval?: number | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type OnDeleteAgentDiscoveryResultSubscriptionVariables = {
  filter?: ModelSubscriptionAgentDiscoveryResultFilterInput | null,
};

export type OnDeleteAgentDiscoveryResultSubscription = {
  onDeleteAgentDiscoveryResult?:  {
    __typename: "AgentDiscoveryResult",
    configId: string,
    createdAt?: string | null,
    errorMessage?: string | null,
    executionId?: string | null,
    executionTime: string,
    grantsFound?: number | null,
    grantsStored?: number | null,
    id: string,
    metadata?: string | null,
    profileId: string,
    s3Bucket?: string | null,
    s3Key?: string | null,
    searchQuery?: string | null,
    sessionId: string,
    status: string,
    topGrants?: string | null,
    totalGrantsFound?: number | null,
    updatedAt?: string | null,
  } | null,
};

export type OnDeleteDocumentMetadataSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentMetadataFilterInput | null,
  owner?: string | null,
};

export type OnDeleteDocumentMetadataSubscription = {
  onDeleteDocumentMetadata?:  {
    __typename: "DocumentMetadata",
    category?: string | null,
    contentType?: string | null,
    createdAt: string,
    documentId: string,
    errorMessage?: string | null,
    fileSize?: number | null,
    filename: string,
    metadata?: string | null,
    owner?: string | null,
    processedAt?: string | null,
    s3Bucket?: string | null,
    s3Key: string,
    status?: DocumentMetadataStatus | null,
    ttl?: number | null,
    updatedAt: string,
    uploadDate?: string | null,
    userId: string,
    vectorIndexed?: boolean | null,
  } | null,
};

export type OnDeleteEuGrantRecordSubscriptionVariables = {
  filter?: ModelSubscriptionEuGrantRecordFilterInput | null,
};

export type OnDeleteEuGrantRecordSubscription = {
  onDeleteEuGrantRecord?:  {
    __typename: "EuGrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    awardCeiling?: string | null,
    awardFloor?: number | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    euAllDeadlines?: string | null,
    euBudgetOverview?: string | null,
    euCallDetails?: string | null,
    euCallIdentifier?: string | null,
    euCallTitle?: string | null,
    euConditions?: string | null,
    euCrossCuttingPriorities?: Array< string | null > | null,
    euDeadlineModel?: string | null,
    euFrameworkProgramme?: string | null,
    euIdentifier?: string | null,
    euKeywords?: Array< string | null > | null,
    euLanguage?: string | null,
    euLatestUpdates?: string | null,
    euPortalUrl?: string | null,
    euProgrammePeriod?: string | null,
    euReference?: string | null,
    euStatus?: string | null,
    euSupportInfo?: string | null,
    euTypesOfAction?: Array< string | null > | null,
    euUrl?: string | null,
    grantId: string,
    hasDetailedInfo?: boolean | null,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteGrantRecordSubscriptionVariables = {
  filter?: ModelSubscriptionGrantRecordFilterInput | null,
};

export type OnDeleteGrantRecordSubscription = {
  onDeleteGrantRecord?:  {
    __typename: "GrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    grantId: string,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteProposalSubscriptionVariables = {
  filter?: ModelSubscriptionProposalFilterInput | null,
  owner?: string | null,
};

export type OnDeleteProposalSubscription = {
  onDeleteProposal?:  {
    __typename: "Proposal",
    content?: string | null,
    createdAt: string,
    grantId: string,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    sections?: string | null,
    status?: ProposalStatus | null,
    title: string,
    updatedAt: string,
    userId: string,
  } | null,
};

export type OnDeleteSearchEventSubscriptionVariables = {
  filter?: ModelSubscriptionSearchEventFilterInput | null,
};

export type OnDeleteSearchEventSubscription = {
  onDeleteSearchEvent?:  {
    __typename: "SearchEvent",
    createdAt: string,
    data?: string | null,
    eventType: string,
    id: string,
    sessionId: string,
    timestamp?: number | null,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
};

export type OnDeleteUserProfileSubscription = {
  onDeleteUserProfile?:  {
    __typename: "UserProfile",
    agencies?: Array< string | null > | null,
    budget_range?: string | null,
    collaboration_pref?: string | null,
    country?: string | null,
    createdAt: string,
    created_date?: string | null,
    default_profile?: boolean | null,
    department?: string | null,
    duration_preference?: string | null,
    early_investigator?: string | null,
    email: string,
    expertise?: Array< string | null > | null,
    expertise_level?: string | null,
    firstName?: string | null,
    fundingHistory?: Array< string | null > | null,
    geographic_scope?: string | null,
    grants_api?: string | null,
    grantsgov_filters?: string | null,
    id: string,
    institution?: string | null,
    interdisciplinary?: Array< string | null > | null,
    isActive?: boolean | null,
    keyword_string?: string | null,
    keywords?: Array< string | null > | null,
    lastName?: string | null,
    last_updated?: string | null,
    methodologies?: Array< string | null > | null,
    name?: string | null,
    optimized_keywords?: Array< string | null > | null,
    orcid_id?: string | null,
    organization?: string | null,
    position?: string | null,
    preferences?: string | null,
    preferred_languages?: Array< string | null > | null,
    preferred_programs?: Array< string | null > | null,
    researchInterests?: Array< string | null > | null,
    research_areas?: Array< string | null > | null,
    researcherType?: string | null,
    submission_deadline?: string | null,
    tech_skills?: Array< string | null > | null,
    updatedAt: string,
    use_structured_filters?: boolean | null,
    userId: string,
  } | null,
};

export type OnUpdateAgentConfigSubscriptionVariables = {
  filter?: ModelSubscriptionAgentConfigFilterInput | null,
};

export type OnUpdateAgentConfigSubscription = {
  onUpdateAgentConfig?:  {
    __typename: "AgentConfig",
    autoOn?: boolean | null,
    createdAt?: string | null,
    grantsSurfaced?: number | null,
    id: string,
    isActive?: boolean | null,
    lastRun?: string | null,
    nextRun?: string | null,
    profileSelected: string,
    storageDuration?: number | null,
    timeInterval?: number | null,
    updatedAt?: string | null,
    userId: string,
  } | null,
};

export type OnUpdateAgentDiscoveryResultSubscriptionVariables = {
  filter?: ModelSubscriptionAgentDiscoveryResultFilterInput | null,
};

export type OnUpdateAgentDiscoveryResultSubscription = {
  onUpdateAgentDiscoveryResult?:  {
    __typename: "AgentDiscoveryResult",
    configId: string,
    createdAt?: string | null,
    errorMessage?: string | null,
    executionId?: string | null,
    executionTime: string,
    grantsFound?: number | null,
    grantsStored?: number | null,
    id: string,
    metadata?: string | null,
    profileId: string,
    s3Bucket?: string | null,
    s3Key?: string | null,
    searchQuery?: string | null,
    sessionId: string,
    status: string,
    topGrants?: string | null,
    totalGrantsFound?: number | null,
    updatedAt?: string | null,
  } | null,
};

export type OnUpdateDocumentMetadataSubscriptionVariables = {
  filter?: ModelSubscriptionDocumentMetadataFilterInput | null,
  owner?: string | null,
};

export type OnUpdateDocumentMetadataSubscription = {
  onUpdateDocumentMetadata?:  {
    __typename: "DocumentMetadata",
    category?: string | null,
    contentType?: string | null,
    createdAt: string,
    documentId: string,
    errorMessage?: string | null,
    fileSize?: number | null,
    filename: string,
    metadata?: string | null,
    owner?: string | null,
    processedAt?: string | null,
    s3Bucket?: string | null,
    s3Key: string,
    status?: DocumentMetadataStatus | null,
    ttl?: number | null,
    updatedAt: string,
    uploadDate?: string | null,
    userId: string,
    vectorIndexed?: boolean | null,
  } | null,
};

export type OnUpdateEuGrantRecordSubscriptionVariables = {
  filter?: ModelSubscriptionEuGrantRecordFilterInput | null,
};

export type OnUpdateEuGrantRecordSubscription = {
  onUpdateEuGrantRecord?:  {
    __typename: "EuGrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    awardCeiling?: string | null,
    awardFloor?: number | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    euAllDeadlines?: string | null,
    euBudgetOverview?: string | null,
    euCallDetails?: string | null,
    euCallIdentifier?: string | null,
    euCallTitle?: string | null,
    euConditions?: string | null,
    euCrossCuttingPriorities?: Array< string | null > | null,
    euDeadlineModel?: string | null,
    euFrameworkProgramme?: string | null,
    euIdentifier?: string | null,
    euKeywords?: Array< string | null > | null,
    euLanguage?: string | null,
    euLatestUpdates?: string | null,
    euPortalUrl?: string | null,
    euProgrammePeriod?: string | null,
    euReference?: string | null,
    euStatus?: string | null,
    euSupportInfo?: string | null,
    euTypesOfAction?: Array< string | null > | null,
    euUrl?: string | null,
    grantId: string,
    hasDetailedInfo?: boolean | null,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateGrantRecordSubscriptionVariables = {
  filter?: ModelSubscriptionGrantRecordFilterInput | null,
};

export type OnUpdateGrantRecordSubscription = {
  onUpdateGrantRecord?:  {
    __typename: "GrantRecord",
    agency?: string | null,
    amount?: number | null,
    applicationProcess?: string | null,
    createdAt?: string | null,
    deadline?: string | null,
    description?: string | null,
    eligibility?: string | null,
    grantId: string,
    id: string,
    keywordScore?: number | null,
    matchedKeywords?: Array< string | null > | null,
    profileMatchScore?: number | null,
    relevanceScore?: number | null,
    sessionId: string,
    source?: string | null,
    tags?: Array< string | null > | null,
    title: string,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateProposalSubscriptionVariables = {
  filter?: ModelSubscriptionProposalFilterInput | null,
  owner?: string | null,
};

export type OnUpdateProposalSubscription = {
  onUpdateProposal?:  {
    __typename: "Proposal",
    content?: string | null,
    createdAt: string,
    grantId: string,
    id: string,
    metadata?: string | null,
    owner?: string | null,
    sections?: string | null,
    status?: ProposalStatus | null,
    title: string,
    updatedAt: string,
    userId: string,
  } | null,
};

export type OnUpdateSearchEventSubscriptionVariables = {
  filter?: ModelSubscriptionSearchEventFilterInput | null,
};

export type OnUpdateSearchEventSubscription = {
  onUpdateSearchEvent?:  {
    __typename: "SearchEvent",
    createdAt: string,
    data?: string | null,
    eventType: string,
    id: string,
    sessionId: string,
    timestamp?: number | null,
    ttl?: number | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
};

export type OnUpdateUserProfileSubscription = {
  onUpdateUserProfile?:  {
    __typename: "UserProfile",
    agencies?: Array< string | null > | null,
    budget_range?: string | null,
    collaboration_pref?: string | null,
    country?: string | null,
    createdAt: string,
    created_date?: string | null,
    default_profile?: boolean | null,
    department?: string | null,
    duration_preference?: string | null,
    early_investigator?: string | null,
    email: string,
    expertise?: Array< string | null > | null,
    expertise_level?: string | null,
    firstName?: string | null,
    fundingHistory?: Array< string | null > | null,
    geographic_scope?: string | null,
    grants_api?: string | null,
    grantsgov_filters?: string | null,
    id: string,
    institution?: string | null,
    interdisciplinary?: Array< string | null > | null,
    isActive?: boolean | null,
    keyword_string?: string | null,
    keywords?: Array< string | null > | null,
    lastName?: string | null,
    last_updated?: string | null,
    methodologies?: Array< string | null > | null,
    name?: string | null,
    optimized_keywords?: Array< string | null > | null,
    orcid_id?: string | null,
    organization?: string | null,
    position?: string | null,
    preferences?: string | null,
    preferred_languages?: Array< string | null > | null,
    preferred_programs?: Array< string | null > | null,
    researchInterests?: Array< string | null > | null,
    research_areas?: Array< string | null > | null,
    researcherType?: string | null,
    submission_deadline?: string | null,
    tech_skills?: Array< string | null > | null,
    updatedAt: string,
    use_structured_filters?: boolean | null,
    userId: string,
  } | null,
};
