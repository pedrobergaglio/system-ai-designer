"use client";

import { useEffect, useRef } from 'react';
import { useUI } from '../../context/UIContext';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { BottomDocker } from './BottomDocker';
import { InfoPanel } from '../ui/InfoPanel';
import MobileNav from './MobileNav';
import ERPVoiceAssistant from '../voice/ERPVoiceAssistant';
import { fetchSessionData } from '../../lib/langGraphClient';
import { logger } from '../../lib/utils';
import { ConnectionProvider } from '../../hooks/use-connection';

interface LayoutProps {
  threadId: string;
  checkpointId: string;
}

export default function Layout({ threadId, checkpointId }: LayoutProps) {
  const {
    setERPDesign,
    isLoading,
    setIsLoading,
    error,
    setError,
    isSidebarOpen,
    isInfoPanelOpen,
    isVoiceAssistantOpen,
    toggleVoiceAssistant,
    threadId: generatedThreadId,
    setThreadId,
    experienceState,
    setExperienceState,
    toggleInfoPanel,
  } = useUI();

  // Use refs to track loaded data and prevent infinite loops
  const hasLoadedDataRef = useRef<boolean>(false);
  const loadedThreadIdRef = useRef<string | null>(null);
  
  // Function to fetch data from LangGraph - defined first to avoid "used before declaration" error
  const fetchData = async () => {
    const currentThreadId = generatedThreadId || threadId;
    
    // CRITICAL FIX: Check if we already loaded this specific thread ID
    if (loadedThreadIdRef.current === currentThreadId) {
      console.log('[Layout] Already loaded data for this thread ID, skipping fetch:', currentThreadId);
      return;
    }
    
    // Skip fetch if design is already being loaded
    if (isLoading) {
      console.log('[Layout] Already loading data, skipping duplicate fetch');
      return;
    }
    
    try {
      console.log('[Layout] Starting data fetch', { 
        threadId: currentThreadId,
        checkpointId,
        isLoading,
        experienceState,
        hasLoadedData: hasLoadedDataRef.current
      });
      
      setIsLoading(true);
      setError(null);
      
      logger.info('Fetching session data...', { activeThreadId: currentThreadId, activeCheckpointId: checkpointId });
      const sessionData = await fetchSessionData(currentThreadId, checkpointId);
      
      if (sessionData?.values?.erp_design) {
        setERPDesign(sessionData.values.erp_design);
        logger.info('ERP design loaded successfully');
        
        // CRITICAL FIX: Mark this specific threadId as loaded
        hasLoadedDataRef.current = true;
        loadedThreadIdRef.current = currentThreadId;
        console.log('[Layout] Marked thread as loaded:', currentThreadId);
        
        // Keep experience state as design_ready after successful fetch
        if (experienceState === 'processing') {
          console.log('[Layout] Setting experience state to design_ready after successful fetch');
          setExperienceState('design_ready');
        }
      } else {
        throw new Error('ERP design data not found in session');
      }
    } catch (err) {
      logger.error('Failed to load ERP design', err);
      setError('No se pudo cargar el diseño. Por favor intente nuevamente más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add another useEffect to ensure the stored threadId is applied to context
  useEffect(() => {
    // If we have a valid threadId from props but not in context, set it
    if (threadId && threadId !== 'NONE' && !generatedThreadId) {
      console.log('[Layout] Setting saved threadId in context:', threadId);
      setThreadId(threadId);
    }
    
    // Log all relevant threadId values for debugging
    console.log('[Layout] ThreadId values:', {
      propsThreadId: threadId,
      generatedThreadId,
      storedInLocalStorage: typeof window !== 'undefined' ? localStorage.getItem('lastThreadId') : null
    });
  }, [threadId, generatedThreadId, setThreadId]);
  
  // Fetch data from LangGraph based on experience state
  useEffect(() => {
    // Only log state change once per mount
    console.log('[Layout] Current experience state:', experienceState, 'hasLoadedData:', hasLoadedDataRef.current);
    
    // Important: If we're in design_ready state but haven't loaded data yet, and have a valid threadId,
    // force a fetch even in design_ready state (for page reloads)
    const activeThreadId = generatedThreadId || threadId; // Changed variable name to avoid redeclaration
    if (experienceState === 'design_ready' && 
        !hasLoadedDataRef.current && 
        activeThreadId && 
        activeThreadId !== 'NONE') {
      console.log('[Layout] In design_ready state with valid threadId but no data, forcing fetch with threadId', activeThreadId);
      fetchData();
      return;
    }

    // IMPORTANT FIX: Only prevent interviewing state AFTER design is loaded successfully
    // And only if we have already loaded data for this specific thread
    if (hasLoadedDataRef.current && 
        loadedThreadIdRef.current && 
        experienceState === 'interviewing' &&
        loadedThreadIdRef.current === (generatedThreadId || threadId)) {
      console.log('[Layout] Preventing incorrect state change back to interviewing');
      setExperienceState('design_ready');
      return;
    }

    // Skip fetch if we're in the start or interviewing state
    // But don't force a state change!
    if (experienceState === 'start' || experienceState === 'interviewing') {
      console.log('[Layout] Skipping design fetch - user is in initial experience state:', experienceState);
      return;
    }
    
    // If thread ID changes, reset the loaded flag
    if (generatedThreadId && generatedThreadId !== loadedThreadIdRef.current) {
      console.log('[Layout] Thread ID changed, will reload data:', generatedThreadId);
      hasLoadedDataRef.current = false;
      loadedThreadIdRef.current = null;
    }
    
    // Only fetch if we have a threadId and either:
    // 1. Haven't loaded data yet, or
    // 2. The threadId has changed
    const effectiveThreadId = generatedThreadId || threadId; // Changed variable name to avoid redeclaration
    
    // IMPORTANT: Log and validate the threadId before making decisions
    console.log('[Layout] Checking if we should fetch:', { 
      effectiveThreadId,
      loadedThreadId: loadedThreadIdRef.current,
      hasLoadedData: hasLoadedDataRef.current,
      isValidThreadId: effectiveThreadId && effectiveThreadId !== 'NONE'
    });
    
    const shouldFetch = effectiveThreadId && 
                       effectiveThreadId !== 'NONE' && 
                       loadedThreadIdRef.current !== effectiveThreadId;

    console.log('[Layout] Should fetch data:', shouldFetch, 'for threadId:', effectiveThreadId, 'loadedThreadId:', loadedThreadIdRef.current);

    
    if (shouldFetch) {
      fetchData();
    } else {
      console.log('[Layout] Skipping fetch - no need to reload data');
    }
  }, [threadId, checkpointId, generatedThreadId, experienceState, setERPDesign, setIsLoading, setError, isLoading, setExperienceState]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile navigation */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
      
      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          {isSidebarOpen && <Sidebar />}
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MainContent isLoading={isLoading} error={error} />
          
          <div className=""> {/* "h-16 border-t border-gray-200" */}
            <BottomDocker />
          </div>
        </div>
        
        {/* Voice Assistant Panel */}
        <div 
          className={`transition-all duration-300 ease-in-out border-l border-gray-200 ${
            isVoiceAssistantOpen ? 'w-80' : 'w-0'
          }`}
        >
          {isVoiceAssistantOpen && (
            <div className="h-full flex flex-col">
              <ConnectionProvider>
                <ERPVoiceAssistant isOpen={isVoiceAssistantOpen} onClose={toggleVoiceAssistant} />
              </ConnectionProvider>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal Info Panel */}
      <InfoPanel 
        isOpen={isInfoPanelOpen} 
        onClose={toggleInfoPanel} 
      />
    </div>
  );
}
