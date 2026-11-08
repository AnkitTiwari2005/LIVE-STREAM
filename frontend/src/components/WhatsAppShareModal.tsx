'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, Lock, ExternalLink, X } from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamTitle: string;
  joinUrl: string;
  password?: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  streamTitle,
  joinUrl,
  password,
}: WhatsAppShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  if (!isOpen) return null;

  const part1Message = `🙏 Namaste! You are invited to attend our private live Pooja session:\n*${streamTitle}*\n\n🔗 Join Link: ${joinUrl}\n\nPlease join on time. Har Har Mahadev!`;
  const whatsAppPart1Url = `https://api.whatsapp.com/send?text=${encodeURIComponent(part1Message)}`;

  const copyToClipboard = (text: string, type: 'link' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/25 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-stone-900 dark:text-foreground">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-green-600 dark:text-green-500" />
          <h3 className="text-lg font-bold text-stone-900 dark:text-foreground">Share Private Pooja Invitation</h3>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 mb-5 leading-relaxed">
          For security, the join link and access password are split into two separate messages so passwords cannot be forwarded accidentally.
        </p>

        {/* Part 1: Join Link */}
        <div className="bg-stone-50 dark:bg-obsidian p-3.5 rounded-xl border border-stone-200 dark:border-gold/20 mb-4">
          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider block mb-1">
            Part 1: Invitation & Join Link
          </span>
          <p className="text-xs text-stone-900 dark:text-foreground font-mono break-all mb-3 bg-white dark:bg-obsidian-soft p-2 rounded border border-stone-200 dark:border-gold/15">
            {joinUrl}
          </p>
          <div className="flex gap-2">
            <a
              href={whatsAppPart1Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Share to WhatsApp
            </a>
            <button
              onClick={() => copyToClipboard(joinUrl, 'link')}
              className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-transparent text-xs py-2 px-3 rounded-lg transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Part 2: Password (if configured) */}
        {password && (
          <div className="bg-amber-50 dark:bg-stone-950 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Part 2: Secret Session Password
            </span>
            <div className="flex items-center justify-between bg-white dark:bg-stone-900 border border-amber-200 dark:border-transparent p-2 rounded mb-3">
              <span className="text-sm font-mono text-amber-800 dark:text-amber-300 font-bold tracking-wider">
                {password}
              </span>
              <button
                onClick={() => copyToClipboard(password, 'pass')}
                className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white flex items-center gap-1"
              >
                {copiedPass ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPass ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-stone-500">
              Send this secret password only to authorized participants.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
