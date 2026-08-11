/*
 * CampusConnect – Frontend Entry Point
 *
 * Setup commands:
 *   npm create vite@latest client -- --template react
 *   cd client
 *   npm install react-router-dom axios tailwindcss postcss autoprefixer
 *   npx tailwindcss init -p
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// AuthProvider + ToastProvider are wrapped inside App.jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
