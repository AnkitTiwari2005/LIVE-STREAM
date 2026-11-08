'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { DiyaIcon } from '@/components/icons/SpiritualIcons';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs: number = 3600) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (msg: string, duration?: number) => showToast(msg, 'success', duration),
    [showToast]
  );
  const error = useCallback(
    (msg: string, duration?: number) => showToast(msg, 'error', duration),
    [showToast]
  );
  const info = useCallback(
    (msg: string, duration?: number) => showToast(msg, 'info', duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast Portal Container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-md"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-y-0 ${
                isError
                  ? 'bg-stone-900/95 border border-red-500/40 text-red-200 shadow-[0_8px_32px_rgba(239,68,68,0.2)]'
                  : isSuccess
                  ? 'bg-stone-900/95 border border-gold/50 text-gold-pale shadow-[0_8px_32px_rgba(245,158,11,0.25)]'
                  : 'bg-stone-900/95 border border-gold/30 text-stone-200 shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0">
                  {isError ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : isSuccess ? (
                    <DiyaIcon size={16} />
                  ) : (
                    <DiyaIcon size={16} />
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium leading-snug break-words">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider
    return {
      showToast: (msg: string) => console.log('[Toast fallback]', msg),
      success: (msg: string) => console.log('[Toast fallback]', msg),
      error: (msg: string) => console.error('[Toast fallback]', msg),
      info: (msg: string) => console.info('[Toast fallback]', msg),
    };
  }
  return ctx;
}
