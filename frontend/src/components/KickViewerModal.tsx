'use client';

import React, { useEffect, useState } from 'react';
import { X, UserX } from 'lucide-react';
import type { Socket } from 'socket.io-client';

interface KickViewerModalProps {
  streamId: string;
  identity: string;
  displayName: string;
  onClose: () => void;
  socket?: Socket | null;
}

export function KickViewerModal({
  streamId,
  identity,
  displayName,
  onClose,
  socket,
}: KickViewerModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState<'kick' | 'block' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, onClose]);

  const handleAction = async (block: boolean) => {
    setLoading(block ? 'block' : 'kick');
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/streams/${streamId}/viewers/${encodeURIComponent(identity)}/kick`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ block, reason: reason.trim() || undefined }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Request failed (${res.status})`);
      }
      // Refresh viewer list in studio
      if (socket) {
        socket.emit('stream:viewer_list:request', { streamId });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4"
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kick-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl p-6 space-y-4 text-stone-900 dark:text-white"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={!!loading}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-6">
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 shrink-0 shadow-sm">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <h3 id="kick-modal-title" className="font-bold text-stone-900 dark:text-white text-base">
              Remove Viewer
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
              {displayName}
            </p>
          </div>
        </div>

        {/* Reason field */}
        <div>
          <label
            htmlFor="kick-reason"
            className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
          >
            Reason (optional)
          </label>
          <input
            id="kick-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 255))}
            placeholder="Disruptive behaviour…"
            disabled={!!loading}
            className="w-full rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600 disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg px-3 py-2 border border-red-200 dark:border-red-800/50">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleAction(false)}
            disabled={!!loading}
            className="w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            {loading === 'kick' ? 'Removing…' : 'Remove (can rejoin)'}
          </button>
          <button
            type="button"
            onClick={() => handleAction(true)}
            disabled={!!loading}
            className="w-full py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm"
          >
            {loading === 'block' ? 'Blocking…' : 'Remove & Block'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={!!loading}
            className="w-full py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white text-sm transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
