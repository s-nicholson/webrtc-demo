const ddbClient = require('@aws-sdk/client-dynamodb');
const ddbLib = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new ddbClient.DynamoDBClient({});
const dynamodb = ddbLib.DynamoDBDocumentClient.from(client);


exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const action = body.action;

    if (action === 'create') {
        return await createSession();
    } else if (action === 'offer') {
        return await handleOffer(body);
    } else if (action === 'answer') {
        return await handleAnswer(body);
    } else if (action === 'candidate') {
        return await handleCandidate(body);
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
};

const createSession = async () => {
    const sessionId = randomUUID();
    return {
        statusCode: 200,
        body: JSON.stringify({ sessionId }),
    };
};

const handleOffer = async (body) => {
    const offerId = generateId();
    await dynamodb.send(new ddbLib.PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
            SessionId: body.sessionId,
            ConnectionId: offerId,
            SDP: body.sdp,
            Type: 'offer',
            expires_at: ttl()
        },
    }));
    return {
        statusCode: 200,
        body: JSON.stringify({ offerId: offerId }),
    };
};

const handleAnswer = async (body) => {
    await dynamodb.send(new ddbLib.UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { SessionId: body.sessionId, ConnectionId: 'offer' },
        UpdateExpression: "set SDP = :s, Type = :t, expires_at = :ttl",
        ExpressionAttributeValues: {
            ':s': body.sdp,
            ':t': 'answer',
            ':ttl': ttl()
        },
    }));
    return {
        statusCode: 200,
        body: JSON.stringify({ status: 'Answer stored' }),
    };
};

const handleCandidate = async (body) => {
    await dynamodb.send(new ddbLib.UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { SessionId: body.sessionId, ConnectionId: 'offer' },
        UpdateExpression: "set Candidates = list_append(if_not_exists(Candidates, :empty_list), :c), expires_at = :ttl",
        ExpressionAttributeValues: {
            ':c': [body.candidate],
            ':empty_list': [],
            ':ttl': ttl()
        },
    }));
    return {
        statusCode: 200,
        body: JSON.stringify({ status: 'Candidate stored' }),
    };
};

const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};

const ttl = () => {
    return Math.floor(Date.now() / 1000) + 3600;
}