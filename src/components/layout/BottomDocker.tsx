"use client";

import React from 'react';
import { useUI } from '@/context/UIContext';
import { InfoIcon, Mic, PanelLeft, PlusCircle } from 'lucide-react';

export function BottomDocker() {
  const { 
    toggleSidebar, 
    toggleVoiceAssistant, 
    toggleInfoPanel,
    isVoiceAssistantOpen, 
    isSidebarOpen,
    isInfoPanelOpen,
    experienceState,
    resetDesignState,
    erpDesign,
    activeView,
    setActiveView
  } = useUI();

  // Filter views that should appear in the main menu
  const mainMenuViews = erpDesign?.views?.filter(view => view.position === 'main_menu') || [];

  // Function to start a new design process
  const handleStartNewDesign = () => {
    resetDesignState(); // Reset current design state
    toggleVoiceAssistant(); // Open voice assistant
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-gray-900 text-white flex items-center justify-between px-4 z-40">
      {/* Left section */}
      <div className="flex items-center space-x-2">
        <button 
          className={`p-2 rounded-md hover:bg-gray-700 ${isSidebarOpen ? 'bg-gray-700' : ''}`}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={18} />
        </button>
      </div>
      
      {/* Center section - show main menu views or status */}
      <div className="flex-grow flex items-center justify-center px-2 overflow-hidden">
        {experienceState === 'design_ready' && mainMenuViews.length > 0 ? (
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide max-w-full">
            {mainMenuViews.map((view) => (
              <button
                key={view.name}
                className={`px-3 py-1 text-sm rounded-md transition-all whitespace-nowrap ${
                  activeView?.name === view.name
                    ? 'bg-white text-gray-900 font-medium'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => setActiveView(view)}
              >
                {view.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm font-medium">
            {experienceState === 'start' && 'Iniciar diseño de sistema ERP'}
            {experienceState === 'interviewing' && 'Entrevista en progreso'}
            {experienceState === 'processing' && 'Procesando diseño...'}
            {experienceState === 'design_ready' && !mainMenuViews.length && 'Sistema ERP diseñado'}
          </div>
        )}
      </div>
      
      {/* Right section */}
      <div className="flex items-center space-x-2">
        <button 
          className={`p-2 rounded-md hover:bg-gray-700 ${isInfoPanelOpen ? 'bg-gray-700' : ''}`}
          onClick={toggleInfoPanel}
          aria-label="Ver información del sistema"
        >
          <InfoIcon size={18} />
        </button>
        
        {/* New button for starting new interview */}
        {experienceState === 'design_ready' && (
          <button 
            className="p-2 rounded-md hover:bg-gray-700 text-blue-400"
            onClick={handleStartNewDesign}
            aria-label="Iniciar nuevo diseño"
          >
            <PlusCircle size={18} />
          </button>
        )}
        
        {/* Voice assistant button only in appropriate states */}
        {(experienceState === 'start' || experienceState === 'interviewing') && (
          <button 
            className={`p-2 rounded-md hover:bg-gray-700 ${isVoiceAssistantOpen ? 'bg-gray-700' : ''}`}
            onClick={toggleVoiceAssistant}
            aria-label="Abrir asistente de voz"
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
