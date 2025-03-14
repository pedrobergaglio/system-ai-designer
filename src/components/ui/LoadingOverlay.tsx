import { useUI } from '../../context/UIContext';

export function LoadingOverlay() {
  const { isLoading, isDesignGenerating, error } = useUI();
  
  // Don't render anything if not loading
  if (!isLoading && !isDesignGenerating) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          
          <h3 className="text-lg font-medium mb-2">
            {isDesignGenerating ? 'Generando diseño del sistema ERP' : 'Cargando...'}
          </h3>
          
          <p className="text-gray-600">
            {isDesignGenerating 
              ? 'Procesando la información de la entrevista para crear su sistema personalizado...' 
              : 'Por favor espere...'}
          </p>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
