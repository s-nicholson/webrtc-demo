import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export class SignalingServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'WebRTCSignalingTable', {
      partitionKey: { name: 'SessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expires_at",
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Lambda Function
    const signalingFunction = new lambda.Function(this, 'SignalingFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
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
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Define the /offer endpoint
    const offerResource = api.root.addResource('offer');
    offerResource.addMethod('POST', new apigateway.LambdaIntegration(signalingFunction));

    // Define the /answer endpoint
    const answerResource = api.root.addResource('answer');
    answerResource.addMethod('POST', new apigateway.LambdaIntegration(signalingFunction));

    // Define the /candidate endpoint
    const candidateResource = api.root.addResource('candidate');
    candidateResource.addMethod('POST', new apigateway.LambdaIntegration(signalingFunction));

    // Define the /create endpoint
    const createResource = api.root.addResource('create');
    createResource.addMethod('POST', new apigateway.LambdaIntegration(signalingFunction));
  }
}
