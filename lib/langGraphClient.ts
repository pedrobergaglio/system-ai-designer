import { Client } from "@langchain/langgraph-sdk";
import { SessionData } from './types';

const URL = "http://localhost:8123";

/**
 * Fetches session data for a specific thread and checkpoint
 */
export async function fetchSessionData(threadId: string, checkpointId: string): Promise<SessionData> {
  try {
    console.log(`Fetching session data for thread: ${threadId}, checkpoint: ${checkpointId}`);
    
    // Initialize LangGraph client
    const client = new Client({ apiUrl: URL });
    
    // Get thread state for the specific checkpoint
    const sessionState = await client.threads.getState(threadId, checkpointId );
    
    return sessionState as unknown as SessionData;
  } catch (error) {
    console.error("Error fetching session data:", error);
    throw error;
  }
}
