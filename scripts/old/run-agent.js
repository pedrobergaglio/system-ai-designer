import { execSync } from 'child_process';

// Configure environment variables explicitly
process.env.LIVEKIT_API_KEY = 'devkey';
process.env.LIVEKIT_API_SECRET = 'devsecret';
process.env.LIVEKIT_URL = 'ws://localhost:7880';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

console.log('Starting LiveKit agent with environment:');
console.log(`LIVEKIT_API_KEY: ${process.env.LIVEKIT_API_KEY}`);
console.log(`LIVEKIT_API_SECRET: ${process.env.LIVEKIT_API_SECRET}`);
console.log(`LIVEKIT_URL: ${process.env.LIVEKIT_URL}`);

try {
  console.log('Executing agent with dev mode...');
  execSync('node scripts/agent.js dev', { 
    stdio: 'inherit',
    env: process.env 
  });
} catch (error) {
  console.error('Failed to run agent:', error);
}
