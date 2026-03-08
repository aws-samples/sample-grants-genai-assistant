import { defineFunction } from '@aws-amplify/backend';

export const opensearchIndexCreator = defineFunction({
  name: 'opensearch-index-creator',
  timeoutSeconds: 300,
  memoryMB: 512,
  // Note: Runtime is determined by handler file extension (.py = Python 3.12)
});
