import { defineAgent, multimodal } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { WorkerOptions, cli } from '@livekit/agents';
import { JobType } from '@livekit/protocol';

// This is the agent definition that gets exported
export default defineAgent({
  // This function gets called when the agent joins a room
  entry: async (ctx) => {
    console.log('Agent connecting to room...');
    await ctx.connect();
    console.log('Agent connected to room:', ctx.room.name);

    // Create an agent that processes voice in real-time
    const agent = new multimodal.MultimodalAgent({
      model: new openai.realtime.RealtimeModel({
      instructions: `You are a technology consultant specializing in ERP system design. Your task is
  to have a friendly conversation with the client, with the overall goal of
  gathering all necessary information. You must obtain information about the
  following points, but it's very important that the conversation feels natural,
  and that you answer any question the customer has about how we work (you can
  make up the details) and recommendations about the system --- usa un lenguaje y
  acento bien argentinos`,
      voice: 'nova',
      temperature: 0.85,
      maxResponseOutputTokens: Infinity,
      modalities: ['text', 'audio'],
      apiKey: '',
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
    console.log('Agent started successfully!');
  },
});

// Only run this section when the file is executed directly (not when imported)
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  // Set environment variables for LiveKit
  process.env.LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey'; 
  process.env.LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
  process.env.LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
  
  console.log('Starting LiveKit agent with environment:');
  console.log(`LIVEKIT_API_KEY: ${process.env.LIVEKIT_API_KEY}`);
  console.log(`LIVEKIT_API_SECRET: ${process.env.LIVEKIT_API_SECRET}`);
  console.log(`LIVEKIT_URL: ${process.env.LIVEKIT_URL}`);
  
  // Create worker options
  const options = new WorkerOptions({
    agent: new URL('./agent.js', import.meta.url).pathname,  // Path to this file
    workerType: JobType.JT_ROOM,
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET, 
    webSocketUrl: process.env.LIVEKIT_URL,
  });

  // Start the agent in development mode
  const args = process.argv.slice(2);
  const command = args[0] || 'dev';  // Default to 'dev' if no command provided
  
  // Add the command to process.argv if not already there
  if (args.length === 0) {
    process.argv.push('dev');
  }
  
  console.log(`Running agent with command: ${command}`);
  cli.runApp(options);
}
