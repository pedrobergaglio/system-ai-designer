"use client";

import { useUI } from '../../context/UIContext';
import ViewContainer from '../views/ViewContainer';

interface MainContentProps {
  isLoading: boolean;
  error: string | null;
}

export default function MainContent({ isLoading, error }: MainContentProps) {
  const { activeView } = useUI();
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 max-w-md text-center p-6">
          <p className="mb-4">We're having trouble loading this content.</p>
          <p className="text-sm">Please try again later.</p>
        </div>
      </div>
    );
  }
  
  if (!activeView) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Select a view to get started</div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h1 className="text-xl font-medium mb-4">{activeView.name}</h1>
      <ViewContainer view={activeView} />
    </div>
  );
}
