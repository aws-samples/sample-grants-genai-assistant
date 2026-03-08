/**
 * GROW2 Data Schema
 * Last updated: 2026-01-28
 */
/**
 * GROW2 Data Schema - Last cleanup: 2026-01-28
 */
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { grantsSearchV2 } from '../functions/grants-search-v2/resource';
import { euGrantsSearchV2 } from '../functions/eu-grants-search-v2/resource';
import { agentDiscoverySearch } from '../functions/agent-discovery-search/resource';
import { agentDiscoveryUpdate } from '../functions/agent-discovery-update/resource';
import { s3BucketOperations } from '../functions/s3-bucket-operations/resource';
import { chatHandler } from '../functions/chat-handler/resource';
import { kbDocumentUpload } from '../functions/kb-document-upload/resource';
import { kbSearch } from '../functions/kb-search/resource';
import { kbDocumentManager } from '../functions/kb-document-manager/resource';
import { promptManager } from '../functions/prompt-manager/resource';
import { proposalsQuery } from '../functions/proposals-query/resource';
import { proposalGenerationAgentcore } from '../functions/proposal-generation-agentcore/resource';
import { proposalDownload } from '../functions/proposal-download/resource';

const schema = a
  .schema({
    UserProfile: a
      .model({
        userId: a.string().required(),
        email: a.string().required(),

        // Basic Information
        name: a.string(),
        firstName: a.string(),
        lastName: a.string(),
        institution: a.string(),
        department: a.string(),
        position: a.string(),
        organization: a.string(),

        // Critical Bayesian Matching Fields
        researcherType: a.string(), // e.g., "biomedical", "engineering", "computer_science"
        expertise_level: a.string(), // "expert", "advanced", "intermediate", "beginner"
        early_investigator: a.string(), // "True" or "False"
        keywords: a.string().array(), // Keywords for Bayesian matching
        optimized_keywords: a.string().array(), // Optimized keywords for better matching
        research_areas: a.string().array(), // Research areas for domain matching
        agencies: a.string().array(), // Preferred agencies: ["NIH", "NSF", "DOD"]

        // Additional Profile Fields
        researchInterests: a.string().array(),
        expertise: a.string().array(),
        fundingHistory: a.string().array(),
        tech_skills: a.string().array(),
        methodologies: a.string().array(),
        interdisciplinary: a.string().array(),

        // Preferences and Settings
        preferences: a.json(),
        budget_range: a.string(),
        collaboration_pref: a.string(),
        duration_preference: a.string(),
        geographic_scope: a.string(),
        country: a.string(),

        // Grants.gov specific filters
        grantsgov_filters: a.json(),
        grants_api: a.string(),
        keyword_string: a.string(),
        preferred_languages: a.string().array(),
        preferred_programs: a.string().array(),
        submission_deadline: a.string(),
        use_structured_filters: a.boolean(),

        // Metadata
        isActive: a.boolean().default(false), // Indicates current active profile for Bayesian matching
        default_profile: a.boolean().default(false), // Indicates this is the default profile for all users
        created_date: a.string(),
        last_updated: a.string(),
        orcid_id: a.string(),
      })
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    Proposal: a
      .model({
        userId: a.string().required(),
        grantId: a.string().required(),
        title: a.string().required(),
        status: a.enum(['DRAFT', 'IN_PROGRESS', 'GENERATING', 'QUEUED', 'COMPLETED', 'SUBMITTED', 'FAILED', 'PROCESSING']),
        content: a.string(),
        sections: a.json(),
        metadata: a.json(),
        currentStep: a.string(),
        progress: a.integer().default(0),
        promptId: a.string(),
        errorMessage: a.string(),
        completedAt: a.datetime(),
      })
      .authorization((allow) => [
        allow.authenticated(),
        allow.publicApiKey()
      ])
      .secondaryIndexes((index) => [
        index('userId').queryField('proposalsByUser'),
        index('grantId').queryField('proposalsByGrant'),
      ]),

    // Real-time search events model for subscriptions
    SearchEvent: a
      .model({
        sessionId: a.string().required(),
        eventType: a.string().required(), // 'progress', 'result', 'complete', 'error'
        data: a.json(),
        timestamp: a.timestamp(),
        ttl: a.integer(), // TTL in epoch seconds (3 days from creation)
      })
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    // Grant records from search results (US grants)
    GrantRecord: a
      .model({
        sessionId: a.string().required(),
        grantId: a.string().required(),
        title: a.string().required(),
        agency: a.string(),
        amount: a.float(),
        deadline: a.string(),
        description: a.string(),
        eligibility: a.string(),
        applicationProcess: a.string(),
        source: a.string(),
        relevanceScore: a.float(),
        profileMatchScore: a.float(),  // Bayesian score with user profile
        keywordScore: a.float(),       // Keyword-only score
        matchedKeywords: a.string().array(),
        tags: a.string().array(),
        createdAt: a.datetime(),
        ttl: a.integer(), // TTL in epoch seconds (3 days from creation)
      })
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
      .secondaryIndexes((index) => [
        index('sessionId').queryField('grantRecordsBySession'),
      ]),

    // EU Grant records from search results
    EuGrantRecord: a
      .model({
        sessionId: a.string().required(),
        grantId: a.string().required(),
        title: a.string().required(),
        agency: a.string(),
        amount: a.float(),
        awardCeiling: a.string(), // EU grants: "Contact programme" or specific amount
        awardFloor: a.float(),
        deadline: a.string(),
        description: a.string(),
        eligibility: a.string(),
        applicationProcess: a.string(),
        source: a.string(),
        relevanceScore: a.float(),
        profileMatchScore: a.float(),  // Bayesian score with user profile
        keywordScore: a.float(),       // Keyword-only score
        matchedKeywords: a.string().array(),
        tags: a.string().array(),

        // EU-specific fields
        euReference: a.string(),
        euIdentifier: a.string(),
        euCallIdentifier: a.string(),
        euCallTitle: a.string(),
        euFrameworkProgramme: a.string(),
        euProgrammePeriod: a.string(),
        euStatus: a.string(),
        euDeadlineModel: a.string(),
        euKeywords: a.string().array(),
        euCrossCuttingPriorities: a.string().array(),
        euTypesOfAction: a.string().array(),
        euLanguage: a.string(),
        euUrl: a.string(),

        // NEW: Topic Details API fields (rich grant data)
        hasDetailedInfo: a.boolean(), // True when we have Topic Details API data
        euConditions: a.string(), // Grant conditions (HTML cleaned)
        euSupportInfo: a.string(), // Support and contact info
        euLatestUpdates: a.json(), // Array of latest update objects
        euAllDeadlines: a.json(), // All deadlines from all actions
        euBudgetOverview: a.json(), // Budget details (JSON)
        euCallDetails: a.json(), // Call-level details (JSON)
        euPortalUrl: a.string(), // Direct portal URL

        createdAt: a.datetime(),
        ttl: a.integer(), // TTL in epoch seconds (3 days from creation)
      })
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
      .secondaryIndexes((index) => [
        index('sessionId').queryField('euGrantRecordsBySession'),
      ]),

    // Agent Configuration for automated grant discovery
    AgentConfig: a
      .model({
        userId: a.string().required(),
        timeInterval: a.integer().default(24), // Hours between searches (default 24)
        grantsSurfaced: a.integer().default(2), // Number of grants to surface (default 2)
        autoOn: a.boolean().default(true), // Whether agent is active
        profileSelected: a.string().required(), // DDB ID from UserProfile table (e.g., "jp_the_researcher")
        storageDuration: a.integer().default(7), // Days to keep grants (default 7)
        lastRun: a.datetime(), // When agent last ran
        nextRun: a.datetime(), // When agent should run next
        isActive: a.boolean().default(true), // Whether this config is active
        createdAt: a.datetime(),
        updatedAt: a.datetime(),
      })
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
      .secondaryIndexes((index) => [
        index('userId').queryField('agentConfigsByUser'),
      ]),

    // Agent Discovery Results - REMOVED: System uses S3 directly, not DynamoDB
    // Results are stored in S3 and accessed via listDiscoveryResults GraphQL query

    // Document Metadata for Knowledge Base
    DocumentMetadata: a
      .model({
        documentId: a.string().required(),
        userId: a.string().required(),
        filename: a.string().required(),
        contentType: a.string(),
        fileSize: a.integer(),
        category: a.string(),
        s3Key: a.string().required(),
        s3Bucket: a.string(),

        // Status tracking fields
        status: a.enum(['uploading', 'processing', 'ready', 'failed']),
        errorMessage: a.string(),

        // Metadata
        uploadDate: a.datetime(),
        processedAt: a.datetime(),
        vectorIndexed: a.boolean().default(false),
        metadata: a.json(),

        // TTL for cleanup (optional)
        ttl: a.integer(),
      })
      .authorization((allow) => [allow.owner()])
      .identifier(['userId', 'documentId'])
      .secondaryIndexes((index) => [
        index('userId').sortKeys(['status']).queryField('listDocumentsByStatus'),
        index('userId').sortKeys(['uploadDate']).queryField('listDocumentsByDate'),
      ]),

    // GraphQL Mutations
    // V2: AgentCore-native async search (no SQS, no processor Lambda)
    startGrantSearchV2: a
      .mutation()
      .arguments({
        input: a.json().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(grantsSearchV2))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    startEuGrantSearchV2: a
      .mutation()
      .arguments({
        input: a.json().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(euGrantsSearchV2))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    // Agent Discovery Mutations
    triggerAgentDiscovery: a
      .mutation()
      .arguments({
        configId: a.string().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(agentDiscoverySearch))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    processAgentDiscoveryUpdate: a
      .mutation()
      .arguments({
        input: a.json().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(agentDiscoveryUpdate))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    // S3 Bucket Operations
    listDiscoveryResults: a
      .query()
      .returns(a.json())
      .handler(a.handler.function(s3BucketOperations))
      .authorization((allow) => [allow.authenticated()]),

    getDiscoveryResultDownloadUrl: a
      .query()
      .arguments({
        key: a.string().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(s3BucketOperations))
      .authorization((allow) => [allow.authenticated()]),

    getDiscoveryResultContent: a
      .query()
      .arguments({
        key: a.string().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(s3BucketOperations))
      .authorization((allow) => [allow.authenticated()]),

    // Chat functionality - custom types and operations

    ChatToolCall: a.customType({
      toolName: a.string().required(),
      parameters: a.json(),
      result: a.string(),
    }),

    ChatMessageResponse: a.customType({
      sessionId: a.string().required(),
      messageId: a.string().required(),
      content: a.string().required(),
      isComplete: a.boolean().required(),
      toolCalls: a.ref('ChatToolCall').array(),
    }),

    ChatMessage: a.customType({
      messageId: a.string().required(),
      role: a.string().required(),
      content: a.string().required(),
      timestamp: a.string().required(),
      toolCalls: a.ref('ChatToolCall').array(),
    }),

    ChatSession: a.customType({
      sessionId: a.string().required(),
      userId: a.string().required(),
      userEmail: a.string().required(),
      createdAt: a.string().required(),
      updatedAt: a.string().required(),
      messages: a.ref('ChatMessage').array(),
      context: a.json(),
      summary: a.string(),
    }),

    ChatSessionSummary: a.customType({
      sessionId: a.string().required(),
      userEmail: a.string().required(),
      createdAt: a.string().required(),
      updatedAt: a.string().required(),
      summary: a.string(),
    }),

    sendChatMessage: a
      .mutation()
      .arguments({
        sessionId: a.string(),
        message: a.string().required(),
      })
      .returns(a.ref('ChatMessageResponse'))
      .handler(a.handler.function(chatHandler))
      .authorization((allow) => [allow.authenticated()]),

    getChatSession: a
      .query()
      .arguments({
        sessionId: a.string().required(),
      })
      .returns(a.ref('ChatSession'))
      .handler(a.handler.function(chatHandler))
      .authorization((allow) => [allow.authenticated()]),

    listUserChatSessions: a
      .query()
      .arguments({
        limit: a.integer(),
        nextToken: a.string(),
      })
      .returns(a.ref('ChatSessionSummary').array())
      .handler(a.handler.function(chatHandler))
      .authorization((allow) => [allow.authenticated()]),

    // Knowledge Base Document Upload - custom types and operations

    // Enhanced metadata for grant guidelines
    GrantMetadata: a.customType({
      agency: a.string(),
      grantType: a.string(),
      section: a.string(),
      documentType: a.string(),
      year: a.string(),
      version: a.string(),
    }),

    UploadDocument: a.customType({
      filename: a.string().required(),
      contentType: a.string().required(),
      fileSize: a.integer().required(),
      category: a.string(),
      agency: a.string(), // Agency for content documents (NSF, NIH, etc.)
      grantMetadata: a.ref('GrantMetadata'), // Enhanced metadata for grant guidelines
    }),

    UploadDocumentResponse: a.customType({
      documentId: a.string().required(),
      uploadUrl: a.string().required(),
      status: a.string().required(),
      s3Key: a.string().required(),
      s3Bucket: a.string().required(),
      expiresIn: a.integer().required(),
    }),

    uploadDocument: a
      .mutation()
      .arguments({
        input: a.ref('UploadDocument').required(),
      })
      .returns(a.ref('UploadDocumentResponse'))
      .handler(a.handler.function(kbDocumentUpload))
      .authorization((allow) => [allow.authenticated()]),

    // Knowledge Base Search - custom types and operations

    SearchFilters: a.customType({
      category: a.string(),
      dateRange: a.ref('DateRangeInput'),
      // Grant-specific filters
      agency: a.string(),
      grantType: a.string(),
      section: a.string(),
      documentType: a.string(),
      year: a.string(),
    }),

    DateRangeInput: a.customType({
      start: a.datetime(),
      end: a.datetime(),
    }),

    SearchResult: a.customType({
      documentId: a.string().required(),
      filename: a.string().required(),
      excerpt: a.string().required(),
      relevanceScore: a.float().required(),
      metadata: a.json(),
    }),

    SearchResponse: a.customType({
      results: a.ref('SearchResult').array().required(),
      total: a.integer().required(),
    }),

    searchDocuments: a
      .query()
      .arguments({
        query: a.string().required(),
        filters: a.ref('SearchFilters'),
        limit: a.integer(),
        offset: a.integer(),
      })
      .returns(a.ref('SearchResponse'))
      .handler(a.handler.function(kbSearch))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    // Knowledge Base Document Management - custom types and operations

    ListDocumentsInput: a.customType({
      filters: a.ref('SearchFilters'),
      limit: a.integer(),
      offset: a.integer(),
    }),

    deleteDocument: a
      .mutation()
      .arguments({
        documentId: a.string().required(),
      })
      .returns(a.boolean())
      .handler(a.handler.function(kbDocumentManager))
      .authorization((allow) => [allow.authenticated()]),

    listDocuments: a
      .query()
      .arguments({
        filters: a.ref('SearchFilters'),
        limit: a.integer(),
        offset: a.integer(),
      })
      .returns(a.json())
      .handler(a.handler.function(kbDocumentManager))
      .authorization((allow) => [allow.authenticated()]),

    getDocument: a
      .query()
      .arguments({
        documentId: a.string().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(kbDocumentManager))
      .authorization((allow) => [allow.authenticated()]),

    // Document Status Update (for real-time notifications)
    UpdateDocumentStatusInput: a.customType({
      documentId: a.string().required(),
      userId: a.string().required(),
      filename: a.string().required(),
      status: a.string().required(),
      errorMessage: a.string(),
      updatedAt: a.datetime().required(),
      vectorIndexed: a.boolean(),
    }),

    updateDocumentStatus: a
      .mutation()
      .arguments({
        input: a.ref('UpdateDocumentStatusInput').required(),
      })
      .returns(a.json())
      .handler(a.handler.function(kbDocumentManager))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    // Real-time subscription for document status changes
    onDocumentStatusChanged: a
      .subscription()
      .for(a.ref('updateDocumentStatus'))
      .handler(a.handler.function(kbDocumentManager))
      .authorization((allow) => [allow.authenticated()]),

    // Proposal Generation Tables
    ProposalContent: a
      .model({
        proposalId: a.string().required(),
        sectionId: a.string().required(), // abstract, aims, methods, etc.
        content: a.string().required(),
        wordCount: a.integer(),
        version: a.integer().default(1),
        promptUsed: a.string(),
        generatedAt: a.datetime().required(),
        s3Key: a.string(),
      })
      .identifier(['proposalId', 'sectionId'])
      .authorization((allow) => [
        allow.authenticated().to(['read', 'create', 'update', 'delete']),
      ])
      .secondaryIndexes((index) => [
        index('proposalId').sortKeys(['version']).queryField('contentByVersion'),
      ]),

    ProposalVersion: a
      .model({
        proposalId: a.string().required(),
        version: a.integer().required(),
        userId: a.string().required(),
        changes: a.string(),
        s3Key: a.string(),
        metadata: a.json(),
        createdAt: a.datetime().required(),
      })
      .identifier(['proposalId', 'version'])
      .authorization((allow) => [
        allow.authenticated().to(['read', 'create']),
      ]),

    // GraphQL Queries - V1 grant details queries removed (use V2 search instead)

    // Prompt Management - using json() for simplicity since these are pass-through from Bedrock
    listPrompts: a
      .query()
      .returns(a.json())
      .handler(a.handler.function(promptManager))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    getPrompt: a
      .query()
      .arguments({
        promptId: a.string().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(promptManager))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    testPrompt: a
      .query()
      .arguments({
        promptId: a.string().required(),
        testInput: a.json().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(promptManager))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    // Proposal Generation - AgentCore Native (No SQS)
    generateProposal: a
      .mutation()
      .arguments({
        input: a.json().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(proposalGenerationAgentcore))
      .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),

    // Proposal Queries
    listProposalsByUser: a
      .query()
      .arguments({
        userId: a.string().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(proposalsQuery))
      .authorization((allow) => [allow.authenticated()]),

    // Download proposal file (HTML or PDF) via Lambda proxy
    // Eliminates presigned URL issues by streaming S3 content directly
    downloadProposal: a
      .query()
      .arguments({
        proposalId: a.string().required(),
        format: a.string().required(), // 'html' or 'pdf'
      })
      .returns(a.json())
      .handler(a.handler.function(proposalDownload))
      .authorization((allow) => [allow.authenticated()]),

  });

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});