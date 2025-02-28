"use client";

import { useUI } from '../../context/UIContext';

export default function BottomDocker() {
  const { erpDesign, activeView, setActiveView } = useUI();
  
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
    </div>
  );
}
