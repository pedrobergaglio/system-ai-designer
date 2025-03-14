"use client";

import { useEffect, useRef } from 'react';
import { useUI } from '../../context/UIContext';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import BottomDocker from './BottomDocker';
import InfoPanel from './InfoPanel';
import MobileNav from './MobileNav';
import ERPVoiceAssistant from '../voice/ERPVoiceAssistant';
import { fetchSessionData } from '../../lib/langGraphClient';
import { logger } from '../../lib/utils';
import { ConnectionProvider } from '../../hooks/use-connection';
import { Welcome } from '../Welcome';  // Make sure this import is present

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
    experienceState
  } = useUI();
  
  // Use ref to track if we've already loaded data to prevent infinite loops
  const hasLoadedDataRef = useRef<boolean>(false);
  
  // Fetch data from LangGraph based on experience state
  useEffect(() => {
    // Skip fetch if we're in the start or interviewing state
    if (experienceState === 'start' || experienceState === 'interviewing') {
      console.log('[Layout] Skipping design fetch - user is in initial experience state:', experienceState);
      return;
    }
    
    // Function to fetch data from LangGraph
    const fetchData = async () => {
      // Skip fetch if design is already being loaded or we've already loaded data for this thread/checkpoint
      if (isLoading || hasLoadedDataRef.current) return;
      
      try {
        console.log('[Layout] Starting data fetch', { 
          threadId: generatedThreadId || threadId,
          checkpointId,
          isLoading,
          experienceState,
          hasLoadedData: hasLoadedDataRef.current
        });
        
        setIsLoading(true);
        setError(null);
        
        // Use generated threadId if available, otherwise use the provided threadId
        const activeThreadId = generatedThreadId || threadId;
        const activeCheckpointId = checkpointId;
        
        logger.info('Fetching session data...', { activeThreadId, activeCheckpointId });
        const sessionData = await fetchSessionData(activeThreadId, activeCheckpointId);
        
        if (sessionData?.values?.erp_design) {
          setERPDesign(sessionData.values.erp_design);
          logger.info('ERP design loaded successfully');
          hasLoadedDataRef.current = true;
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
    
    // If thread ID changes, reset the loaded flag
    if (generatedThreadId && generatedThreadId !== threadId) {
      hasLoadedDataRef.current = false;
    }
    
    // Only fetch if we have a threadId and haven't already loaded data
    if ((threadId || generatedThreadId) && !hasLoadedDataRef.current) {
      fetchData();
    }
  }, [threadId, checkpointId, generatedThreadId, experienceState, setERPDesign, setIsLoading, setError, isLoading]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-black">
      {/* Welcome overlay for new users */}
      <Welcome />
      
      {/* Mobile Navigation */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`hidden md:block transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          {isSidebarOpen && <Sidebar />}
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MainContent isLoading={isLoading} error={error} />
          
          <div className="h-16 border-t border-gray-200">
            <BottomDocker />
          </div>
        </div>
        
        {/* Info Panel */}
        <div 
          className={`hidden md:block transition-all duration-300 ease-in-out ${
            isInfoPanelOpen ? 'w-72' : 'w-0'
          }`}
        >
          {isInfoPanelOpen && <InfoPanel />}
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
                <ERPVoiceAssistant onClose={toggleVoiceAssistant} />
              </ConnectionProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
