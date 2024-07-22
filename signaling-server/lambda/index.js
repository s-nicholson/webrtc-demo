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
    } else if (action === 'getOffer') {
        return await getOffer(body.sessionId);
    } else if (action === 'answer') {
        return await handleAnswer(body);
    } else if (action === 'getAnswer') {
        return await getAnswer(body.sessionId);
    } else if (action === 'candidate') {
        return await handleCandidate(body);
    } else if (action === 'getCandidates') {
        return await getCandidates(body.sessionId);
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
    await dynamodb.send(new ddbLib.PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
            SessionId: body.sessionId,
            SDP: body.sdp,
            TxType: 'offer',
            expires_at: ttl()
        },
    }));
    return {
        statusCode: 200,
        body: JSON.stringify({ status: 'Offer stored' }),
    };
};

const getOffer = async (sessionId) => {
    const result = await dynamodb.send(new ddbLib.GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { SessionId: sessionId },
    }));

    if (result.Item) {
        return {
            statusCode: 200,
            body: JSON.stringify({ sdp: result.Item.SDP }),
        };
    } else {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Offer not found' }),
        };
    }
};

const handleAnswer = async (body) => {
    await dynamodb.send(new ddbLib.UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { SessionId: body.sessionId },
        UpdateExpression: "set SDP = :s, TxType = :t, expires_at = :ttl",
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

const getAnswer = async (sessionId) => {
    const result = await dynamodb.send(new ddbLib.GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { SessionId: sessionId },
    }));

    if (result.Item && result.Item.TxType == "answer") {
        return {
            statusCode: 200,
            body: JSON.stringify({ sdp: result.Item.SDP }),
        };
    } else {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Answer not found' }),
        };
    }
};

const handleCandidate = async (body) => {
    await dynamodb.send(new ddbLib.UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { SessionId: body.sessionId },
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

const getCandidates = async (sessionId) => {
    const result = await dynamodb.send(new ddbLib.GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { SessionId: sessionId },
    }));

    if (result.Item && result.Item.Candidates) {
        return {
            statusCode: 200,
            body: JSON.stringify({ candidates: result.Item.Candidates }),
        };
    } else {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Candidates not found' }),
        };
    }
};

const ttl = () => {
    return Math.floor(Date.now() / 1000) + 3600;
}