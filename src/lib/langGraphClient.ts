import { Client } from '@langchain/langgraph-sdk';
import { SessionData } from './types';
import { ERPDesign } from '../lib/types';
import { traceStep, withTracing } from './processTracer';

// Local LangGraph instance
const LANGGRAPH_URL = 'http://localhost:8123';

// Track active processing to prevent duplicate calls
let activeProcessing = false;
let activeThread: string | null = null;

// Create singleton client
let langGraphClient: Client | null = null;

export const getLangGraphClient = () => {
  if (!langGraphClient) {
    console.log('[LangGraphClient] Creating new LangGraph client instance');
    langGraphClient = new Client({ apiUrl: LANGGRAPH_URL });
  }
  return langGraphClient;
};

export type TranscriptSubmissionData = {
  companyName: string;
  ownerName: string;
  transcript: string;
};

export async function processTranscriptForDesign(data: TranscriptSubmissionData): Promise<{ threadId: string, designData: ERPDesign }> {
  console.log(`[LangGraphClient] processTranscriptForDesign called for company: ${data.companyName}`);
  console.log(`[LangGraphClient] Transcript length: ${data.transcript.length} characters`);
  traceStep('processTranscriptForDesign.start', { company: data.companyName });
  
  // Check if we're already processing
  if (activeProcessing) {
    console.warn('[LangGraphClient] Already processing a design! Preventing duplicate processing');
    throw new Error('Design generation already in progress');
  }
  
  activeProcessing = true;
  let thread: { thread_id: string };
  
  try {
    const client = getLangGraphClient();
    
    // 1. Create a new thread
    console.log('[LangGraphClient] Creating LangGraph thread');
    traceStep('processTranscriptForDesign.createThread');
    const thread = await client.threads.create();
    console.log(`[LangGraphClient] Thread created with ID: ${thread.thread_id}`);
    activeThread = thread.thread_id;
    
    // 2. Format conversation transcript for the model
    const inputContent = `# Información de la entrevista de diseño ERP\n\nEmpresa: ${data.companyName}\nPropietario: ${data.ownerName}\n\n## Transcripción de la conversación:\n\n${data.transcript}`;
    console.log(`[LangGraphClient] Formatted input content (length: ${inputContent.length} characters)`);
    
    const inputData = {
      messages: [
        {
          content: inputContent,
          type: "human"
        }
      ]
    };
    
    // 3. Start the run and collect all updates
    console.log('[LangGraphClient] Starting LangGraph run with transcript data');
    traceStep('processTranscriptForDesign.startRun', { threadId: thread.thread_id });
    const updates = [];
    
    try {
      for await (const chunk of client.runs.stream(
        thread.thread_id,
        "designer_agent",
        {
          input: inputData,
          streamMode: "updates"
        }
      )) {
        console.log(`[LangGraphClient] Received event: ${chunk.event}`);
        updates.push(chunk);
      }
    } catch (streamErr) {
      console.error('[LangGraphClient] Error in streaming updates:', streamErr);
      throw new Error(`Stream processing error: ${streamErr instanceof Error ? streamErr.message : 'Unknown error'}`);
    }
    
    // 4. Update thread state to mark interview as complete
    console.log('[LangGraphClient] Updating thread state to mark interview as complete');
    try {
      await client.threads.updateState(
        thread.thread_id,
        {values: {is_finished: true},
        asNode: "interview_user"}
      );
      console.log('[LangGraphClient] Thread state updated successfully');
    } catch (updateErr) {
      console.error('[LangGraphClient] Error updating thread state:', updateErr);
    }
    
    // 5. Wait for processing to complete and get final state
    console.log('[LangGraphClient] Starting final processing stream');
    try {
      for await (const chunk of client.runs.stream(
        thread.thread_id,
        "designer_agent",
        {
          input: null,
          streamMode: "updates"
        }
      )) {
        console.log(`[LangGraphClient] Processing event: ${chunk.event}`);
        updates.push(chunk);
      }
    } catch (processErr) {
      console.error('[LangGraphClient] Error in final processing stream:', processErr);
    }
    
    // 6. Get the final state with the ERP design
    console.log('[LangGraphClient] Getting final thread state');
    const currentState = await client.threads.getState(thread.thread_id);
    console.log('[LangGraphClient] Retrieved thread state:', currentState ? 'Success' : 'Failed');
    
    // 7. Extract and return the design
    let designData: ERPDesign;
    
    if (currentState?.values && 'erp_design' in currentState.values) {
      designData = currentState.values.erp_design as ERPDesign;
      console.log('[LangGraphClient] Successfully extracted ERP design data');
      
      // Fix: Add null checking here before attempting to access length
      if (!designData.tables) designData.tables = [];
      if (!designData.views) designData.views = [];
      if (!designData.actions) designData.actions = [];
      
      console.log(`[LangGraphClient] Design has ${designData.tables.length} tables and ${designData.views.length} views`);
      traceStep('processTranscriptForDesign.designGenerated', { 
        erpDesign: designData,
        tableCount: designData.tables.length,
        viewCount: designData.views.length
      });
    } else {
      console.error('[LangGraphClient] No ERP design found in state');
      console.error('Current state keys:', currentState?.values ? Object.keys(currentState.values) : 'No values');
      throw new Error('Failed to generate ERP design. Please try again.');
    }
    
    // Store result of successful processing in localStorage for recovery
    try {
      localStorage.setItem('lastSuccessfulDesign', JSON.stringify({
        threadId: thread.thread_id,
        designData,
        timestamp: Date.now()
      }));
      console.log('[LangGraphClient] Saved design to localStorage for recovery');
    } catch (storageErr) {
      console.warn('[LangGraphClient] Could not save design to localStorage:', storageErr);
    }
    
    traceStep('processTranscriptForDesign.complete', { threadId: thread.thread_id });
    return {
      threadId: thread.thread_id,
      designData
    };
  } catch (error) {
    console.error('[LangGraphClient] Processing error:', error);
    traceStep('processTranscriptForDesign.error', { error });
    throw error;
  } finally {
    activeProcessing = false;
    // Wait 30 seconds before clearing the active thread to prevent duplicate processing
    setTimeout(() => {
      activeThread = null; //used this because accessing thread.thread_id directly was causing an error
/*       if (activeThread === thread.thread_id) {
        activeThread = null;
      } */
    }, 30000);
  }
}

