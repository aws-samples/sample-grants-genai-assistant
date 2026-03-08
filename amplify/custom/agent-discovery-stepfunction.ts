import { Construct } from 'constructs';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib';

interface AgentDiscoveryStepFunctionProps {
  agentDiscoverySearchFunction: lambda.IFunction;
  agentDiscoveryUpdateFunction: lambda.IFunction;
}

export class AgentDiscoveryStepFunction extends Construct {
  public readonly stateMachine: stepfunctions.StateMachine;

  constructor(scope: Construct, id: string, props: AgentDiscoveryStepFunctionProps) {
    super(scope, id);

    // WORKAROUND: Reference Lambdas by ARN to avoid Amplify Gen 2 runtime validation bug
    // The validation incorrectly checks Python Lambda runtimes when they're passed to Step Functions
    // Using fromFunctionArn breaks the type checking that causes the error
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

    // Define the Step Function tasks
    const checkAgentConfigTask = new stepfunctionsTasks.LambdaInvoke(this, 'CheckAgentConfig', {
      lambdaFunction: searchFunctionRef,
      payload: stepfunctions.TaskInput.fromObject({
        action: 'checkConfig',
        source: 'stepfunction',
        input: stepfunctions.JsonPath.objectAt('$') // Pass entire input object so forceRun is accessible
      }),
      resultPath: '$.configCheck',
      timeout: Duration.minutes(2)
    });

    const executeDiscoveryTask = new stepfunctionsTasks.LambdaInvoke(this, 'ExecuteDiscovery', {
      lambdaFunction: searchFunctionRef,
      payload: stepfunctions.TaskInput.fromObject({
        action: 'executeDiscovery',
        source: 'stepfunction',
        configId: stepfunctions.JsonPath.stringAt('$.configCheck.Payload.configId'),
        input: stepfunctions.JsonPath.objectAt('$') // Pass entire input object
      }),
      resultPath: '$.discoveryResult',
      timeout: Duration.minutes(2)
    });

    // Update config with lastRun timestamp
    // Note: Results will be stored in S3 by the event-driven trigger Lambda
    // when the GRANTS_FOUND event is detected in DynamoDB Stream
    const updateConfigTask = new stepfunctionsTasks.LambdaInvoke(this, 'UpdateConfig', {
      lambdaFunction: updateFunctionRef,
      payload: stepfunctions.TaskInput.fromObject({
        configId: stepfunctions.JsonPath.stringAt('$.configCheck.Payload.configId'),
        sessionId: stepfunctions.JsonPath.stringAt('$.discoveryResult.Payload.sessionId'),
        usSessionIds: stepfunctions.JsonPath.stringAt('$.discoveryResult.Payload.usSessionIds'),
        euSessionIds: stepfunctions.JsonPath.stringAt('$.discoveryResult.Payload.euSessionIds'),
        executionId: stepfunctions.JsonPath.stringAt('$$.Execution.Name'),
        source: 'stepfunction'
      }),
      resultPath: '$.updateResult',
      timeout: Duration.minutes(2)
    });

    // Define choice conditions
    const shouldRunChoice = new stepfunctions.Choice(this, 'ShouldRun')
      .when(
        stepfunctions.Condition.booleanEquals('$.configCheck.Payload.shouldRun', true),
        executeDiscoveryTask.next(updateConfigTask)
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
    this.stateMachine = new stepfunctions.StateMachine(this, 'AgentDiscoveryStateMachine', {
      definition,
      role: stepFunctionRole,
      timeout: Duration.minutes(15),
      tracingEnabled: true,
      logs: {
        destination: new logs.LogGroup(this, 'StepFunctionLogs'),
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true
      }
    });
  }
}
