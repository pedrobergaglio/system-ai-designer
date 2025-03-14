"use client";

import React, { useRef, useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { formatColumnName } from '@/lib/utils';

interface InfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoPanel({ isOpen, onClose }: InfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { erpDesign, threadId } = useUI();
  
  // Section visibility states
  const [sectionsVisible, setSectionsVisible] = useState({
    tables: true,
    views: true,
    automations: true
  });

  // Toggle section visibility
  const toggleSection = (section: 'tables' | 'views' | 'automations') => {
    setSectionsVisible(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Trap focus within the modal when open for accessibility
  useEffect(() => {
    if (!isOpen) return;
    
    const panel = panelRef.current;
    if (!panel) return;
    
    // Set focus to the panel
    panel.focus();
    
    // Prevent scrolling of background content
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div 
        ref={panelRef}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-xl font-bold">Información del Sistema</h2>
            {threadId && (
              <p className="text-xs text-gray-500 mt-1">Thread ID: {threadId}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-6 mt-4">
          {erpDesign ? (
            <>
              {/* Tables Section */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <button
                  className="w-full flex justify-between items-center p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSection('tables')}
                >
                  <h3 className="text-lg font-medium">Tablas ({erpDesign.tables?.length || 0})</h3>
                  {sectionsVisible.tables ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                
                {sectionsVisible.tables && (
                  <div className="p-4 space-y-4">
                    {erpDesign.tables && erpDesign.tables.length > 0 ? (
                      erpDesign.tables.map((table, i) => (
                        <div key={i} className="border border-gray-100 rounded-md p-3">
                          <h4 className="font-bold text-md mb-2">{formatColumnName(table.name)}</h4>
                          <p className="text-gray-600 text-sm mb-3">{table.description}</p>
                          
                          <div className="bg-gray-50 p-3 rounded">
                            <h5 className="font-medium text-sm mb-2">Columnas:</h5>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {table.columns.map((column, j) => (
                                <li key={j} className="text-sm">
                                  {formatColumnName(column)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No hay tablas definidas.</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Views Section */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <button
                  className="w-full flex justify-between items-center p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSection('views')}
                >
                  <h3 className="text-lg font-medium">Vistas ({erpDesign.views?.length || 0})</h3>
                  {sectionsVisible.views ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                
                {sectionsVisible.views && (
                  <div className="p-4 space-y-4">
                    {erpDesign.views && erpDesign.views.length > 0 ? (
                      erpDesign.views.map((view, i) => (
                        <div key={i} className="border border-gray-100 rounded-md p-3">
                          <h4 className="font-bold text-md mb-2">{formatColumnName(view.name)}</h4>
                          <p className="text-gray-600 text-sm mb-2">Tabla: {formatColumnName(view.table)}</p>
                         
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No hay vistas definidas.</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Automations Section */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <button
                  className="w-full flex justify-between items-center p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSection('automations')}
                >
                  <h3 className="text-lg font-medium">Automatizaciones ({erpDesign.actions?.length || 0})</h3>
                  {sectionsVisible.automations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                
                {sectionsVisible.automations && (
                  <div className="p-4 space-y-4">
                    {erpDesign.actions && erpDesign.actions.length > 0 ? (
                      erpDesign.actions.map((action, i) => (
                        <div key={i} className="border border-gray-100 rounded-md p-3">
                          <h4 className="font-bold text-md mb-2">{formatColumnName(action.name)}</h4>
                          <p className="text-gray-600 text-sm mb-2">Tabla: {formatColumnName(action.table)}</p>
                          <p className="text-gray-600 text-sm mb-3">{action.description}</p>
                          
                          <div className="bg-gray-50 p-3 rounded">
                            <h5 className="font-medium text-sm mb-2">Pasos:</h5>
                            <ol className="list-decimal list-inside space-y-1">
                              {action.steps.map((step, j) => (
                                <li key={j} className="text-sm">{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No hay automatizaciones definidas.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-center p-8">
              No hay información del sistema disponible.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
