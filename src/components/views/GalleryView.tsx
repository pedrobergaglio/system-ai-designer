"use client";

import { View } from '../../lib/types';
import { formatColumnName } from '../../lib/utils';

interface GalleryViewProps {
  view: View;
}

export default function GalleryView({ view }: GalleryViewProps) {
  // Generate 20 identical cards
  const demoCards = Array(20).fill(null);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {demoCards.map((_, index) => (
        <div 
          key={index}
          className="border border-gray-200 rounded-md p-4 transition-all duration-200 hover:shadow-sm bg-white"
        >
          {view.columns_displayed.map((column, colIndex) => (
            <div key={colIndex} className="mb-1">
              {colIndex === 0 ? (
                <h3 className="font-bold">{formatColumnName(column)}</h3>
              ) : (
                <p className="text-gray-600">{formatColumnName(column)}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
