"use client";

import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
} from '@livekit/components-react';
import '@livekit/components-styles';

export default function ERPConsultation() {
  const [room, setRoom] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const createRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('Creating room...');

      const response = await fetch('/api/livekit/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `erp-consultation-${Date.now()}`,
          participantName: `user-${Date.now().toString().slice(-4)}`,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      // Log connection details (remove in production)
      console.log('Connection details:', {
        roomName: data.roomName,
        livekitUrl: data.livekitUrl,
        tokenLength: data.token?.length
      });

      setRoom(data.roomName);
      setToken(data.token);
      setLivekitUrl(data.livekitUrl);
      setConnectionStatus(`Room created: ${data.roomName}. Connecting...`);
      setConnected(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setConnectionStatus('Connection failed');
      console.error('Room creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {!connected ? (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 className="text-2xl font-bold mb-6 text-center">ERP System Design Consultation</h1>
            
            {error && (
              <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}
            
            <p className="mb-6 text-gray-700">
              Connect with our AI consultant to discuss your ERP system design needs. Our expert will help gather requirements and provide recommendations.
            </p>
            
            <button
              onClick={createRoom}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-200 font-medium"
            >
              {loading ? 'Connecting...' : 'Start Consultation'}
            </button>
            
            {connectionStatus && (
              <div className="mt-4 text-sm text-gray-600">{connectionStatus}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full h-full">
          {token && livekitUrl && (
            <LiveKitRoom
              token={token}
              serverUrl={livekitUrl}
              connect={true}
              video={false}
              audio={true}
              onDisconnected={(reason) => {
                setConnectionStatus(`Disconnected from room: ${reason || 'unknown reason'}`);
                console.log('Disconnected from LiveKit room:', reason);
              }}
              onError={(error) => {
                const errorMsg = `LiveKit error: ${error.message}`;
                setError(errorMsg);
                setConnectionStatus('Connection error');
                console.error('LiveKit error details:', error);
              }}
              onConnected={() => {
                setConnectionStatus('Connected to room! Waiting for agent...');
                console.log('Connected to LiveKit room:', room);
              }}
            >
              <div className="flex flex-col h-full p-4">
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full max-w-lg bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-5 bg-blue-600 text-white">
                      <h2 className="text-lg font-semibold">ERP System Consultation</h2>
                      <p className="text-sm opacity-90">Speak with our AI consultant</p>
                    </div>
                    
                    <SimpleVoiceAssistant />
                    
                    <div className="p-4 border-t text-sm text-gray-600">
                      {connectionStatus}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <VoiceAssistantControlBar />
                </div>
                
                <RoomAudioRenderer />
              </div>
            </LiveKitRoom>
          )}
        </div>
      )}
    </div>
  );
}

function SimpleVoiceAssistant() {
  const { state, audioTrack } = useVoiceAssistant();
  return (
    <div className="h-80 flex flex-col items-center justify-center bg-gray-50 p-4">
      <BarVisualizer 
        state={state} 
        barCount={20} 
        trackRef={audioTrack} 
        style={{
          width: '100%',
          height: '120px',
          marginBottom: '1rem'
        }} 
      />
      
      <div className="py-3 px-5 rounded-full bg-gray-100 text-gray-700 font-medium">
        {/* {state === 'idle' && 'Waiting for response...'} */}
        {state === 'speaking' && 'AI is speaking...'}
        {state === 'listening' && 'Listening to you...'}
        {state === 'connecting' && 'Connecting...'}
      </div>
    </div>
  );
}
