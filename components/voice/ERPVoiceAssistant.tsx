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
import { defaultPlaygroundState } from "../../data/playground-state";

// Status display component for voice assistant
function AssistantStatus({ state, connectionStatus }: { state: string, connectionStatus: string }) {
  return (
    <div className="py-2 px-4 text-sm">
      <div className="py-2 px-3 rounded-full bg-gray-100 text-gray-700 text-center text-sm font-medium mb-2">
        {state === 'speaking' && 'IA hablando...'}
        {state === 'listening' && 'Escuchándote...'}
        {state === 'connecting' && 'Conectando...'}
        {state === 'idle' && 'Listo'}
      </div>
      <div className="text-xs text-gray-500">{connectionStatus}</div>
    </div>
  );
}

// Visualization component 
function SimpleVoiceAssistant() {
  const { state, audioTrack } = useVoiceAssistant();
  return (
      <div className="h-[300px] max-w-[120vw] mx-auto">
        {/* <div className="h-[300px] max-w-[90vw] mx-auto flex flex-col items-center justify-center bg-gray-50 p-2 h-40"> */}
      <BarVisualizer
        state={state}
        barCount={5}
        trackRef={audioTrack}
        className="agent-visualizer"
        options={{ minHeight: 24 }}
      />
      <AssistantStatus state={state} connectionStatus="" />
    </div>
  );
}

export interface ERPVoiceAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ERPVoiceAssistant({ isOpen = true, onClose }: ERPVoiceAssistantProps) {
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

      const response = await fetch('/api/token/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        //body: JSON.stringify(defaultPlaygroundState)
        /* JSON.stringify({
          roomName: `erp-consultation-${Date.now()}`,
          participantName: `user-${Date.now().toString().slice(-4)}`,
        }), */
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setRoom(data.roomName);
      setToken(data.token);
      setLivekitUrl(data.livekitUrl);
      setConnectionStatus(`Connected to room ${data.roomName}`);
      setConnected(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setConnectionStatus('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  // Connect when the component opens
  useEffect(() => {
    if (isOpen && !connected && !loading) {
      createRoom();
    }
  }, [isOpen, connected, loading]);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-black text-white p-3 flex justify-between items-center">
        <h2 className="text-sm font-bold">ERP Consultant</h2>
        {onClose && (
          <button onClick={onClose} className="text-white text-sm hover:bg-gray-400 rounded p-1">
            ✕
          </button>
        )}
      </div>
      
      {error ? (
        <div className="p-3 bg-red-50 text-red-700 text-sm">
          {error}
          <button 
            onClick={createRoom}
            className="mt-2 bg-gray-500 text-white text-xs py-1 px-2 rounded w-full"
          >
            Reconectar
          </button>
        </div>
      ) : !connected ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">Conectar con el consultor</p>
            <button
              onClick={createRoom}
              disabled={loading}
              className="bg-gray-400 text-white text-sm py-2 px-3 rounded disabled:opacity-50"
            >
              {loading ? 'Conectando...' : 'Iniciar Consulta'}
            </button>
            {connectionStatus && (
              <p className="mt-2 text-xs text-gray-500">{connectionStatus}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {token && livekitUrl && (
            <LiveKitRoom
              token={token}
              serverUrl={livekitUrl}
              connect={true}
              audio={true}
              video={false}
              onDisconnected={() => {
            setConnectionStatus('Disconnected');
            setConnected(false);
              }}
              onError={(err) => {
            setError(`Connection error: ${err.message}`);
            setConnected(false);
              }}
            >
              <div className="flex-1 h-full overflow-y-auto">
            <SimpleVoiceAssistant />
              </div>
              <div className="border-t border-gray-200 p-2">
            <VoiceAssistantControlBar />
            <RoomAudioRenderer />
              </div>
            </LiveKitRoom>
          )}
        </div>
      )}
    </div>
  );
}
