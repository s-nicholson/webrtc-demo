import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class SignalingServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'WebRTCSignalingTable', {
      partitionKey: { name: 'SessionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ConnectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,    
      timeToLiveAttribute: "expires_at"
    });

    // Lambda Function
    const signalingFunction = new lambda.Function(this, 'SignalingFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Grant Lambda permissions to access DynamoDB
    table.grantReadWriteData(signalingFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'SignalingApi', {
      restApiName: 'Signaling Service',
      description: 'This service handles WebRTC signaling.',
    });

    const signalingIntegration = new apigateway.LambdaIntegration(signalingFunction);

    // Define API routes
    api.root.addResource('offer').addMethod('POST', signalingIntegration);
    api.root.addResource('answer').addMethod('POST', signalingIntegration);
    api.root.addResource('candidate').addMethod('POST', signalingIntegration);
  }
}
