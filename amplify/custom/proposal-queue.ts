import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Duration } from 'aws-cdk-lib';

/**
 * SQS Queue for Proposal Generation
 * 
 * This queue decouples the proposal initiator from the processor:
 * - Initiator Lambda sends messages here
 * - Processor Lambda is triggered by messages
 * - Dead Letter Queue handles failures
 * 
 * Exported as a module-level variable to match the pattern used by
 * grants-search-processor and eu-grants-search-processor
 */

// Export the queue so it can be accessed in backend.ts
export let proposalQueue: sqs.Queue;
export let proposalDLQ: sqs.Queue;

export function createProposalQueue(scope: Construct) {
  // Dead Letter Queue for failed messages
  proposalDLQ = new sqs.Queue(scope, 'ProposalGenerationDLQ', {
    queueName: 'proposal-generation-dlq',
    retentionPeriod: Duration.days(14), // Keep failed messages for 2 weeks
    encryption: sqs.QueueEncryption.SQS_MANAGED,
  });

  // Main proposal generation queue
  proposalQueue = new sqs.Queue(scope, 'ProposalGenerationQueue', {
    queueName: 'proposal-generation-queue',
    
    // Visibility timeout: How long a message is hidden after being received
    // Set to 15 minutes (900 seconds) to allow for long-running proposal generation
    visibilityTimeout: Duration.minutes(15),
    
    // Message retention: How long messages stay in queue if not processed
    retentionPeriod: Duration.days(4),
    
    // Receive wait time: Long polling to reduce empty receives
    receiveMessageWaitTime: Duration.seconds(20),
    
    // Dead letter queue configuration
    deadLetterQueue: {
      queue: proposalDLQ,
      maxReceiveCount: 3, // After 3 failed attempts, move to DLQ
    },
    
    // Encryption
    encryption: sqs.QueueEncryption.SQS_MANAGED,
  });

  return proposalQueue;
}
