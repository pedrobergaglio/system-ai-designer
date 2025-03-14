"use client";

import { useUI } from '../../context/UIContext';

export default function BottomDocker() {
  const { 
    erpDesign, 
    activeView, 
    setActiveView,
    toggleVoiceAssistant,
    isVoiceAssistantOpen,
    resetDesignState 
  } = useUI();
  
  // Filter views that should appear in the main menu (bottom docker)
  const mainMenuViews = erpDesign?.views.filter(view => view.position === 'main_menu') || [];
  
  // Function to start a new design process
  const handleStartNewDesign = () => {
    resetDesignState(); // Reset current design state
    toggleVoiceAssistant(); // Open voice assistant
  };

  return (
    <div className="h-full flex items-center justify-between px-4 bg-gray-50">
      <div className="flex-shrink-0 flex items-center">
        <button 
          onClick={handleStartNewDesign}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-bold whitespace-nowrap"
        >
          Nuevo Diseño
        </button>
      </div>
      
      <div className="flex space-x-4 overflow-x-auto py-2 w-full">
        {mainMenuViews.map((view) => (
          <button
            key={view.name}
            className={`px-4 py-2 whitespace-nowrap rounded-md transition-all duration-200 ${
              activeView?.name === view.name
                ? 'bg-gray-900 text-white'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => setActiveView(view)}
          >
            {view.name}
          </button>
        ))}
      </div>
      
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleVoiceAssistant}
          className={`px-4 py-2 ${
            isVoiceAssistantOpen 
              ? 'bg-gray-200 text-gray-800' 
              : 'bg-gray-800 text-white'
          } rounded-md hover:opacity-90 transition-colors flex items-center`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
          {isVoiceAssistantOpen ? 'Cerrar Asistente' : 'Asistente de Voz'}
        </button>
      </div>
    </div>
  );
}
