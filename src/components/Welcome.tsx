"use client";

import { useUI } from '../context/UIContext';

export function Welcome() {
  const { toggleVoiceAssistant, experienceState } = useUI();
  
  // Only show welcome for users in 'start' state
  if (experienceState !== 'start') return null;
  
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-40">
      <div className="max-w-lg p-8 rounded-lg bg-white text-center shadow-xl">
        <h1 className="text-2xl font-bold mb-4">Bienvenido al Diseño de Sistemas ERP</h1>
        
        <p className="mb-6 text-gray-600">
          Comience una entrevista con nuestro consultor de voz para diseñar su sistema ERP personalizado.
          Nuestro asistente recopilará sus requisitos y generará automáticamente un diseño de sistema.
        </p>
        
        <button
          onClick={() => {
            toggleVoiceAssistant();
            // No need to manually set experienceState here as it will be set in the ERPVoiceAssistant component
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Iniciar Entrevista
        </button>
      </div>
    </div>
  );
}
