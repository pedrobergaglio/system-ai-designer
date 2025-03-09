import { WorkerOptions, cli } from '@livekit/agents';
import { JobType } from '@livekit/protocol';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file
dotenv.config();

// Explicitly log the environment variables
console.log('Environment variables:');
console.log(`LIVEKIT_API_KEY: ${process.env.LIVEKIT_API_KEY || 'not set'}`);
console.log(`LIVEKIT_API_SECRET: ${process.env.LIVEKIT_API_SECRET || 'not set'}`);
console.log(`LIVEKIT_URL: ${process.env.LIVEKIT_URL || 'not set'}`);

// Try to load agent
const agentPath = path.resolve(__dirname, 'realtime-agent.ts');
console.log(`Loading agent from: ${agentPath}`);

try {
  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent file not found: ${agentPath}`);
  }
  
  console.log('Agent file exists, running...');

  // Set environment variables programmatically
  process.env.LIVEKIT_API_KEY = 'devkey';
  process.env.LIVEKIT_API_SECRET = 'devsecret';
  process.env.LIVEKIT_URL = 'ws://localhost:7880';

  // Run the agent
  const options = new WorkerOptions({
    agent: agentPath,
    workerType: JobType.JT_ROOM,
    apiKey: 'devkey',
    apiSecret: 'devsecret',
    wsURL: 'ws://localhost:7880'
  });

  console.log('Starting agent with options:', JSON.stringify(options, null, 2));
  cli.runApp(options);
} catch (error) {
  console.error('Failed to run agent:', error);
}
