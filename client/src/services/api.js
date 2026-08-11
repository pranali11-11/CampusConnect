const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import axios from 'axios';

// Create Axios Instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject token from LocalStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle auth errors + show friendlier message when backend is offline
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Axios: when the server is down/unreachable you typically get:
    // - error.code === 'ERR_CONNECTION_REFUSED'
    // - error.message includes 'Network Error'
    const isBackendUnavailable =
      error?.code === 'ERR_CONNECTION_REFUSED' ||
      error?.message === 'Network Error';

    if (isBackendUnavailable) {
      localStorage.removeItem('token');
      // Don't hard-redirect here (it may break flows like signup). Let pages show UI.
    }

    if (error.response && error.response.status === 401) {
      // Clear expired credentials
      localStorage.removeItem('token');
      
      // If we are not already on the login page, redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
      }
    }

    return Promise.reject(error);
  }
);


export default api;
