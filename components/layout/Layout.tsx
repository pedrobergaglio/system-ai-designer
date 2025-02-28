"use client";

import { useEffect } from 'react';
import { useUI } from '../../context/UIContext';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import BottomDocker from './BottomDocker';
import InfoPanel from './InfoPanel';
import MobileNav from './MobileNav';
import { fetchSessionData } from '../../lib/langGraphClient';
import { logger } from '../../lib/utils';

interface LayoutProps {
  threadId: string;
  checkpointId: string;
}

export default function Layout({ threadId, checkpointId }: LayoutProps) {
  const {
    setERPDesign,
    isLoading,
    setIsLoading,
    error,
    setError,
    isSidebarOpen,
    isInfoPanelOpen
  } = useUI();
  
  // Fetch data from LangGraph
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        logger.info('Fetching session data...', { threadId, checkpointId });
        const sessionData = await fetchSessionData(threadId, checkpointId);
        
        if (sessionData?.values?.erp_design) {
          setERPDesign(sessionData.values.erp_design);
          logger.info('ERP design loaded successfully');
        } else {
          throw new Error('ERP design data not found in session');
        }
      } catch (err) {
        logger.error('Failed to load ERP design', err);
        setError('Unable to load the design. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [threadId, checkpointId, setERPDesign, setIsLoading, setError]);
  
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-black">
      {/* Mobile Navigation - Only visible on small screens */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on mobile */}
        <div 
          className={`hidden md:block transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          {isSidebarOpen && <Sidebar />}
        </div>
        
        {/* Main content area - Grows to fill available space */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MainContent isLoading={isLoading} error={error} />
          
          {/* Bottom docker */}
          <div className="h-16 border-t border-gray-200">
            <BottomDocker />
          </div>
        </div>
        
        {/* Info Panel - Hidden on mobile */}
        <div 
          className={`hidden md:block transition-all duration-300 ease-in-out ${
            isInfoPanelOpen ? 'w-72' : 'w-0'
          }`}
        >
          {isInfoPanelOpen && <InfoPanel />}
        </div>
      </div>
    </div>
  );
}
