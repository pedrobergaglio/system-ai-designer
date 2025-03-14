"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { defaultPlaygroundState } from "../../data/playground-state";
import { Transcript, TranscriptNoShow, getTranscriptContent } from '@/components/layout/transcript';
import { AgentProvider } from "@/hooks/use-agent";
import { useConnection } from "@/hooks/use-connection";
import { useUI } from '@/context/UIContext';
import { TranscriptSubmissionData } from '@/lib/langGraphClient';
import { RpcInvocationData } from 'livekit-client';
import { traceStep } from '@/lib/processTracer';
import { getProcessingStatus } from '@/lib/langGraphClient';

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
  const [accessToken, setToken] = useState<string>('');
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  
  // Company and owner information from function calls
  const [companyName, setCompanyName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [isFinishingConversation, setIsFinishingConversation] = useState(false);

  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const scrollButtonRef = useRef<HTMLButtonElement>(null);
  
  // Access UI context for design generation
  const { 
    generateDesignFromTranscript, 
    isDesignGenerating, 
    toggleVoiceAssistant,
    setExperienceState,
    experienceState
  } = useUI();

  const createRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('Creando sala...');
      
      // Only set experience state to interviewing if we're currently in the 'start' state
      // This prevents overriding the design_ready state 
      if (experienceState === 'start') {
        setExperienceState('interviewing'); 
        console.log('[ERPVoiceAssistant] Setting experience state to interviewing');
      }

      const response = await fetch('/api/token/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la sala');
      }

      setRoom(data.roomName);
      setToken(data.accessToken);
      setLivekitUrl(data.livekitUrl);
      setConnectionStatus(`Conectado a la sala ${data.roomName}`);
      setConnected(true);
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error inesperado');
      setConnectionStatus('Error de conexión');
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
  
  // Function to handle the finishConversation event from the agent
  const handleFinishConversation = async (data: { companyName?: string, ownerName?: string }) => {
    console.log('[ERPVoiceAssistant] handleFinishConversation called with data:', data);
    traceStep('handleFinishConversation.start', data);
    
    // Check if we're already processing a design
    const processingStatus = getProcessingStatus();
    if (processingStatus.isProcessing) {
      console.warn('[ERPVoiceAssistant] Design generation already in progress! Thread ID:', processingStatus.threadId);
      traceStep('handleFinishConversation.alreadyProcessing', processingStatus);
      return;
    }
    
    // Set state only once to prevent duplicate processing
    if (isFinishingConversation) {
      console.warn('[ERPVoiceAssistant] Already finishing conversation, ignoring duplicate call');
      traceStep('handleFinishConversation.duplicateIgnored');
      return;
    }
    
    setIsFinishingConversation(true);
    setExperienceState('processing');
    traceStep('handleFinishConversation.setState', { state: 'processing' });
    
    // Store company and owner names
    if (data.companyName) {
      console.log(`[ERPVoiceAssistant] Setting company name: ${data.companyName}`);
      setCompanyName(data.companyName);
    } else {
      console.warn('[ERPVoiceAssistant] No company name provided!');
    }
    
    if (data.ownerName) {
      console.log(`[ERPVoiceAssistant] Setting owner name: ${data.ownerName}`);
      setOwnerName(data.ownerName);
    } else {
      console.warn('[ERPVoiceAssistant] No owner name provided!');
    }
    
    try {
      // Get the transcript content
      console.log('[ERPVoiceAssistant] Getting transcript content');
      const transcriptText = getTranscriptContent();
      
      console.log(`[ERPVoiceAssistant] Got transcript of length: ${transcriptText?.length || 0} chars`);
      console.log('[ERPVoiceAssistant] Transcript preview: ' + 
        (transcriptText ? transcriptText.substring(0, 100) + '...' : 'EMPTY'));
      
      if (!transcriptText) {
        console.error('[ERPVoiceAssistant] No transcript found!');
        throw new Error('No se pudo obtener la transcripción de la conversación');
      }
      
      // Parse transcript to extract company/owner if not provided by the function call
      if (!data.companyName || !data.ownerName) {
        console.log('[ERPVoiceAssistant] Attempting to extract company/owner from transcript');
        
        const companyMatches = transcriptText.match(/[eE]mpresa:?\s*"?([^"\n]+)"?/g) || 
                              transcriptText.match(/[cC]ompañía:?\s*"?([^"\n]+)"?/g) ||
                              transcriptText.match(/[cC]ompany:?\s*"?([^"\n]+)"?/g);
                              
        const ownerMatches = transcriptText.match(/[dD]ueño:?\s*"?([^"\n]+)"?/g) || 
                            transcriptText.match(/[pP]ropietario:?\s*"?([^"\n]+)"?/g) ||
                            transcriptText.match(/[oO]wner:?\s*"?([^"\n]+)"?/g) ||
                            transcriptText.match(/[cC]ontacto:?\s*"?([^"\n]+)"?/g);
        
        if (companyMatches && !data.companyName) {
          const extracted = companyMatches[0].replace(/[eE]mpresa:?\s*"?|[cC]ompañía:?\s*"?|[cC]ompany:?\s*"?/g, '').replace(/["\n]/g, '').trim();
          console.log(`[ERPVoiceAssistant] Extracted company from transcript: ${extracted}`);
          setCompanyName(extracted);
        }
        
        if (ownerMatches && !data.ownerName) {
          const extracted = ownerMatches[0].replace(/[dD]ueño:?\s*"?|[pP]ropietario:?\s*"?|[oO]wner:?\s*"?|[cC]ontacto:?\s*"?/g, '').replace(/["\n]/g, '').trim();
          console.log(`[ERPVoiceAssistant] Extracted owner from transcript: ${extracted}`);
          setOwnerName(extracted);
        }
      }
      
      // Prepare submission data
      const submissionData: TranscriptSubmissionData = {
        companyName: data.companyName || companyName || 'Empresa Sin Nombre',
        ownerName: data.ownerName || ownerName || 'Usuario',
        transcript: transcriptText
      };
      
      console.log('[ERPVoiceAssistant] Preparing to generate design with data:', {
        companyName: submissionData.companyName,
        ownerName: submissionData.ownerName,
        transcriptLength: submissionData.transcript.length
      });
      
      // Save transcript immediately as a backup
      console.log('[ERPVoiceAssistant] Saving transcript backup');
      traceStep('handleFinishConversation.saveTranscript');
      try {
        const saveResponse = await fetch('/api/save-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData)
        });
        
        if (!saveResponse.ok) {
          throw new Error(`Failed to save transcript: ${saveResponse.status} ${saveResponse.statusText}`);
        }
        
        console.log('[ERPVoiceAssistant] Backup transcript saved successfully');
        traceStep('handleFinishConversation.saveTranscriptSuccess');
      } catch (backupErr) {
        console.error('[ERPVoiceAssistant] Error saving backup transcript:', backupErr);
        traceStep('handleFinishConversation.saveTranscriptError', { error: backupErr });
      }
      
      // Use a cleaner approach - no setTimeout
      console.log('[ERPVoiceAssistant] Starting design generation process');
      traceStep('handleFinishConversation.startDesignGeneration');
      
      try {
        await generateDesignFromTranscript(submissionData);
        traceStep('handleFinishConversation.designGenerationComplete');
        console.log('[ERPVoiceAssistant] Design generation completed, closing voice assistant');
        
        // Close the voice assistant panel
        if (onClose) onClose();
      } catch (genErr) {
        console.error('[ERPVoiceAssistant] Error in design generation:', genErr);
        traceStep('handleFinishConversation.designGenerationError', { error: genErr });
        setError(`Error en generación del diseño: ${genErr instanceof Error ? genErr.message : String(genErr)}`);
        setIsFinishingConversation(false); // Allow retry
      }
    } catch (err: unknown) {
      console.error('[ERPVoiceAssistant] Error in finishing conversation:', err);
      setError(`Error al finalizar la conversación: ${err instanceof Error ? err.message : String(err)}`);
      
      // Try to save the transcript even on error
      try {
        console.log('[ERPVoiceAssistant] Attempting emergency transcript save');
        const transcriptText = getTranscriptContent();
        if (transcriptText) {
          const emergencyData = {
            companyName: companyName || 'EMERGENCY_SAVE_COMPANY',
            ownerName: ownerName || 'EMERGENCY_SAVE_USER',
            transcript: transcriptText
          };
          
          await fetch('/api/save-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emergencyData)
          });
          console.log('[ERPVoiceAssistant] Emergency transcript save successful');
        }
      } catch (saveErr) {
        console.error('[ERPVoiceAssistant] Emergency transcript save failed:', saveErr);
      }
    }
  };

  // Add an effect to properly handle closing behavior
  useEffect(() => {
    // Close assistant when the experience state changes to design_ready
    const handleExperienceStateChange = () => {
      if (experienceState === 'design_ready' && onClose) {
        console.log('[ERPVoiceAssistant] Design ready, closing voice assistant');
        onClose();
      }
    };
    
    handleExperienceStateChange();
  }, [experienceState, onClose]);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-900 text-white p-3 flex justify-between items-center">
        <h2 className="text-sm">Entrevistador</h2>
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
        <div className="flex-1 flex flex-col h-full max-h-[100hvr] overflow-hidden">
          {accessToken && livekitUrl && (
            <LiveKitRoom
              token={accessToken}
              serverUrl={livekitUrl}
              connect={true}
              audio={true}
              video={false}
              style={{ "--lk-bg": "white" } as React.CSSProperties}
              options={{
                publishDefaults: {
                  stopMicTrackOnMute: true,
                },
              }}
              onDisconnected={() => {
                setConnectionStatus('Desconectado');
                setConnected(false);
              }}
              onError={(err) => {
                setError(`Error de conexión: ${err.message}`);
                setConnected(false);
              }}
            >
              <AgentProvider>
                {isFinishingConversation ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <h3 className="text-lg font-medium mb-2">Generando diseño del sistema ERP</h3>
                      <p className="text-gray-600">
                        Procesando la información recopilada para {companyName || 'su empresa'}...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-none h-[200px]">
                      <SimpleVoiceAssistant />
                    </div>
                    <RoomAudioRenderer />
                    <div 
                      className="flex-1 overflow-y-auto relative min-h-0 max-h-[calc(100vh-400px)]"
                      ref={transcriptContainerRef}
                      style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
                    >
                    </div>
                  </>
                )}
                
                {/* Add the invisible transcript manager */}
                <TranscriptNoShow 
                  filePath={`erp-conversation-${room.replace(/\s+/g, '-')}.txt`}
                  autoSaveInterval={60000} // Save every minute
                />
                
                {/* Register function handlers for agent tool calls */}
                <div style={{ display: 'none' }}>
                  {/* This will be available for the agent to call via RPC */}
                  <RpcMethodHandler
                    onFinishConversation={handleFinishConversation}
                  />
                </div>
              </AgentProvider>
            </LiveKitRoom>
          )}
        </div>
      )}
    </div>
  );
}

