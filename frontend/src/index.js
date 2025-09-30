// frontend/src/index.js (VERSIÓN FINAL Y CORRECTA)
import React from 'react';
import ReactDOM from 'react-dom/client';
// 1. Asegúrate de importar HashRouter
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. Asegúrate de envolver App con HashRouter */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);