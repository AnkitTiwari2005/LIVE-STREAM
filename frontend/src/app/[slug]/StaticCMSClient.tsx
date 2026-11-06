'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, FileText } from 'lucide-react';

export default function StaticCMSClient() {
  const { slug } = useParams() as { slug: string };
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPage() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      try {
        const res = await fetch(`${apiUrl}/admin/pages/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPage(data);
        }
      } catch (err) {
        console.error('Failed to load static page', err);
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-stone-400 text-sm">
        Loading legal & policy information...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-400">
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-sm">The requested document could not be located.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
        <div className="flex items-center gap-2 mb-4 text-orange-400 text-xs font-semibold uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          Official Shubhdarshan Document
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4">{page.title}</h1>
        <div className="flex items-center gap-2 text-stone-400 text-xs mb-8 pb-4 border-b border-stone-800">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          DPDP Act 2023 & Indian IT Rules 2021 Compliant
        </div>
        <div
          className="prose prose-invert max-w-none text-stone-300 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: page.contentHtml || page.content }}
        />
      </div>
    </div>
  );
}
