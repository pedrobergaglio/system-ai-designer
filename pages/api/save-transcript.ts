import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API] save-transcript called with method:', req.method);
  //console.log('[API] save-transcript headers:', req.headers);
  console.log('[API] save-transcript body preview:', 
    req.body ? `${JSON.stringify(req.body).substring(0, 200)}...` : 'No body');
  
  if (req.method !== 'POST') {
    console.log('[API] save-transcript rejected: invalid method');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  try {
    const { companyName, ownerName, transcript } = req.body;
    console.log(`[API] save-transcript: processing request for company "${companyName}"`);
    console.log(`[API] save-transcript: owner name provided: ${ownerName ? 'Yes' : 'No'}`);
    console.log(`[API] save-transcript: transcript length: ${transcript?.length || 0} characters`);
    
    if (!transcript) {
      console.log('[API] save-transcript rejected: missing transcript');
      return res.status(400).json({ error: 'Falta la transcripción' });
    }
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    const transcriptionsDir = path.join(dataDir, 'transcriptions');
    
    console.log(`[API] save-transcript: checking directories: ${dataDir} and ${transcriptionsDir}`);
    
    if (!fs.existsSync(dataDir)) {
      console.log(`[API] save-transcript: creating data directory ${dataDir}`);
      fs.mkdirSync(dataDir);
    }
    
    if (!fs.existsSync(transcriptionsDir)) {
      console.log(`[API] save-transcript: creating transcriptions directory ${transcriptionsDir}`);
      fs.mkdirSync(transcriptionsDir);
    }
    
    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedCompanyName = (companyName || 'unknown-company').replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${sanitizedCompanyName}-${timestamp}.json`;
    const filePath = path.join(transcriptionsDir, filename);
    
    console.log(`[API] save-transcript: saving transcript to ${filePath}`);
    
    // Format data to save
    const dataToSave = {
      companyName: companyName || 'Desconocida',
      ownerName: ownerName || 'Desconocido',
      timestamp: new Date().toISOString(),
      transcript,
    };
    
    // Write data to file
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    console.log(`[API] save-transcript: successfully saved transcript (${transcript.length} bytes)`);
    
    return res.status(200).json({ 
      success: true, 
      savedPath: filePath,
      message: 'Transcripción guardada correctamente' 
    });
  } catch (error) {
    console.error('[API] save-transcript error:', error);
    return res.status(500).json({ 
      error: 'Error al guardar la transcripción',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
