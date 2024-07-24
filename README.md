# WebRTC chat

A simple chat app using WebRTC with a signaling server running in Lambda.

> Much of the code in this repo was written by ChatGPT and then tweaked by me.

## Client

The client is a single html page with all the necessary JS bundled in.

This can be run locally in your browser or hosted somewhere ([e.g. github pages.](./client/index.html))

## Signaling server

The backend signaling server is deployed as a very simple lambda which persists the necessary SDP values into dynamodb to allow 2 peers to exchange information.

Deploying this is just:

```sh
cd signaling-server
npm i
npx cdk deploy
```

> Assuming you already have AWS creds setup.