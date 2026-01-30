// console.log("%c[DEBUG 1] index.tsx: Script execution has started.", "color: red; font-weight: bold;");
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// console.log("[DEBUG 2] index.tsx: About to render the App component.");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);