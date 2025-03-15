"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ERPDesign, View } from '../lib/types';
import { loadFromLocalStorage, saveToLocalStorage, logger } from '../lib/utils';
import { TranscriptSubmissionData, processTranscriptForDesign } from '../lib/langGraphClient';
import { traceStep } from '../lib/processTracer';
//import { showToast } from '../components/ui/toast';

// Define possible experience flow states
export type ExperienceState = 'start' | 'interviewing' | 'processing' | 'design_ready';

interface UIContextType {
  erpDesign: ERPDesign | null;
  setERPDesign: (design: ERPDesign) => void;
  activeView: View | null;
  setActiveView: (view: View) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isInfoPanelOpen: boolean;
  toggleInfoPanel: () => void;
  isVoiceAssistantOpen: boolean;
  toggleVoiceAssistant: () => void;
  isDesignGenerating: boolean;
  threadId: string | null;
  setThreadId: (threadId: string | null) => void; // Add this line
  generateDesignFromTranscript: (data: TranscriptSubmissionData) => Promise<void>;
  resetDesignState: () => void;
  experienceState: ExperienceState;
  setExperienceState: (state: ExperienceState) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Main states
  const [erpDesign, setERPDesign] = useState<ERPDesign | null>(null);
  const [activeView, setActiveView] = useState<View | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(
    loadFromLocalStorage('isSidebarOpen', true)
  );
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState<boolean>(
    loadFromLocalStorage('isInfoPanelOpen', true)
  );
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState<boolean>(false);
  
