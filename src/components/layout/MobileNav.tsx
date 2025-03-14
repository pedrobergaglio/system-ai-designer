"use client";

import { useState } from 'react';
import { useUI } from '../../context/UIContext';
import { View } from '../../lib/types';

export default function MobileNav() {
  const { erpDesign, activeView, setActiveView } = useUI();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Filter views for side menu
  const sideMenuViews = erpDesign?.views.filter(view => view.position === 'side_menu') || [];
  
  const handleViewSelect = (view: View) => {
    setActiveView(view);
    setIsMenuOpen(false);
  };
  
  return (
    <>
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <button
          className="p-2"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        
        <h1 className="text-lg font-medium">
          {activeView ? activeView.name : 'ERP Designer'}
        </h1>
        
        <div className="w-8"></div> {/* Placeholder for balance */}
      </div>
      
      {/* Mobile Sidebar */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium">Views</h2>
              <button 
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="p-2">
              <ul className="space-y-1">
                {sideMenuViews.map((view) => (
                  <li key={view.name}>
                    <button
                      className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${
                        activeView?.name === view.name
                          ? 'bg-gray-100 font-medium'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleViewSelect(view)}
                    >
                      {view.name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
