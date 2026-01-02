
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Erro ao renderizar a aplicação:", error);
    rootElement.innerHTML = `
      <div style="padding: 40px; color: white; background: #991b1b; text-align: center; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
        <h2 style="margin-bottom: 10px;">Erro de Inicialização</h2>
        <p>Houve um problema ao carregar o sistema. Por favor, limpe o cache do navegador e tente novamente.</p>
        <div style="margin-top: 20px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
          <pre style="font-size: 12px; white-space: pre-wrap;">${error instanceof Error ? error.stack || error.message : 'Erro desconhecido'}</pre>
        </div>
      </div>
    `;
  }
}
