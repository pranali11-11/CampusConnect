import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

/**
 * Toast Notifications Provider wrapper.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  /**
   * Triggers a new toast message.
   * @param {string} message - Text to display.
   * @param {'success'|'error'|'info'|'warning'} type - Category of toast.
   */
  const showToast = useCallback((message, type = 'info') => {
    setToasts((prev) => {
      // Prevent duplicate toasts if the same message & type is already active
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }
      const id = Math.random().toString(36).substring(2, 9);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToasts((active) => active.filter((toast) => toast.id !== id));
      }, 3000);

      return [...prev, { id, message, type }];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Hook to trigger toast notification alerts from any child component.
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
