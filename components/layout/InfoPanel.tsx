"use client";

import { useState } from 'react';
import { useUI } from '../../context/UIContext';
import { formatColumnName } from '../../lib/utils';

export default function InfoPanel() {
  const { erpDesign } = useUI();
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>({});
  
  if (!erpDesign) return null;
  
  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };
  
  const toggleAction = (actionName: string) => {
    setExpandedActions(prev => ({
      ...prev,
      [actionName]: !prev[actionName]
    }));
  };
  
  return (
    <div className="h-full border-l border-gray-200 overflow-y-auto p-4">
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-3">Tables</h2>
        <div className="space-y-2">
          {erpDesign.tables.map((table) => (
            <div key={table.name} className="border border-gray-200 rounded-md overflow-hidden">
              <button
                className="w-full flex justify-between items-center p-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => toggleTable(table.name)}
              >
                <span className="font-medium">{table.name}</span>
                <span>{expandedTables[table.name] ? '−' : '+'}</span>
              </button>
              
              {expandedTables[table.name] && (
                <div className="p-3 border-t border-gray-200 text-sm">
                  <p className="text-gray-600 mb-2">{table.description}</p>
                  <div className="mt-2">
                    <h4 className="font-medium mb-1">Columns:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {table.columns.map((column, i) => (
                        <li key={i}>{column}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-medium mb-3">Actions & Automations</h2>
        <div className="space-y-2">
          {erpDesign.actions.map((action) => (
            <div key={action.name} className="border border-gray-200 rounded-md overflow-hidden">
              <button
                className="w-full flex justify-between items-center p-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => toggleAction(action.name)}
              >
                <span className="font-medium">{action.name}</span>
                <span>{expandedActions[action.name] ? '−' : '+'}</span>
              </button>
              
              {expandedActions[action.name] && (
                <div className="p-3 border-t border-gray-200 text-sm">
                  <p className="text-gray-600 mb-2">{action.description}</p>
                  <p className="mb-1"><span className="font-medium">Table:</span> {action.table}</p>
                  <p className="font-medium mb-1">Steps:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    {action.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
