import { AccessToken } from 'livekit-server-sdk';

// Configuration
const API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
const ROOM_NAME = `test-room-${Date.now()}`;
const PARTICIPANT_NAME = `test-user-${Date.now().toString().slice(-4)}`;

// Create token
const token = new AccessToken(API_KEY, API_SECRET, {
  identity: PARTICIPANT_NAME,
  name: PARTICIPANT_NAME,
});

// Add explicit permissions
token.addGrant({
  roomJoin: true,
  room: ROOM_NAME,
  canPublish: true,
  canSubscribe: true,
  canPublishData: true
});

const jwt = token.toJwt();

// Print token info
console.log(`\nToken verification for LiveKit configuration:`);
console.log(`API_KEY: ${API_KEY}`);
console.log(`API_SECRET: ${API_SECRET.substring(0, 3)}****`);
console.log(`Room: ${ROOM_NAME}`);
console.log(`Participant: ${PARTICIPANT_NAME}`);
console.log(`\nGenerated token:`);
console.log(jwt);
console.log(`\nUse this token in the client to test connection.`);
