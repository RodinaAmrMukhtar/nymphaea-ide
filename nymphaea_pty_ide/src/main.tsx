
try {
  const badKeys = [
    "nymphaea-theme",
    "nymphaea-selected-theme",
    "theme",
    "active-theme"
  ];
  for (const key of badKeys) {
    const value = localStorage.getItem(key);
    if (value && value.toLowerCase().includes("black")) {
      localStorage.removeItem(key);
    }
  }
} catch {}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
