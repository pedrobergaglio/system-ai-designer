"use client";

import { View } from '../../lib/types';
import { formatColumnName } from '../../lib/utils';

interface BoardViewProps {
  view: View;
}

export default function BoardView({ view }: BoardViewProps) {
  // Board has three fixed columns
  const columns = ["Pending", "Ongoing", "Done"];
  
  // Generate ~7 cards per column
  const demoCards = Array(7).fill(null);
  
  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {columns.map((column, colIndex) => (
        <div 
          key={colIndex} 
          className="flex-shrink-0 w-72 bg-gray-50 rounded-md p-3"
        >
          <h3 className="font-medium mb-3 text-center">{column}</h3>
          
          <div className="space-y-3">
            {demoCards.map((_, cardIndex) => (
              <div 
                key={cardIndex}
                className="bg-white border border-gray-200 rounded-md p-3 transition-all duration-200 hover:shadow-sm"
              >
                {view.columns_displayed.map((column, colIndex) => (
                  <div key={colIndex} className="mb-1">
                    {colIndex === 0 ? (
                      <h4 className="font-bold">{formatColumnName(column)}</h4>
                    ) : (
                      <p>{formatColumnName(column)}</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
