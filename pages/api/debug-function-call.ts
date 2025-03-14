import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API] debug-function-call called with method:', req.method);
  
  if (req.method !== 'POST') {
    console.log('[API] debug-function-call rejected: invalid method');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const data = req.body;
    console.log(`[API] debug-function-call: Received data`, data);
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    const debugDir = path.join(dataDir, 'debug');
    
    console.log(`[API] debug-function-call: checking directories: ${dataDir} and ${debugDir}`);
    
    if (!fs.existsSync(dataDir)) {
      console.log(`[API] debug-function-call: creating data directory ${dataDir}`);
      fs.mkdirSync(dataDir);
    }
    
    if (!fs.existsSync(debugDir)) {
      console.log(`[API] debug-function-call: creating debug directory ${debugDir}`);
      fs.mkdirSync(debugDir);
    }
    
    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `function-call-${timestamp}.json`;
    const filePath = path.join(debugDir, filename);
    
    console.log(`[API] debug-function-call: saving data to ${filePath}`);
    
    // Format data to save
    const dataToSave = {
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Write data to file
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    console.log(`[API] debug-function-call: successfully saved debug data`);
    
    return res.status(200).json({ 
      success: true, 
      savedPath: filePath,
      message: 'Debug data saved successfully' 
    });
  } catch (error) {
    console.error('[API] debug-function-call error:', error);
    return res.status(500).json({ 
      error: 'Error saving debug data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
