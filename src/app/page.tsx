"use client";

import { useState, useEffect } from 'react';
import { UIProvider } from '../context/UIContext';
import Layout from '../components/layout/Layout';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';

export default function Home() {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [currentCheckpointId, setCurrentCheckpointId] = useState<string | null>(null);
  
  // Check for saved state and thread ID on initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // First check savedThreadId directly and clean it
        let savedThreadId = localStorage.getItem('lastThreadId');
        console.log('[Home] Raw saved threadId from localStorage:', savedThreadId);
        
        // Clean the thread ID if it exists
        if (savedThreadId) {
          // Remove any wrapping quotes that might have been inadvertently stored
          savedThreadId = savedThreadId.replace(/^"|"$/g, '');
          console.log('[Home] Cleaned saved threadId:', savedThreadId);
        }
        
        // Also log all keys in localStorage for debugging
        const allKeys = Object.keys(localStorage);
        console.log('[Home] All localStorage keys:', allKeys);
        
        const savedState = localStorage.getItem('experienceState');
        console.log('[Home] Found saved state:', savedState);
        
        // Only set experienceState to 'start' if it doesn't exist
        if (!savedState) {
          console.log('[Home] No saved state found, setting to "start"');
          localStorage.setItem('experienceState', 'start');
        } else {
          console.log('[Home] Using saved state:', savedState);
          
          // Always try to get thread ID regardless of state
          if (savedThreadId) {
            console.log('[Home] Setting current threadId from localStorage:', savedThreadId);
            setCurrentThreadId(savedThreadId);
          } else if (savedState === 'design_ready') {
            // Only warn if we're in design_ready state but no threadId
            console.warn('[Home] State is design_ready but no threadId found in localStorage!');
          }
        }
      } catch (err) {
        console.error('[Home] Error reading from localStorage:', err);
      }
    }
  }, []);

  return (
    <UIProvider>
      <LoadingOverlay />
      <Layout 
        threadId={currentThreadId || "NONE"}
        checkpointId={currentCheckpointId || "NONE"}
      />
    </UIProvider>
  );
}
