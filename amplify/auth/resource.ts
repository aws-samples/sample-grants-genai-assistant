import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  // Note: Password policy is configured in backend.ts via CDK L1 construct
  // Amplify Gen2 doesn't expose passwordPolicy in defineAuth API
});
