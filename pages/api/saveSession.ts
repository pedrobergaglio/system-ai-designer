import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs/promises';
import * as path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionData, filename } = req.body;
    
    if (!sessionData || !filename) {
      return res.status(400).json({ error: 'Session data and filename are required' });
    }
    
    // Create directory if it doesn't exist
    const dir = path.join(process.cwd(), 'data');
    await fs.mkdir(dir, { recursive: true });
    
    // Save to file
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));
    
    return res.status(200).json({ 
      success: true, 
      message: `Session data saved to ${filePath}`,
      filePath
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to save session data' });
  }
}
