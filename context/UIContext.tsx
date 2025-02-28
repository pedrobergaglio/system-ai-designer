"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ERPDesign, View } from '../lib/types';
import { loadFromLocalStorage, saveToLocalStorage, logger } from '../lib/utils';

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
  
  // Toggle functions
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleInfoPanel = () => setIsInfoPanelOpen(!isInfoPanelOpen);
  
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
        toggleInfoPanel
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
