import { Stack, Duration } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface KBMonitoringDashboardProps {
  uploadFunction: lambda.IFunction;
  processorFunction: lambda.IFunction;
  searchFunction: lambda.IFunction;
  documentManagerFunction: lambda.IFunction;
}

export function createKBMonitoringDashboard(
  stack: Stack,
  props: KBMonitoringDashboardProps
): cloudwatch.Dashboard {
  const dashboard = new cloudwatch.Dashboard(stack, 'KBMonitoringDashboard', {
    dashboardName: 'KnowledgeBase-Monitoring',
  });

  // Lambda Metrics Row
  dashboard.addWidgets(
    new cloudwatch.GraphWidget({
      title: 'Lambda Invocations',
      left: [
        props.uploadFunction.metricInvocations({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.processorFunction.metricInvocations({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.searchFunction.metricInvocations({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.documentManagerFunction.metricInvocations({ statistic: 'Sum', period: Duration.minutes(5) }),
      ],
      width: 12,
    }),
    new cloudwatch.GraphWidget({
      title: 'Lambda Errors',
      left: [
        props.uploadFunction.metricErrors({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.processorFunction.metricErrors({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.searchFunction.metricErrors({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.documentManagerFunction.metricErrors({ statistic: 'Sum', period: Duration.minutes(5) }),
      ],
      width: 12,
    })
  );

  // Performance Metrics Row
  dashboard.addWidgets(
    new cloudwatch.GraphWidget({
      title: 'Lambda Duration (p50, p95, p99)',
      left: [
        props.uploadFunction.metricDuration({ statistic: 'p50', period: Duration.minutes(5) }),
        props.uploadFunction.metricDuration({ statistic: 'p95', period: Duration.minutes(5) }),
        props.uploadFunction.metricDuration({ statistic: 'p99', period: Duration.minutes(5) }),
      ],
      width: 12,
    }),
    new cloudwatch.GraphWidget({
      title: 'Lambda Throttles',
      left: [
        props.uploadFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.processorFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.searchFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
        props.documentManagerFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
      ],
      width: 12,
    })
  );

  // Success Rate Row
  dashboard.addWidgets(
    new cloudwatch.SingleValueWidget({
      title: 'Upload Success Rate',
      metrics: [
        new cloudwatch.MathExpression({
          expression: '100 - (errors / invocations * 100)',
          usingMetrics: {
            errors: props.uploadFunction.metricErrors({ statistic: 'Sum', period: Duration.hours(1) }),
            invocations: props.uploadFunction.metricInvocations({ statistic: 'Sum', period: Duration.hours(1) }),
          },
        }),
      ],
      width: 6,
    }),
    new cloudwatch.SingleValueWidget({
      title: 'Search Success Rate',
      metrics: [
        new cloudwatch.MathExpression({
          expression: '100 - (errors / invocations * 100)',
          usingMetrics: {
            errors: props.searchFunction.metricErrors({ statistic: 'Sum', period: Duration.hours(1) }),
            invocations: props.searchFunction.metricInvocations({ statistic: 'Sum', period: Duration.hours(1) }),
          },
        }),
      ],
      width: 6,
    }),
    new cloudwatch.SingleValueWidget({
      title: 'Processing Success Rate',
      metrics: [
        new cloudwatch.MathExpression({
          expression: '100 - (errors / invocations * 100)',
          usingMetrics: {
            errors: props.processorFunction.metricErrors({ statistic: 'Sum', period: Duration.hours(1) }),
            invocations: props.processorFunction.metricInvocations({ statistic: 'Sum', period: Duration.hours(1) }),
          },
        }),
      ],
      width: 6,
    }),
    new cloudwatch.SingleValueWidget({
      title: 'Document Mgmt Success Rate',
      metrics: [
        new cloudwatch.MathExpression({
          expression: '100 - (errors / invocations * 100)',
          usingMetrics: {
            errors: props.documentManagerFunction.metricErrors({ statistic: 'Sum', period: Duration.hours(1) }),
            invocations: props.documentManagerFunction.metricInvocations({ statistic: 'Sum', period: Duration.hours(1) }),
          },
        }),
      ],
      width: 6,
    })
  );

  return dashboard;
}

export function createKBAlarms(
  stack: Stack,
  props: KBMonitoringDashboardProps
): cloudwatch.IAlarm[] {
  const alarms: cloudwatch.IAlarm[] = [];

  // High error rate alarm for upload function
  alarms.push(
    new cloudwatch.Alarm(stack, 'UploadHighErrorRate', {
      alarmName: 'KB-Upload-HighErrorRate',
      metric: props.uploadFunction.metricErrors({
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alert when upload function has more than 5 errors in 10 minutes',
    })
  );

  // High latency alarm for search function
  alarms.push(
    new cloudwatch.Alarm(stack, 'SearchHighLatency', {
      alarmName: 'KB-Search-HighLatency',
      metric: props.searchFunction.metricDuration({
        statistic: 'p95',
        period: Duration.minutes(5),
      }),
      threshold: 10000, // 10 seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alert when search p95 latency exceeds 10 seconds',
    })
  );

  // Throttling alarm
  alarms.push(
    new cloudwatch.Alarm(stack, 'LambdaThrottling', {
      alarmName: 'KB-Lambda-Throttling',
      metric: new cloudwatch.MathExpression({
        expression: 'upload + processor + search + manager',
        usingMetrics: {
          upload: props.uploadFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
          processor: props.processorFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
          search: props.searchFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
          manager: props.documentManagerFunction.metricThrottles({ statistic: 'Sum', period: Duration.minutes(5) }),
        },
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alert when any Lambda function is being throttled',
    })
  );

  return alarms;
}
