import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchSessionData } from '../../lib/langGraphClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { threadId, checkpointId } = req.body;
    
    if (!threadId || !checkpointId) {
      return res.status(400).json({ error: 'Thread ID and Checkpoint ID are required' });
    }
    
    // Fetch session data
    const sessionData = await fetchSessionData(threadId, checkpointId);
    
    // Save to file using the saveSession API
    const filename = `session_${threadId}_${checkpointId}.json`;
    
    // Call our save session API
    const saveResponse = await fetch(`${req.headers.origin}/api/saveSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionData, filename })
    });
    
    const saveResult = await saveResponse.json();
    
    if (!saveResult.success) {
      console.warn('Failed to save session data to file:', saveResult.error);
    }
    
    return res.status(200).json({ 
      success: true, 
      data: sessionData,
      savedToFile: saveResult.success,
      filename: saveResult.success ? filename : null
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch session data' });
  }
}
