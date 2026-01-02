
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar a aplicação.");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Erro ao renderizar a aplicação:", error);
  rootElement.innerHTML = `<div style="padding: 20px; color: red;">Erro crítico ao carregar o sistema. Verifique o console.</div>`;
}
