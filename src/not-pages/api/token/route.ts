import { AccessToken } from "livekit-server-sdk";
import { PlaygroundState, defaultPlaygroundState } from "../../../data/playground-state";
import { NextApiResponse } from "next";

export default async function POST(request: Request, res: NextApiResponse) {
  let playgroundState: PlaygroundState;

  playgroundState = defaultPlaygroundState

  /* try {
    playgroundState = await request.json();
  } catch (error) {
    return Response.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  } */

  const {
    instructions,
    openaiAPIKey,
    sessionConfig: {
      turnDetection,
      modalities,
      voice,
      temperature,
      maxOutputTokens,
      vadThreshold,
      vadSilenceDurationMs,
      vadPrefixPaddingMs,
    },
  } = playgroundState;

  if (!openaiAPIKey) {
    return Response.json(
      { error: "OpenAI API key is required" },
      { status: 400 },
    );
  }

  const roomName = Math.random().toString(36).slice(7);
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: "human",
    metadata: JSON.stringify({
      instructions: instructions,
      modalities: modalities,
      voice: voice,
      temperature: temperature,
      max_output_tokens: maxOutputTokens,
      openai_api_key: openaiAPIKey,
      turn_detection: JSON.stringify({
        type: turnDetection,
        threshold: vadThreshold,
        silence_duration_ms: vadSilenceDurationMs,
        prefix_padding_ms: vadPrefixPaddingMs,
      }),
    }),
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });

  return res.status(200).json({
    roomName,
    accessToken: await at.toJwt(),
    livekitUrl: process.env.LIVEKIT_URL // Send the WebSocket URL to the client
  });

  return Response.json({
    accessToken: await at.toJwt(),
    url: process.env.LIVEKIT_URL,
    roomName,
  });
}