// Component to register RPC methods for agent function calls
function RpcMethodHandler({ 
  onFinishConversation 
}: { 
  onFinishConversation: (data: { companyName?: string, ownerName?: string }) => void 
}) {
  const { localParticipant } = useLocalParticipant();
  const [rpcRegistered, setRpcRegistered] = useState(false);
  const methodRegistrationRef = useRef<string[]>([]);
  
  // Safe method to register RPC handlers without duplicates
  const safeRegisterRpc = useCallback((participant: any, method: string, handler: (data: any) => Promise<any>) => {
    if (methodRegistrationRef.current.includes(method)) {
      console.log(`[RpcMethodHandler] Method ${method} already registered, skipping`);
      return;
    }
    
    try {
      participant.registerRpcMethod(method, handler);
      methodRegistrationRef.current.push(method);
      console.log(`[RpcMethodHandler] Successfully registered ${method}`);
    } catch (err) {
      console.error(`[RpcMethodHandler] Error registering ${method}:`, err);
    }
  }, []);
  
  // Handle clean disconnection
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear state on page unload
      localStorage.setItem('erp_conversation_state', 'closed');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  
  useEffect(() => {
    if (localParticipant && !rpcRegistered) {
      console.log('[RpcMethodHandler] Registering function handlers with participant:', localParticipant.identity);
      traceStep('RpcMethodHandler.register');
      
      // Clear previous registrations
      methodRegistrationRef.current = [];
      
      // Register the finishConversation method only once
      safeRegisterRpc(
        localParticipant,
        "function_call.finishConversation",
        async (data: RpcInvocationData) => {
          traceStep('RPC.finishConversation.received', { data: data.payload });
          try {
            // Debug raw data first
            console.log("[RpcMethodHandler] Function call received: finishConversation");
            console.log("[RpcMethodHandler] Raw data object:", data);
            console.log("[RpcMethodHandler] Raw payload type:", typeof data.payload);
            console.log("[RpcMethodHandler] Raw payload:", data.payload);
            
            // Try to parse the payload - this is the most critical part
            let params: any = {};
            
            try {
              // The payload should be a JSON string containing the parameters
              if (typeof data.payload === 'string') {
                params = JSON.parse(data.payload);
                console.log("[RpcMethodHandler] Successfully parsed payload string:", params);
              } else if (typeof data.payload === 'object') {
                // Already an object
                params = data.payload;
                console.log("[RpcMethodHandler] Payload is already an object:", params);
              }
            } catch (parseError) {
              console.error("[RpcMethodHandler] Error parsing payload:", parseError);
              
              // Try to extract parameters directly from the string if JSON parsing fails
              if (typeof data.payload === 'string') {
                const companyNameMatch = data.payload.match(/companyName["']?\s*:\s*["']([^"']+)["']/i);
                const ownerNameMatch = data.payload.match(/ownerName["']?\s*:\s*["']([^"']+)["']/i);
                
                params = {
                  companyName: companyNameMatch ? companyNameMatch[1] : "Empresa Sin Nombre",
                  ownerName: ownerNameMatch ? ownerNameMatch[1] : "Usuario"
                };
                
                console.log("[RpcMethodHandler] Extracted parameters from string:", params);
              }
            }
            
            // Extract parameters with fallback options
            const companyName = params.companyName || "Empresa Sin Nombre";
            const ownerName = params.ownerName || "Usuario";
            
            console.log("[RpcMethodHandler] Final parameters for finishConversation:", { 
              companyName, ownerName 
            });
            
            // Log to debug API
            try {
              await fetch('/api/debug-function-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  function: "finishConversation",
                  rawPayload: data.payload,
                  parsedParams: { companyName, ownerName }
                })
              });
            } catch (webhookError) {
              console.error("[RpcMethodHandler] Failed to log function call:", webhookError);
            }
            
            // Call the handler with company and owner names
            await onFinishConversation({
              companyName,
              ownerName
            });
            
            console.log("[RpcMethodHandler] Successfully called onFinishConversation handler");
            traceStep('RPC.finishConversation.completed');
            
            return JSON.stringify({
              success: true,
              message: "Finalizando conversación y comenzando diseño del sistema ERP"
            });
          } catch (e) {
            console.error("[RpcMethodHandler] Error processing finishConversation:", e);
            
            // Send error to debug API
            try {
              await fetch('/api/debug-function-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  function: "finishConversation",
                  error: e instanceof Error ? e.message : String(e),
                  rawPayload: data.payload
                })
              });
            } catch (webhookError) {
              console.error("[RpcMethodHandler] Failed to log error:", webhookError);
            }
            
            // Still try to complete with default values
            try {
              onFinishConversation({
                companyName: "Empresa Sin Nombre (Error)",
                ownerName: "Usuario (Error)"
              });
              console.log("[RpcMethodHandler] Fallback completed with default values");
            } catch (fallbackError) {
              console.error("[RpcMethodHandler] Even the fallback failed:", fallbackError);
            }
            
            return JSON.stringify({
              success: false,
              error: "Error al procesar la solicitud: " + (e instanceof Error ? e.message : String(e))
            });
          }
        }
      );
      
      // Add debug function to help us see what's happening
      safeRegisterRpc(
        localParticipant,
        "function_call.debug",
        async (data: RpcInvocationData) => {
          console.log("[DEBUG FUNCTION] Called with payload:", data.payload);
          
          // Log to debug API
          try {
            await fetch('/api/debug-function-call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                function: "debug",
                payload: data.payload
              })
            });
          } catch (webhookError) {
            console.error("[DEBUG FUNCTION] Failed to log debug call:", webhookError);
          }
          
          return JSON.stringify({ success: true, message: "Debug info received" });
        }
      );
      
      console.log('[RpcMethodHandler] Successfully registered all RPC methods');
      setRpcRegistered(true);
      traceStep('RpcMethodHandler.registered');
    } else if (!localParticipant) {
      console.warn('[RpcMethodHandler] localParticipant is not available, cannot register RPC methods');
      traceStep('RpcMethodHandler.noParticipant');
    }
    
    return () => {
      console.log('[RpcMethodHandler] Cleaning up RPC method registrations');
      // Clear registrations list on unmount
      methodRegistrationRef.current = [];
    };
  }, [localParticipant, onFinishConversation, rpcRegistered, safeRegisterRpc]);
  
  // This component doesn't render anything
  return null;
}
