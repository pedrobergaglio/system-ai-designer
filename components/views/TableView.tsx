"use client";

import { View } from '../../lib/types';
import { formatColumnName } from '../../lib/utils';

interface TableViewProps {
  view: View;
}

export default function TableView({ view }: TableViewProps) {
  // Generate 20 identical rows
  const demoRows = Array(20).fill(null);
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {view.columns_displayed.map((column, index) => (
              <th
                key={index}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {formatColumnName(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {demoRows.map((_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {view.columns_displayed.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className="px-6 py-4 whitespace-nowrap text-sm"
                >
                  {formatColumnName(column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
