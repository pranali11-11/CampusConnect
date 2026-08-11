import React from 'react';
import { useToast } from '../../hooks/useToast';
import './ToastAnimations.css';


/**
 * Toast Container component that renders active notifications.
 */
const Toast = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full">

      {toasts.map((toast) => {
        let statusStyles = 'bg-blue-600 border-blue-700 text-white';
        let icon = 'ℹ️';

        if (toast.type === 'success') {
          statusStyles = 'bg-emerald-600 border-emerald-700 text-white';
          icon = '✅';
        } else if (toast.type === 'error') {
          statusStyles = 'bg-rose-600 border-rose-700 text-white';
          icon = '❌';
        } else if (toast.type === 'warning') {
          statusStyles = 'bg-amber-500 border-amber-600 text-white';
          icon = '⚠️';
        }

        return (
          <div
            key={toast.id}
            className={`${statusStyles} border px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between transition-all duration-300 transform translate-y-0 scale-100 animate-[toast-slide-in_300ms_ease-out_both]`}

            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{icon}</span>
              <p className="text-sm font-medium leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white opacity-80 hover:opacity-100 transition-opacity focus:outline-none text-lg font-bold px-1 ml-3"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;