  // Design generation states
  const [isDesignGenerating, setIsDesignGenerating] = useState<boolean>(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Experience flow state - ensure it loads the saved state or defaults to 'start'
  const [experienceState, setExperienceState] = useState<ExperienceState>(
    loadFromLocalStorage('experienceState', 'start')
  );

  // Add a flag to track if voice assistant was manually closed
  const [voiceAssistantManuallyToggled, setVoiceAssistantManuallyToggled] = useState<boolean>(false);
  
  // Add a ref to keep track of the previous state to avoid unnecessary updates
  const prevExperienceStateRef = useRef<ExperienceState | null>(null);
  
  // Save active view to localStorage when it changes
  useEffect(() => {
    if (activeView) {
      saveToLocalStorage('activeView', activeView);
    }
  }, [activeView]);
  
  // Save UI state to localStorage when it changes
  useEffect(() => {
    saveToLocalStorage('isSidebarOpen', isSidebarOpen);
    saveToLocalStorage('isInfoPanelOpen', isInfoPanelOpen);
  }, [isSidebarOpen, isInfoPanelOpen]);

  // Save threadId to localStorage when it changes
  useEffect(() => {
    if (threadId) {
      // Make sure we're storing a clean string without extra quotes
      const cleanThreadId = typeof threadId === 'string' ? threadId.replace(/^"|"$/g, '') : threadId;
      console.log('[UIContext] Saving threadId to localStorage:', cleanThreadId);
      saveToLocalStorage('lastThreadId', cleanThreadId);
      
      // Add verification log
      setTimeout(() => {
        const savedId = localStorage.getItem('lastThreadId');
        console.log('[UIContext] Verification - lastThreadId in localStorage:', savedId);
      }, 100);
    }
  }, [threadId]);
  
  // Log the experience state when it changes to help with debugging
  useEffect(() => {
    // Only log and save if the state actually changed
    if (prevExperienceStateRef.current !== experienceState) {
      console.log('[UIContext] Experience state changed from', prevExperienceStateRef.current, 'to:', experienceState);
      saveToLocalStorage('experienceState', experienceState);
      prevExperienceStateRef.current = experienceState;
      
      // Only close voice assistant when transitioning to design_ready
      if (experienceState === 'design_ready') {
        setIsVoiceAssistantOpen(false);
      }
    }
  }, [experienceState]);
  
  // Restore active view from localStorage when erpDesign is loaded
  useEffect(() => {
    if (erpDesign) {
      const savedView = loadFromLocalStorage<View | null>('activeView', null);
      
      if (savedView) {
        // Verify the view still exists in the current design
        const viewExists = erpDesign.views.some(
          v => v.name === savedView.name && v.table === savedView.table
        );
        
        if (viewExists) {
          setActiveView(savedView);
          logger.info('Restored active view from localStorage', savedView);
        } else if (erpDesign.views.length > 0) {
          // Fallback to first view if saved view doesn't exist
          setActiveView(erpDesign.views[0]);
          logger.info('Saved view not found, using first available view', erpDesign.views[0]);
        }
      } else if (erpDesign.views.length > 0) {
        // If no saved view, use first view
        setActiveView(erpDesign.views[0]);
        logger.info('No saved view, using first available view', erpDesign.views[0]);
      }
    }
  }, [erpDesign]);
  
  // Generate design from transcript
  const generateDesignFromTranscript = async (data: TranscriptSubmissionData) => {
    console.log('[UIContext] generateDesignFromTranscript called');
    console.log(`[UIContext] Company: ${data.companyName}, Owner: ${data.ownerName}`);
    console.log(`[UIContext] Transcript length: ${data.transcript.length} characters`);
    traceStep('UIContext.generateDesignFromTranscript.start', { 
      company: data.companyName, 
      owner: data.ownerName 
    });
    
    // Prevent calling this function if already processing
    if (isDesignGenerating) {
      console.warn('[UIContext] Design generation already in progress, preventing duplicate call');
      traceStep('UIContext.generateDesignFromTranscript.alreadyGenerating');
      return;
    }
    
    setIsLoading(true);
    setIsDesignGenerating(true);
    setError(null);
    setExperienceState('processing');
    traceStep('UIContext.generateDesignFromTranscript.stateChanged', { state: 'processing' });
    
    // Save the current state to localStorage to prevent loss on page reload
    saveToLocalStorage('pendingDesignGeneration', {
      companyName: data.companyName,
      ownerName: data.ownerName,
      timestamp: Date.now(),
      transcriptLength: data.transcript.length
    });
    
    try {
      // Hide voice assistant when starting design generation
      setIsVoiceAssistantOpen(false);
      console.log('[UIContext] Voice assistant closed');
      
      logger.info('Starting design generation from transcript', { companyName: data.companyName });
      console.log('[UIContext] Calling processTranscriptForDesign');
      traceStep('UIContext.generateDesignFromTranscript.processStart');
      
      const result = await processTranscriptForDesign(data);
      console.log(`[UIContext] Design generation completed with thread ID: ${result.threadId}`);
      traceStep('UIContext.generateDesignFromTranscript.processComplete', { threadId: result.threadId });
      
      // Handle potential missing data
      if (!result || !result.designData) {
        throw new Error('No design data was returned from LangGraph');
      }
      
      // Make sure all required properties are initialized
      if (!result.designData.tables) result.designData.tables = [];
      if (!result.designData.views) result.designData.views = [];
      if (!result.designData.actions) result.designData.actions = [];
      
      setThreadId(result.threadId);
      console.log('[UIContext] Thread ID set');
      
      setERPDesign(result.designData);
      console.log('[UIContext] ERP design data set');
      
      setExperienceState('design_ready');
      logger.info('Design generation completed', { threadId: result.threadId });
      traceStep('UIContext.generateDesignFromTranscript.designReady');
      
      // Clear pending design generation since it succeeded
      localStorage.removeItem('pendingDesignGeneration');
      
    } catch (err: any) {
      console.error('[UIContext] Design generation error:', err);
      traceStep('UIContext.generateDesignFromTranscript.error', { error: err });
      
      // Reset to start state to prevent infinite loops
      setExperienceState('start');
      
      // Show a user-friendly error toast instead of reopening the assistant
      /* showToast({
        title: 'Error de Generación de Diseño',
        message: 'No se pudo generar el diseño del sistema ERP. Tu transcripción ha sido guardada para análisis.',
        type: 'error',
        duration: 8000
      }); */
      
      setError('No se pudo generar el diseño del sistema ERP.');
      logger.error('Design generation failed', err);
      
    } finally {
      console.log('[UIContext] Finishing design generation process');
      traceStep('UIContext.generateDesignFromTranscript.finished');
      setIsLoading(false);
      setIsDesignGenerating(false);
      
      // Remove pending design flag
      localStorage.removeItem('pendingDesignGeneration');
    }
  };
  
  // Reset design state - update to also clear localStorage values
  const resetDesignState = () => {
    setERPDesign(null);
    setActiveView(null);
    setThreadId(null);
    setError(null);
    setExperienceState('start');
    
    // Clear related localStorage values
    localStorage.removeItem('lastThreadId');
    localStorage.removeItem('experienceState');
    console.log('[UIContext] Reset design state and cleared localStorage values');
  };
  
  // Toggle functions
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleInfoPanel = () => setIsInfoPanelOpen(!isInfoPanelOpen);
  const toggleVoiceAssistant = () => {
    setVoiceAssistantManuallyToggled(true); // Mark as manually toggled
    setIsVoiceAssistantOpen(prev => !prev);
  };
  
  return (
    <UIContext.Provider
      value={{
        erpDesign,
        setERPDesign,
        activeView,
        setActiveView,
        isLoading,
        setIsLoading,
        error,
        setError,
        isSidebarOpen,
        toggleSidebar,
        isInfoPanelOpen,
        toggleInfoPanel,
        isVoiceAssistantOpen,
        toggleVoiceAssistant,
        isDesignGenerating,
        threadId,
        setThreadId, // Add this line
        generateDesignFromTranscript,
        resetDesignState,
        experienceState,
        setExperienceState,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
