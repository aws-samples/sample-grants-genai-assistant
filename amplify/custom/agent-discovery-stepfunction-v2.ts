import { Construct } from 'constructs';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';

interface AgentDiscoveryStepFunctionV2Props {
    agentDiscoverySearchFunction: lambda.IFunction;
    agentDiscoveryUpdateFunction: lambda.IFunction;
}

export class AgentDiscoveryStepFunctionV2 extends Construct {
    public readonly stateMachine: stepfunctions.StateMachine;

    constructor(scope: Construct, id: string, props: AgentDiscoveryStepFunctionV2Props) {
        super(scope, id);

        // Reference Lambdas by ARN to avoid Amplify Gen 2 runtime validation bug
        const searchFunctionRef = lambda.Function.fromFunctionArn(
            this,
            'SearchFunctionRef',
            props.agentDiscoverySearchFunction.functionArn
        );

        const updateFunctionRef = lambda.Function.fromFunctionArn(
            this,
            'UpdateFunctionRef',
            props.agentDiscoveryUpdateFunction.functionArn
        );

        // Step 1: Check if agent discovery should run
        const checkAgentConfigTask = new stepfunctionsTasks.LambdaInvoke(this, 'CheckAgentConfig', {
            lambdaFunction: searchFunctionRef,
            payload: stepfunctions.TaskInput.fromObject({
                action: 'checkConfig',
                source: 'stepfunction',
                input: stepfunctions.JsonPath.objectAt('$.input')  // Pass only the inner input field
            }),
            resultPath: '$.configCheck',
            timeout: Duration.minutes(2)
        });

        // Step 2: Invoke 6 parallel searches (3 US + 3 EU)
        // Each search invokes processor via SQS, which writes to DDB
        const invokeSearchesTask = new stepfunctionsTasks.LambdaInvoke(this, 'InvokeParallelSearches', {
            lambdaFunction: searchFunctionRef,
            payload: stepfunctions.TaskInput.fromObject({
                action: 'invokeSearches',
                source: 'stepfunction',
                configId: stepfunctions.JsonPath.stringAt('$.configCheck.Payload.configId'),
                userId: stepfunctions.JsonPath.stringAt('$.configCheck.Payload.userId'),
                queries: stepfunctions.JsonPath.objectAt('$.configCheck.Payload.queries'),
                timestamp: stepfunctions.JsonPath.numberAt('$.configCheck.Payload.timestamp'),
                input: stepfunctions.JsonPath.objectAt('$')
            }),
            resultPath: '$.searchesResult',
            timeout: Duration.minutes(10) // Allow time for all 6 searches to complete
        });

        // Step 2.5: Wait for processors to write to DDB
        // Both US and EU searches now read from local/S3 cache — no slow external API calls.
        // AgentCore containers complete in ~30-60s each. 180s gives generous buffer for
        // cold starts and 6 parallel containers writing to DDB.
        const waitForProcessors = new stepfunctions.Wait(this, 'WaitForProcessors', {
            time: stepfunctions.WaitTime.duration(Duration.seconds(120))
        });

        // Step 3: Consolidate results from both DDB tables
        const consolidateResultsTask = new stepfunctionsTasks.LambdaInvoke(this, 'ConsolidateResults', {
            lambdaFunction: searchFunctionRef,
            payload: stepfunctions.TaskInput.fromObject({
                action: 'consolidate',
                source: 'stepfunction',
                configId: stepfunctions.JsonPath.stringAt('$.configCheck.Payload.configId'),
                userId: stepfunctions.JsonPath.stringAt('$.configCheck.Payload.userId'),
                timestamp: stepfunctions.JsonPath.numberAt('$.configCheck.Payload.timestamp'),
                grantsSurfaced: stepfunctions.JsonPath.numberAt('$.configCheck.Payload.grantsSurfaced'),
                usSessionIds: stepfunctions.JsonPath.objectAt('$.searchesResult.Payload.usSessionIds'),
                euSessionIds: stepfunctions.JsonPath.objectAt('$.searchesResult.Payload.euSessionIds')
            }),
            resultPath: '$.consolidationResult',
            timeout: Duration.minutes(5)
        });

        // Step 4: Update config with lastRun timestamp
        const updateConfigTask = new stepfunctionsTasks.LambdaInvoke(this, 'UpdateConfig', {
            lambdaFunction: updateFunctionRef,
            payload: stepfunctions.TaskInput.fromObject({
                configId: stepfunctions.JsonPath.stringAt('$.configCheck.Payload.configId'),
                timestamp: stepfunctions.JsonPath.numberAt('$.configCheck.Payload.timestamp'),
                executionId: stepfunctions.JsonPath.stringAt('$$.Execution.Name'),
                source: 'stepfunction'
            }),
            resultPath: '$.updateResult',
            timeout: Duration.minutes(2)
        });

        // Define choice: should run or skip
        const shouldRunChoice = new stepfunctions.Choice(this, 'ShouldRun')
            .when(
                stepfunctions.Condition.booleanEquals('$.configCheck.Payload.shouldRun', true),
                invokeSearchesTask
                    .next(waitForProcessors)
                    .next(consolidateResultsTask)
                    .next(updateConfigTask)
            )
            .otherwise(
                new stepfunctions.Pass(this, 'SkipExecution', {
                    result: stepfunctions.Result.fromObject({
                        message: 'No agent configs are due to run',
                        skipped: true
                    })
                })
            );

        // Define the state machine
        const definition = checkAgentConfigTask.next(shouldRunChoice);

        // Create IAM role for Step Function
        const stepFunctionRole = new iam.Role(this, 'StepFunctionRole', {
            assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
            inlinePolicies: {
                LambdaInvokePolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['lambda:InvokeFunction'],
                            resources: [
                                props.agentDiscoverySearchFunction.functionArn,
                                props.agentDiscoveryUpdateFunction.functionArn
                            ]
                        })
                    ]
                })
            }
        });

        // Create the Step Function
        this.stateMachine = new stepfunctions.StateMachine(this, 'AgentDiscoveryStateMachineV2', {
            definition,
            role: stepFunctionRole,
            timeout: Duration.minutes(8), // 2 min wait + ~30s work + buffer
            tracingEnabled: true,
            logs: {
                destination: new logs.LogGroup(this, 'StepFunctionLogsV2'),
                level: stepfunctions.LogLevel.ALL,
                includeExecutionData: true
            }
        });

        // Suppress CDK-Nag findings for Step Function role wildcards
        // Multiple wildcards exist in this policy - omit appliesTo to suppress all
        const defaultPolicy = stepFunctionRole.node.findChild('DefaultPolicy') as iam.Policy;

        NagSuppressions.addResourceSuppressions(
            defaultPolicy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Step Functions role contains AWS service-required wildcards: (1) Lambda version wildcards (:*) automatically added by CDK LambdaInvoke task for versioning/aliases - scoped to specific functions (AgentDiscoverySearchFunction, AgentDiscoveryUpdateFunction), (2) CloudWatch Logs delivery actions (CreateLogDelivery, GetLogDelivery, etc.) do not support resource-level permissions per AWS API design, (3) X-Ray tracing actions (PutTraceSegments, PutTelemetryRecords, etc.) do not support resource-level permissions. All wildcards are AWS framework requirements.'
                    // NO appliesTo - suppresses all IAM5 findings for this policy
                }
            ],
            true
        );
    }
}
