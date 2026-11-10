'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const confirmBtnClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
      : 'bg-gold hover:bg-gold-deep text-obsidian shadow-lg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-gold/30 shadow-2xl p-6 space-y-4"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              variant === 'danger'
                ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60'
                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="confirm-dialog-title"
              className="font-serif text-lg font-bold text-stone-900 dark:text-white leading-snug"
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-description"
              className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1.5 leading-relaxed"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            autoFocus
            className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition disabled:opacity-50 ${confirmBtnClasses}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
