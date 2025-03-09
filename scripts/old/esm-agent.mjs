import { WorkerOptions, cli, defineAgent, multimodal } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { JobType } from '@livekit/protocol';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Set environment variables explicitly
process.env.LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
process.env.LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
process.env.LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

console.log('Starting LiveKit agent with environment:');
console.log(`LIVEKIT_API_KEY: ${process.env.LIVEKIT_API_KEY}`);
console.log(`LIVEKIT_API_SECRET: ${process.env.LIVEKIT_API_SECRET}`);
console.log(`LIVEKIT_URL: ${process.env.LIVEKIT_URL}`);

// Define the agent inline to avoid import.meta.resolve issues
const agent = defineAgent({
  entry: async (ctx) => {
    await ctx.connect();
    console.log('Agent connected to room:', ctx.room.name);

    const agent = new multimodal.MultimodalAgent({
      model: new openai.realtime.RealtimeModel({
        instructions: `You are a technology consultant specializing in ERP system design. Your task is
to have a friendly conversation with the client, with the overall goal of
gathering all necessary information. You must obtain information about the
following points, but it's very important that the conversation feels natural,
and that you answer any question the customer has about how we work (you can
make up the details) and recommendations about the system --- usa un lenguaje y
acento bien argentinos`,
        voice: 'ash',
        temperature: 0.85,
        maxResponseOutputTokens: Infinity,
        modalities: ['text', 'audio'],
        turnDetection: {
          type: 'server_vad',
          threshold: 0.6,
          silence_duration_ms: 770,
          prefix_padding_ms: 300,
        },
      }),
    });

    console.log('Starting agent in room...');
    await agent.start(ctx.room);
  },
});

// Get the current file path
const __filename = fileURLToPath(import.meta.url);

// Run the agent with explicit options
const options = new WorkerOptions({
  agent: __filename,
  workerType: JobType.JT_ROOM,
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET,
  webSocketUrl: process.env.LIVEKIT_URL,
});

try {
  // Explicitly use the dev command
  process.argv[2] = 'dev';
  cli.runApp(options);
} catch (error) {
  console.error('Failed to run agent:', error);
  process.exit(1);
}
