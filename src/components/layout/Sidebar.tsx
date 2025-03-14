"use client";

import { useUI } from '../../context/UIContext';
import { View } from '../../lib/types';

export default function Sidebar() {
  const { erpDesign, activeView, setActiveView } = useUI();
  
  // Filter views that should appear in the sidebar
  const sideMenuViews = erpDesign?.views.filter(view => view.position === 'side_menu') || [];
  
  return (
    <div className="h-full border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-sm">Views</h2>
      </div>
      
      <nav className="p-2">
        <ul className="space-y-1">
          {sideMenuViews.map((view) => (
            <li key={view.name}>
              <button
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${
                  activeView?.name === view.name
                    ? 'bg-gray-100 font-sm'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setActiveView(view)}
              >
                {view.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