// Wrap existing functions with tracing
export const fetchSessionData = withTracing('fetchSessionData', async (threadId: string, checkpointId?: string): Promise<SessionData> => {
  console.log(`[LangGraphClient] fetchSessionData called for thread: ${threadId}${checkpointId ? `, checkpoint: ${checkpointId}` : ''}`);
  
  try {
    // Validate UUID before making the request
    if (!threadId || threadId === 'NONE' || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(threadId)) {
      console.warn('[LangGraphClient] Invalid thread ID format, returning empty data');
      return { values: { } } as unknown as SessionData;
    }
    
    const client = getLangGraphClient();
    
    // If checkpointId is not provided or invalid, get the latest state
    let sessionData: any;
    
    try {
      if (checkpointId && checkpointId !== 'NONE') {
        // Get specific checkpoint if provided
        sessionData = await client.threads.getState(threadId, checkpointId);
      } else {
        // Get latest state if no valid checkpoint
        sessionData = await client.threads.getState(threadId);
      }
    } catch (apiErr) {
      console.error('[LangGraphClient] Error in LangGraph API call:', apiErr);
      return { values: { } } as unknown as SessionData;
    }
    
    console.log(`[LangGraphClient] Session data retrieved: ${sessionData ? 'Success' : 'Failed'}`);
    
    if (sessionData?.values?.erp_design) {
      console.log('[LangGraphClient] ERP design found in session data');
    } else {
      console.warn('[LangGraphClient] No ERP design found in session data');
    }
    
    return sessionData;
  } catch (error) {
    console.error('[LangGraphClient] Error fetching session data:', error);
    
    // Return empty data to prevent crashing
    return { values: { } } as unknown as SessionData;
  }
});

export const saveTranscriptToFile = withTracing('saveTranscriptToFile', async (data: TranscriptSubmissionData): Promise<{ savedPath: string }> => {
  console.log(`[LangGraphClient] saveTranscriptToFile called for company: ${data.companyName}`);
  console.log(`[LangGraphClient] Transcript length: ${data.transcript.length} characters`);
  
  try {
    console.log('[LangGraphClient] Sending transcript to save-transcript API');
    const response = await fetch('/api/save-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.error(`[LangGraphClient] API responded with status: ${response.status}`);
      const errorText = await response.text();
      console.error(`[LangGraphClient] Error response: ${errorText}`);
      throw new Error('Failed to save transcript');
    }
    
    const result = await response.json();
    console.log(`[LangGraphClient] Transcript saved successfully to: ${result.savedPath}`);
    
    return result;
  } catch (error) {
    console.error('[LangGraphClient] Error saving transcript:', error);
    throw error;
  }
});

// New function to check processing status
export function getProcessingStatus(): { isProcessing: boolean, threadId: string | null } {
  return {
    isProcessing: activeProcessing,
    threadId: activeThread
  };
}

// Add a specific function to check if LangGraph server is available
export async function checkLangGraphAvailability(): Promise<boolean> {
  try {
    const client = getLangGraphClient();
    const healthCheck = await fetch(`${LANGGRAPH_URL}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return healthCheck.ok;
  } catch (error) {
    console.error('[LangGraphClient] Server health check failed:', error);
    return false;
  }
}
