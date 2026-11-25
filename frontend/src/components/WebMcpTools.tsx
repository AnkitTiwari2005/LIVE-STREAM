'use client';

import { useEffect } from 'react';

/**
 * WebMCP In-Browser Model Context Protocol Tool Provider (SEP-1649 / WebMCP)
 * Registers safe, read-only tools with the browser agent context if supported.
 * Fails completely silently in browsers that do not support navigator.modelContext.
 */
export default function WebMcpTools() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const nav = window.navigator as any;
      if (!nav || !('modelContext' in nav) || typeof nav.modelContext?.registerTool !== 'function') {
        return;
      }

      // Tool 1: Live Darshan Streams Discovery
      nav.modelContext.registerTool({
        name: 'getLiveDarshanStreams',
        description: 'Discover active sacred temple broadcasts, aartis, and upcoming Vedic poojas on Param Darshan',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Optional category filter, e.g. "aarti", "pooja", "kundli"' },
          },
        },
        execute: async (params?: { category?: string }) => {
          try {
            const url = params?.category
              ? `/api/v1/streams?category=${encodeURIComponent(params.category)}`
              : '/api/v1/streams';
            const res = await fetch(url);
            if (!res.ok) return { error: `Failed to fetch streams: ${res.statusText}` };
            return await res.json();
          } catch (e: any) {
            return { error: e.message || 'Stream lookup failed' };
          }
        },
      });

      // Tool 2: Free Vedic Janam Kundli Summary Calculator
      nav.modelContext.registerTool({
        name: 'getKundliSummary',
        description: 'Calculate free Vedic Janam Kundali planetary positions, nakshatra padas, and dasha summary',
        inputSchema: {
          type: 'object',
          properties: {
            dob: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
            tob: { type: 'string', description: 'Time of birth in HH:MM format (24-hour)' },
            lat: { type: 'number', description: 'Birth place latitude (decimal degrees)' },
            lon: { type: 'number', description: 'Birth place longitude (decimal degrees)' },
            tz: { type: 'number', description: 'Timezone offset in hours (default 5.5 for IST)' },
          },
          required: ['dob', 'tob', 'lat', 'lon'],
        },
        execute: async (params: { dob: string; tob: string; lat: number; lon: number; tz?: number }) => {
          try {
            const res = await fetch('/api/v1/kundli/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dob: params.dob,
                tob: params.tob,
                lat: params.lat,
                lon: params.lon,
                tz: params.tz ?? 5.5,
              }),
            });
            if (!res.ok) return { error: `Kundli computation failed: ${res.statusText}` };
            return await res.json();
          } catch (e: any) {
            return { error: e.message || 'Kundli calculation failed' };
          }
        },
      });

      // Tool 3: Platform Overview
      nav.modelContext.registerTool({
        name: 'getPlatformOverview',
        description: 'Get verified information about Param Darshan services, verified pandits, and DPDP Act 2023 compliance',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          return {
            name: 'Param Darshan',
            tagline: 'Sacred Pooja, Live Darshan & Vedic Astrology Streaming Platform',
            currency: 'Sacred Coins (150 coins = ₹100)',
            services: [
              'Public live temple broadcasts',
              'Two-way interactive video private pooja rituals',
              'Public live video guest participation',
              'Free Vedic Kundli and Ashtakoota Milan charts (D1 & D9) with browser PDF export',
              'Verified Vedic Acharyas consultation',
            ],
            compliance: 'DPDP Act 2023 compliant (18+ age verification, zero birth data persistence)',
            support: 'paramdarshan.com@gmail.com',
            phone: '+91-92122-83098',
            whatsapp: '+91-96708-42038',
          };
        },
      });
    } catch {
      // Intentionally silent
    }
  }, []);

  return null;
}
