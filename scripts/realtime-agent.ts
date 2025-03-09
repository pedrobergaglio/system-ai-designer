import { defineAgent, multimodal, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { WorkerOptions, cli } from '@livekit/agents';
import { JobType } from '@livekit/protocol';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Store conversation history
const conversationHistory: {
  timestamp: string;
  speaker: string;
  text: string;
}[] = [];

// Debug flag for verbose logging
const DEBUG = true;

// Current conversation state tracking
let currentAgentSpeech = '';
let isAgentSpeaking = false;
let currentUserSpeech = '';

// Function to save transcript with current timestamp
function recordSpeech(speaker: string, text: string) {
  if (!text.trim()) return; // Skip empty messages
  
  console.log(`RECORDING ${speaker} SPEECH: ${text}`);
  conversationHistory.push({
    timestamp: new Date().toISOString(),
    speaker,
    text
  });
}

// Helper to log only when debugging is enabled
function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

// Define the function context with our tools
const fncCtx: llm.FunctionContext = {
  saveTitle: {
    description: 'Save the title of the conversation for future reference',
    parameters: z.object({
      title: z.string().describe('The title to save for this conversation'),
    }),
    execute: async ({ title }) => {
      // In a real implementation, this would save to a database
      console.log('\n=== TOOL CALLED: saveTitle ===');
      console.log(`Saving conversation title: "${title}"`);
      console.log('Current timestamp:', new Date().toISOString());
      console.log('===============================\n');
      
      return `Title "${title}" has been saved successfully for future reference.`;
    },
  },
  
  finishConversation: {
    description: 'Save the conversation transcript to a file and end the conversation',
    parameters: z.object({
      filename: z.string().optional().describe('Optional custom filename for the transcript, if not provided a default will be used'),
    }),
    execute: async ({ filename }) => {
      console.log('\n=== TOOL CALLED: finishConversation ===');
      
      // Create a default filename if not provided
      const actualFilename = filename || `conversation-transcript-${Date.now()}.txt`;
      const filePath = path.join(process.cwd(), actualFilename);
      
      // Format the transcript
      let transcript = "CONVERSATION TRANSCRIPT\n";
      transcript += "=======================\n\n";
      transcript += `Date: ${new Date().toLocaleString()}\n`;
      transcript += `Total exchanges: ${conversationHistory.length}\n\n`;
      
      // Add conversation content
      conversationHistory.forEach((entry, i) => {
        transcript += `[${entry.timestamp}] ${entry.speaker}: ${entry.text}\n`;
        
        // Add a blank line between exchanges for readability
        if (i < conversationHistory.length - 1 && 
            entry.speaker !== conversationHistory[i+1].speaker) {
          transcript += "\n";
        }
      });
      
      // Save the file
      try {
        fs.writeFileSync(filePath, transcript);
        console.log(`Saved conversation transcript to: ${filePath}`);
        console.log('===============================\n');
        
        return `Conversation transcript has been saved to ${actualFilename}. Thank you for using our ERP consultation service!`;
      } catch (err) {
        console.error('Error saving transcript:', err);
        return 'There was an error saving the transcript.';
      }
    },
  }
};

// This is the agent definition that gets exported
export default defineAgent({
  entry: async (ctx) => {
    try {
      console.log('Agent connecting to room:', ctx.room.name);
      await ctx.connect();
      console.log('Agent connected to room:', ctx.room.name);
      
      // Track if we've seen transcripts for debugging
      let hasSeenAgentTranscript = false;
      let hasSeenUserTranscript = false;
      
      // Create an agent that processes voice in real-time
      const agent = new multimodal.MultimodalAgent({
        model: new openai.realtime.RealtimeModel({
          instructions: `You are a technology consultant specializing in ERP system design. Your task is
to have a friendly conversation with the client, with the overall goal of
gathering all necessary information. You must obtain information about the
following points, but it's very important that the conversation feels natural,
and that you answer any question the customer has about how we work (you can
make up the details) and recommendations about the system.

When the user asks you to save a title for the conversation, use the saveTitle
tool to store their preferred title. For example, if they say "Please save this
conversation with the title 'ERP Planning for Acme Corp'", you should use the
tool to save that title.

When the user wants to end the conversation, use the finishConversation tool to
save the transcript and conclude the session. The user might say something like
"Let's finish our conversation" or "Please save our conversation".

Use un lenguaje y acento bien argentinos, con expresiones típicas locales.`,
          voice: 'ash',
          temperature: 0.85,
          maxResponseOutputTokens: Infinity,
          modalities: ['text', 'audio'],
          apiKey: process.env.OPENAI_API_KEY || '',
          turnDetection: {
            type: 'server_vad',
            threshold: 0.4,
            silence_duration_ms: 500,
            prefix_padding_ms: 200,
          },
          model: 'gpt-4o-mini-realtime-preview',
          // Configure input audio transcription to capture user speech
          inputAudioTranscription: {
            model: 'whisper-1'
          }
        }),
        fncCtx,
      });

      // Listen for all possible events from agent to find where transcripts might be
      const possibleAgentEvents = [
        'agent_started_speaking', 
        'agent_stopped_speaking',
        'message',
        'transcript',
        'response',
        'input_transcript',
        'agent_transcript',
        'user_transcript',
        'input',
        'output',
        'done',
        'error'
      ];
      
      // Register listeners for all possible events
      possibleAgentEvents.forEach(eventName => {
        agent.on(eventName as any, (data: any) => {
          console.log(`\n== AGENT EVENT: ${eventName} ==`);
          
          // Safely print event data
          if (data === undefined) {
            console.log('Event data: undefined');
          } else if (data === null) {
            console.log('Event data: null');
          } else if (typeof data === 'object') {
            try {
              // Try to print the object keys first
              const keys = Object.keys(data);
              console.log('Event data keys:', keys);
              
              // Try to stringify the full object, with fallbacks
              try {
                console.log('Event data:', JSON.stringify(data, null, 2));
              } catch (e) {
                console.log('Event data: [Object cannot be stringified]');
                // Try to log individual properties
                keys.forEach(key => {
                  try {
                    console.log(`data.${key}:`, data[key]);
                  } catch (e) {
                    console.log(`data.${key}: [Cannot access property]`);
                  }
                });
              }
            } catch (e) {
              console.log('Event data: [Object cannot be inspected]', typeof data);
            }
          } else {
            // For primitive types
            console.log('Event data:', data);
          }
          
          // Track response transcripts
          if (
            eventName === 'agent_stopped_speaking' || 
            eventName === 'response' ||
            eventName === 'agent_transcript'
          ) {
            hasSeenAgentTranscript = true;
            
            // Try to extract transcript based on event type
            let transcript: string | null = null;
            
            if (typeof data === 'string') {
              transcript = data;
            } else if (data && typeof data === 'object') {
              // Try various properties where transcript might be found
              transcript = data.text || data.transcript || data.content || 
                           data.message || data.response || null;
                
              // If we have a content array, try to extract text from it
              if (!transcript && Array.isArray(data.content)) {
                const textContent = data.content.find(
                  (item: any) => item && item.type === 'text'
                );
                transcript = textContent?.text || null;
              }
            }
            
            if (transcript) {
              console.log('FOUND AGENT TRANSCRIPT:', transcript);
              conversationHistory.push({
                timestamp: new Date().toISOString(),
                speaker: 'AI',
                text: transcript
              });
            }
          }
          
          // Track user transcripts
          if (
            eventName === 'input_transcript' || 
            eventName === 'user_transcript' ||
            eventName === 'input'
          ) {
            hasSeenUserTranscript = true;
            
            // Try to extract transcript based on event type
            let transcript: string | null = null;
            
            if (typeof data === 'string') {
              transcript = data;
            } else if (data && typeof data === 'object') {
              transcript = data.text || data.transcript || data.content || 
                           data.message || data.input || null;
            }
            
            if (transcript) {
              console.log('FOUND USER TRANSCRIPT:', transcript);
              conversationHistory.push({
                timestamp: new Date().toISOString(),
                speaker: 'User',
                text: transcript
              });
            }
          }
        });
      });

      // Better room event tracking
      ctx.room.on('data' as any, (data: any, kind: any, source: any) => {
        console.log('Room data event:', { kind, source, dataLength: data?.length });
        
        // Try to parse it as transcription data if it's a string or buffer
        try {
          if (typeof data === 'string' || (data instanceof Buffer)) {
            const parsed = JSON.parse(data.toString());
            console.log('Parsed data content:', parsed);
            
            // Check if this might be transcript data
            if (parsed.text || parsed.transcript) {
              console.log('POSSIBLE TRANSCRIPT IN DATA:', parsed.text || parsed.transcript);
            }
          }
        } catch (e) {
          // Ignore parsing errors, it might not be JSON
          debugLog('Not parseable JSON data');
        }
      });

      // Listen to key events
      agent.on('agent_started_speaking', () => {
        console.log('\n== AGENT STARTED SPEAKING ==');
        isAgentSpeaking = true;
        currentAgentSpeech = ''; // Reset current speech
      });

      agent.on('agent_stopped_speaking', () => {
        console.log('\n== AGENT STOPPED SPEAKING ==');
        isAgentSpeaking = false;
        
        // Save the collected speech if we have any
        if (currentAgentSpeech) {
          recordSpeech('AI', currentAgentSpeech);
          currentAgentSpeech = '';
        }
      });
      
      // Hook into room data events for transcript collection
      ctx.room.on('message' as any, (msg: any) => {
        console.log('\n== ROOM MESSAGE ==');
        try {
          if (typeof msg === 'string') {
            console.log('Message string:', msg);
            
            // Try to parse for transcript data
            try {
              const data = JSON.parse(msg);
              if (data.type === 'transcript' || data.transcript || data.text) {
                console.log('Possible transcript in message:', data);
              }
            } catch {}
          } else if (msg instanceof Uint8Array || msg instanceof Buffer) {
            // Try to decode as text
            const text = Buffer.from(msg).toString('utf-8');
            console.log('Message binary decoded:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
          } else if (msg && typeof msg === 'object') {
            // Log keys for object inspection
            console.log('Message object keys:', Object.keys(msg));
          }
        } catch (e) {
          console.log('Error processing message:', e);
        }
      });

      // ENHANCED APPROACH: Use LiveKit client to subscribe to OpenAI events
      // Try to access the underlying OpenAI client connection
      // @ts-ignore - Accessing internal member
      const realtimeClient = agent.model?.client || agent.model?.realtimeClient;
      if (realtimeClient) {
        console.log('Found realtime client:', typeof realtimeClient);
        
        // Try to subscribe to events
        try {
          realtimeClient.on('message', (msg: any) => {
            console.log('\n== OPENAI CLIENT MESSAGE ==');
            console.log('Message type:', typeof msg);
            
            // Try to extract useful transcript data
            try {
              if (typeof msg === 'string' && msg.includes('transcript')) {
                console.log('Transcript-related message:', msg);
              } else if (msg && typeof msg === 'object') {
                // Look for transcript properties
                if (msg.transcript || msg.text || msg.content) {
                  console.log('Transcript data found in message:', 
                    msg.transcript || msg.text || msg.content);
                    
                  // Determine if this is agent or user transcript
                  const isUserTranscript = msg.role === 'user' || 
                    msg.source === 'user' || 
                    msg.type?.includes('user') ||
                    msg.type?.includes('input');
                    
                  const text = msg.transcript || msg.text || msg.content;
                  if (text) {
                    if (isUserTranscript) {
                      recordSpeech('User', text);
                    } else if (isAgentSpeaking || !currentUserSpeech) {
                      currentAgentSpeech += text + ' ';
                    }
                  }
                }
              }
            } catch (e) {
              console.log('Error processing realtime message:', e);
            }
          });
          
          // Try to subscribe to transcript events specifically
          realtimeClient.on('transcript', (data: any) => {
            console.log('\n== TRANSCRIPT EVENT ==', data);
            if (data && (data.text || data.transcript)) {
              const text = data.text || data.transcript;
              console.log('Transcript received:', text);
              
              if (data.role === 'user' || data.source === 'user') {
                recordSpeech('User', text);
              } else {
                recordSpeech('AI', text);
              }
            }
          });
          
          // Many OpenAI realtime clients emit specific events for transcripts
          realtimeClient.on('audio_transcript.done', (data: any) => {
            console.log('\n== AUDIO TRANSCRIPT DONE ==', data);
            if (data && data.transcript) {
              recordSpeech('AI', data.transcript);
            }
          });
          
          realtimeClient.on('input_audio_transcription.completed', (data: any) => {
            console.log('\n== INPUT AUDIO TRANSCRIPT COMPLETED ==', data);
            if (data && data.text) {
              recordSpeech('User', data.text);
            }
          });
        } catch (e) {
          console.log('Error setting up realtime client listeners:', e);
        }
      } else {
        console.log('Could not access realtime client');
      }
      
      // DIRECT MESSAGE INSPECTION
      // A known technique for debugging OpenAI Assistants API: inspect messages
      // @ts-ignore - Accessing internal methods
      const originalSendMessage = agent.model?.sendMessage || agent.model?.send;
      if (originalSendMessage && typeof originalSendMessage === 'function') {
        // @ts-ignore - Monkey patching for debugging
        agent.model.sendMessage = function(...args: any[]) {
          console.log('\n== AGENT SENDING MESSAGE ==');
          console.log('Message args:', JSON.stringify(args, null, 2));
          
          // Look for transcript in outgoing messages
          if (args[0] && typeof args[0] === 'object') {
            if (args[0].text || args[0].message || args[0].content) {
              const text = args[0].text || args[0].message || args[0].content;
              console.log('Outgoing message content:', text);
              
              // If this appears to be an agent response, record it
              if (!currentUserSpeech && isAgentSpeaking) {
                currentAgentSpeech += text + ' ';
              }
            }
          }
          
          // Call original method
          return originalSendMessage.apply(this, args);
        };
        console.log('Intercepted message sending');
      }

      console.log('Starting agent in room...');
      await agent.start(ctx.room);
      console.log('Agent started successfully!');
      
      // Periodically check if we're seeing transcripts
      const checkInterval = setInterval(() => {
        const now = new Date().toISOString();
        console.log(`\n== TRANSCRIPT STATUS CHECK at ${now} ==`);
        console.log('Has seen agent transcript:', hasSeenAgentTranscript);
        console.log('Has seen user transcript:', hasSeenUserTranscript);
        console.log('Current conversation history length:', conversationHistory.length);
        
        // Try to access any transcript data from agent
        try {
          // @ts-ignore - exploring possible properties
          const agentProps = Object.keys(agent).filter(k => !k.startsWith('_'));
          console.log('Available agent properties:', agentProps);
          
          // Look for model properties that might contain transcript data
          // @ts-ignore - exploring possible properties
          if (agent.model) {
            // @ts-ignore
            const modelProps = Object.keys(agent.model).filter(k => !k.startsWith('_'));
            console.log('Available model properties:', modelProps);
            
            // @ts-ignore - Check for any response or transcript property
            const lastResponse = agent.model.lastResponse;
            if (lastResponse) {
              console.log('Last response found:', lastResponse);
            }
          }
        } catch (e) {
          console.log('Error accessing agent properties:', e);
        }
      }, 10000); // Check every 10 seconds
      
      // Keep agent running until manually stopped or connection lost
      await new Promise((resolve) => {
        ctx.room.once('disconnected', () => {
          console.log('Agent disconnected from room');
          clearInterval(checkInterval);
          
          // Save transcript on disconnection if not already saved
          if (conversationHistory.length > 0) {
            const filename = `auto-saved-transcript-${Date.now()}.txt`;
            const filePath = path.join(process.cwd(), filename);
            
            let transcript = "AUTO-SAVED CONVERSATION TRANSCRIPT\n";
            transcript += "=================================\n\n";
            transcript += `Date: ${new Date().toLocaleString()}\n`;
            transcript += `Room: ${ctx.room.name}\n`;
            transcript += `Total exchanges: ${conversationHistory.length}\n\n`;
            
            conversationHistory.forEach((entry) => {
              transcript += `[${entry.timestamp}] ${entry.speaker}: ${entry.text}\n\n`;
            });
            
            try {
              fs.writeFileSync(filePath, transcript);
              console.log(`Auto-saved conversation transcript to: ${filePath}`);
            } catch (err) {
              console.error('Error auto-saving transcript:', err);
            }
          }
          
          resolve(null);
        });
      });
    } catch (err) {
      console.error('Agent error:', err);
      throw err;
    }
  },
});

// ES Module entry point check - run only when executed directly
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  // Set environment variables for LiveKit
  process.env.LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey'; 
  process.env.LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
  process.env.LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
  
  console.log('Starting LiveKit agent with environment:');
  console.log(`LIVEKIT_API_KEY: ${process.env.LIVEKIT_API_KEY}`);
  console.log(`LIVEKIT_API_SECRET: ${process.env.LIVEKIT_API_SECRET}`);
  console.log(`LIVEKIT_URL: ${process.env.LIVEKIT_URL}`);
  
  // Create worker options with explicit configuration
  const options = new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
    workerType: JobType.JT_ROOM,
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    wsURL: process.env.LIVEKIT_URL,//webSocketUrl: process.env.LIVEKIT_URL, // wsURL: process.env.LIVEKIT_URL,
  });

  // Start the agent in development mode
  const args = process.argv.slice(2);
  const command = args[0] || 'dev';
  
  if (args.length === 0) {
    process.argv.push('dev');
  }
  
  console.log(`Running agent with command: ${command}`);
  cli.runApp(options);
}
