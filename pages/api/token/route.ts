import { AccessToken } from "livekit-server-sdk";
import { PlaygroundState, defaultPlaygroundState, ERP_CONSULTANT_INSTRUCTIONS, ERP_CONSULTANT_INSTRUCTIONS_SHORT } from "../../../src/data/playground-state";
import { NextApiRequest, NextApiResponse } from "next";

// Enhanced instructions with very explicit Spanish examples of function usage
const updatedInstructions = `${ERP_CONSULTANT_INSTRUCTIONS_SHORT}

INSTRUCCIONES ADICIONALES IMPORTANTES PARA FINALIZAR LA CONVERSACIÓN:
Cuando hayas recopilado toda la información necesaria, debes:

1. Informar al usuario que la entrevista ha finalizado y que el diseño del sistema comenzará
2. Decir algo como: "Perfecto, tengo toda la información necesaria. Ahora voy a iniciar el proceso de diseño del sistema ERP basado en nuestra conversación. En unos momentos podrás ver el resultado."
3. DESPUÉS DE TU MENSAJE FINAL, debes llamar a la función finishConversation para terminar la entrevista.

CÓMO USAR LA FUNCIÓN finishConversation:
Es fundamental que proporciones valores reales (no textuales) para companyName y ownerName. La función debe ser llamada así:

finishConversation(
  companyName: "Nombre real de la empresa", 
  ownerName: "Nombre real del cliente"
)

Por ejemplo:
- CORRECTO: finishConversation(companyName: "Acme Tecnología", ownerName: "Juan Pérez")
- INCORRECTO: finishConversation(companyName: "companyName", ownerName: "ownerName")

IMPORTANTE: Siempre usa los datos reales que obtuviste durante la conversación, nunca uses nombres genéricos.`;

// More robust room creation management
const roomState = {
  lastRoomCreated: '',
  timestamp: 0,
  accessToken: '',
  livekitUrl: '',
  isCreatingRoom: false,  // Flag to prevent concurrent room creation
  pendingPromise: null as Promise<any> | null, // To share promise between concurrent requests
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[token/route] Starting handler');
  
  const now = Date.now();
  
  // If we already have a recent room (within 30 seconds), use it
  if (roomState.lastRoomCreated && now - roomState.timestamp < 30000) {
    console.log(`[token/route] Returning cached room: ${roomState.lastRoomCreated} (created ${now - roomState.timestamp}ms ago)`);
    return res.status(200).json({
      roomName: roomState.lastRoomCreated,
      accessToken: roomState.accessToken,
      livekitUrl: roomState.livekitUrl
    });
  }
  
  // If another request is already creating a room, wait for it
  if (roomState.isCreatingRoom && roomState.pendingPromise) {
    console.log('[token/route] Another request is creating a room, waiting for it to complete');
    try {
      await roomState.pendingPromise;
      console.log('[token/route] Using room created by other request');
      return res.status(200).json({
        roomName: roomState.lastRoomCreated,
        accessToken: roomState.accessToken,
        livekitUrl: roomState.livekitUrl
      });
    } catch (error) {
      console.error('[token/route] Error while waiting for other request to create room:', error);
      // Continue with creating our own room
    }
  }
  
  // Set the creating flag and create a promise for others to wait on
  roomState.isCreatingRoom = true;
  
  // Create a promise for room creation that other requests can wait on
  roomState.pendingPromise = (async () => {
    try {
      let playgroundState: PlaygroundState = {
        ...defaultPlaygroundState,
        instructions: updatedInstructions
      };

      const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
      const apiSecret = process.env.LIVEKIT_API_SECRET || 'devsecret';
      const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
      
      console.log('[token/route] Using LiveKit configuration:');
      console.log(`[token/route] API Key: ${apiKey}`);
      console.log(`[token/route] URL: ${livekitUrl}`);
      
      if (!apiKey || !apiSecret) {
        throw new Error("LIVEKIT_API_KEY y LIVEKIT_API_SECRET deben estar configurados");
      }

      const roomName = `erp-consultation-${now}`;
      console.log(`[token/route] Creating room: ${roomName}`);

      // Create token with metadata
      console.log('[token/route] Creating access token with instructions');
      
      const at = new AccessToken(apiKey, apiSecret, {
        identity: "human",
        metadata: JSON.stringify({
          instructions: updatedInstructions,
          modalities: playgroundState.sessionConfig.modalities,
          voice: playgroundState.sessionConfig.voice,
          temperature: playgroundState.sessionConfig.temperature,
          max_output_tokens: playgroundState.sessionConfig.maxOutputTokens,
          openai_api_key: process.env.OPENAI_API_KEY,
          turn_detection: JSON.stringify({
            type: playgroundState.sessionConfig.turnDetection,
            threshold: playgroundState.sessionConfig.vadThreshold,
            silence_duration_ms: playgroundState.sessionConfig.vadSilenceDurationMs,
            prefix_padding_ms: playgroundState.sessionConfig.vadPrefixPaddingMs,
          })
        }),
      });
      
      // Add permissions
      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
        canUpdateOwnMetadata: true,
      });

      const accessToken = await at.toJwt();
      console.log(`[token/route] Created token of length: ${accessToken.length}`);
      
      // Update room state
      roomState.lastRoomCreated = roomName;
      roomState.timestamp = now;
      roomState.accessToken = accessToken;
      roomState.livekitUrl = livekitUrl;
      
      return {
        roomName,
        accessToken,
        livekitUrl
      };
    } catch (error) {
      console.error('[token/route] Error creating room:', error);
      throw error;
    } finally {
      roomState.isCreatingRoom = false;
      roomState.pendingPromise = null;
    }
  })();
  
  try {
    const result = await roomState.pendingPromise;
    console.log('[token/route] Returning response with room info');
    return res.status(200).json(result);
  } catch (error) {
    console.error('[token/route] Error in handler:', error);
    return res.status(500).json({ error: "Error creating LiveKit room" });
  }
}
