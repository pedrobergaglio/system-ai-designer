"use client";

import { useUI } from '../../context/UIContext';

export default function BottomDocker() {
  const { 
    erpDesign, 
    activeView, 
    setActiveView,
    toggleVoiceAssistant,
    isVoiceAssistantOpen 
  } = useUI();
  
  // Filter views that should appear in the main menu (bottom docker)
  const mainMenuViews = erpDesign?.views.filter(view => view.position === 'main_menu') || [];
  
  return (
    <div className="h-full border-t border-gray-200 flex items-center justify-center px-4">
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
      <button
        onClick={toggleVoiceAssistant}
        className={`p-2 rounded-md transition-colors ${
          isVoiceAssistantOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
        }`}
        aria-label="Toggle voice assistant"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    </div>
  );
}
