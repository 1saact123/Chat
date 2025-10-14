import React from 'react';

const TailwindTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-strong p-8 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">
            ¡Tailwind CSS Funcionando!
          </h1>
          
          <p className="text-secondary-600 mb-6">
            El sistema de diseño está configurado correctamente
          </p>
          
          <div className="space-y-3">
            <button className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
              Botón Primario
            </button>
            
            <button className="w-full bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200">
              Botón Secundario
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              ✅ Tailwind CSS está funcionando correctamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindTest;