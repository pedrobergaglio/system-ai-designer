"use client";

import { useState, useEffect } from 'react';
import { UIProvider } from '../context/UIContext';
import Layout from '../components/layout/Layout';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { Welcome } from '../components/Welcome'; // We'll create this component

export default function Home() {
  const [isDesignReady, setIsDesignReady] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [currentCheckpointId, setCurrentCheckpointId] = useState<string | null>(null);
  
  // Default thread and checkpoint IDs for loading pre-existing design
  const defaultThreadId = '2c7e37b5-3f28-4c9f-9aff-4a365aa3f474';
  const defaultCheckpointId = '1eff6109-d964-6fd8-802f-dfe308d7aa96';

  return (
    <UIProvider>
      {/* The loading overlay appears when isLoading or isDesignGenerating is true */}
      <LoadingOverlay />
      
      
      {/* Main layout with either the current design or default design */}
      <Layout 
        threadId={currentThreadId || "NONE"} // || defaultThreadId} 
        checkpointId={currentCheckpointId || "NONE"} //defaultCheckpointId} 
      />
    </UIProvider>
  );
}
