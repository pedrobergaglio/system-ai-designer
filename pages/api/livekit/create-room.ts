import type { NextApiRequest, NextApiResponse } from 'next';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

// You would set these environment variables in production
const API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

// HTTP URL for RoomServiceClient
const LIVEKIT_API_URL = LIVEKIT_URL.replace('ws://', 'http://').replace('wss://', 'https://');

const roomService = new RoomServiceClient(LIVEKIT_API_URL, API_KEY, API_SECRET);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Creating LiveKit room with URL:', LIVEKIT_API_URL);
    console.log('Using API KEY:', API_KEY);
    const { roomName = `erp-consultation-${Date.now()}`, participantName = 'customer' } = req.body;
    console.log(`Room name: ${roomName}, Participant: ${participantName}`);

    // Create room if it doesn't exist
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 60 * 10, // 10 minutes
      maxParticipants: 2, // customer + agent
    });
    console.log(`Room created: ${roomName}`);

    // Create access token for the participant with more permissions
    const token = new AccessToken(API_KEY, API_SECRET, {
      identity: participantName,
      name: participantName,
    });
    
    // Add explicit permissions
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });
    
    const jwt = await token.toJwt();
    console.log(`Token created for ${participantName}: ${jwt.substring(0, 20)}...`);

    return res.status(200).json({
      roomName,
      token: jwt,
      livekitUrl: LIVEKIT_URL // Send the WebSocket URL to the client
    });
  } catch (error) {
    console.error('Error creating LiveKit room:', error);
    return res.status(500).json({ 
      error: 'Failed to create room',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
