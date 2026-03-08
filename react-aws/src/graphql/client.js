/**
 * Apollo Client Configuration for GraphQL Grant Platform
 */

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// GraphQL API Configuration (loaded from amplify_outputs.json)
// Import amplify_outputs to get API configuration dynamically
import amplifyOutputs from '../../amplify_outputs.json';

const GRAPHQL_CONFIG = {
  httpEndpoint: amplifyOutputs.data?.url || 'https://3kdlhhfsivgoxfajgk7qesnuqu.appsync-api.us-east-1.amazonaws.com/graphql',
  wsEndpoint: amplifyOutputs.data?.url?.replace('appsync-api', 'appsync-realtime-api').replace('https://', 'wss://') || 'wss://3kdlhhfsivgoxfajgk7qesnuqu.appsync-realtime-api.us-east-1.amazonaws.com/graphql',
  apiKey: amplifyOutputs.data?.api_key || process.env.REACT_APP_APPSYNC_API_KEY, // Load from amplify_outputs or env var
  region: amplifyOutputs.data?.aws_region || 'us-east-1'
};

// HTTP Link for queries and mutations
const httpLink = createHttpLink({
  uri: GRAPHQL_CONFIG.httpEndpoint,
});

// Note: WebSocket subscriptions removed - using HTTP-based SearchEvent subscriptions instead

// Auth Link - use Amplify's built-in auth instead of hardcoded API key
const authLink = setContext(async (_, { headers }) => {
  try {
    // Try to get Amplify auth token
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();

    if (token) {
      return {
        headers: {
          ...headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      };
    }
  } catch (error) {
    console.log('No auth token, falling back to API key');
  }

  // Fallback to API key if no auth token
  return {
    headers: {
      ...headers,
      'x-api-key': GRAPHQL_CONFIG.apiKey,
      'Content-Type': 'application/json',
    }
  };
});

// Use HTTP for all operations (including subscriptions via polling)
// SearchEvent subscriptions work over HTTP, not WebSocket
const httpOnlyLink = authLink.concat(httpLink);

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: httpOnlyLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cache policy for user profiles
          getUserProfile: {
            keyArgs: ['userId'],
          },
        },
      },
      // Grant search results are not cached to ensure fresh data
      Grant: {
        keyFields: ['id'],
      },
      Proposal: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Helper function to generate session IDs (minimum 33 characters for Bedrock AgentCore)
export const generateSessionId = () => {
  // Generate timestamp (13 chars) + random parts to ensure 33+ character minimum
  const timestamp = Date.now().toString();
  const random1 = Math.random().toString(36).substring(2, 15); // 13 chars
  const random2 = Math.random().toString(36).substring(2, 15); // 13 chars

  // Format: search_[timestamp]_[random1][random2] = 7 + 13 + 1 + 13 + 13 = 47 chars (well over 33)
  return `search_${timestamp}_${random1}${random2}`;
};

// Export configuration for use in components
export { GRAPHQL_CONFIG };