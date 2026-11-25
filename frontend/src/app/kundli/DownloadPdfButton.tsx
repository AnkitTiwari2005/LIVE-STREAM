'use client';

import React, { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import type { Lang } from './kundli-i18n';

interface Props {
  kind: 'kundli' | 'match';
  lang: Lang;
  label: string;
  busyLabel: string;
  failLabel: string;
  getData: () => any;
}

async function fetchBuf(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url, { cache: 'force-cache' });
  if (!r.ok) throw new Error(`asset ${url} ${r.status}`);
  return r.arrayBuffer();
}

/** Builds the PDF in the browser on click. The heavy libraries are loaded only then. */
export default function DownloadPdfButton({ kind, lang, label, busyLabel, failLabel, getData }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const [pdfMod, report, latin, latinBold, deva, devaBold, logo] = await Promise.all([
        import('pdfkit/js/pdfkit.standalone.js' as any),
        import('./pdf/report'),
        fetchBuf('/fonts/pdf/ns400.ttf'),
        fetchBuf('/fonts/pdf/ns700.ttf'),
        fetchBuf('/fonts/pdf/dv400.ttf'),
        fetchBuf('/fonts/pdf/dv700.ttf'),
        fetchBuf('/fonts/pdf/logo-pdf.png').catch(() => null),
      ]);
      const PDF = (pdfMod as any).default ?? pdfMod;
      const assets = { fonts: { latin, latinBold, deva, devaBold }, logo };
      const data = getData();
      const bytes =
        kind === 'kundli'
          ? await report.buildKundliPdf(PDF, assets, data, lang)
          : await report.buildMatchPdf(PDF, assets, data, lang);
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ParamDarshan-${kind === 'kundli' ? 'Kundli' : 'Kundli-Matching'}-${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      console.error('PDF build failed', e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-center gap-1" data-no-translate>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="flex items-center gap-1.5 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition disabled:opacity-60"
      >
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {busy ? busyLabel : label}
      </button>
      {failed && (
        <span role="alert" className="text-[11px] text-red-300">
          {failLabel}
        </span>
      )}
    </span>
  );
}
