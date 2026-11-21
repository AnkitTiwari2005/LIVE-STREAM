'use client';

import React from 'react';
import { northCells, southCells, wrapItems, cellSignLabel, type ChartModel } from './kundli-chart';
import type { Lang } from './kundli-i18n';

interface Props {
  model: ChartModel;
  style: 'north' | 'south';
  lang: Lang;
  title: string;
  label: string; // accessible description
}

/**
 * Local SVG chart. Text is real SVG text, so it is language-aware, selectable and sharp at any size.
 * Colours follow the page (obsidian / gold) and do not depend on the upstream renderer.
 */
export default function KundliChart({ model, style, lang, title, label }: Props) {
  const cells = style === 'north' ? northCells() : southCells();
  const stroke = '#C9A24B';
  const ink = '#F5E7C4';
  const faint = 'rgba(201,162,75,0.75)';
  const fontFam = lang === 'hi' ? "'Noto Sans Devanagari','Plus Jakarta Sans',sans-serif" : "'Plus Jakarta Sans',sans-serif";

  const signToHouse = new Map<number, number>();
  model.houses.forEach((h, i) => signToHouse.set(h.sign, i));

  return (
    <svg viewBox="0 0 400 400" role="img" aria-label={label} className="w-full h-full" data-no-translate>
      <title>{label}</title>
      <rect x="1" y="1" width="398" height="398" fill="none" stroke={stroke} strokeWidth="2" />
      {style === 'north' ? (
        <>
          <line x1="0" y1="0" x2="400" y2="400" stroke={stroke} strokeWidth="1.2" />
          <line x1="400" y1="0" x2="0" y2="400" stroke={stroke} strokeWidth="1.2" />
          <polygon points="200,0 400,200 200,400 0,200" fill="none" stroke={stroke} strokeWidth="1.2" />
        </>
      ) : (
        <>
          <line x1="100" y1="0" x2="100" y2="400" stroke={stroke} strokeWidth="1.2" />
          <line x1="300" y1="0" x2="300" y2="400" stroke={stroke} strokeWidth="1.2" />
          <line x1="0" y1="100" x2="400" y2="100" stroke={stroke} strokeWidth="1.2" />
          <line x1="0" y1="300" x2="400" y2="300" stroke={stroke} strokeWidth="1.2" />
          <line x1="200" y1="0" x2="200" y2="100" stroke={stroke} strokeWidth="1.2" />
          <line x1="200" y1="300" x2="200" y2="400" stroke={stroke} strokeWidth="1.2" />
          <line x1="0" y1="200" x2="100" y2="200" stroke={stroke} strokeWidth="1.2" />
          <line x1="300" y1="200" x2="400" y2="200" stroke={stroke} strokeWidth="1.2" />
          <text x="200" y="196" textAnchor="middle" fontSize="19" fontWeight="700" fill={ink} fontFamily={fontFam}>
            {title}
          </text>
        </>
      )}
      {cells.map((c, idx) => {
        const hIdx = style === 'north' ? c.house - 1 : signToHouse.get(c.sign) ?? 0;
        const house = model.houses[hIdx];
        const signIdx = style === 'north' ? house.sign : c.sign;
        const lines = wrapItems(house.items, c.perLine);
        const isLagna = hIdx === 0 && !model.fromMoon;
        return (
          <g key={idx}>
            {style === 'south' && isLagna && (
              <line x1={c.poly[0][0]} y1={c.poly[0][1] + 20} x2={c.poly[0][0] + 20} y2={c.poly[0][1]} stroke={stroke} strokeWidth="1.6" />
            )}
            <text x={c.nx} y={c.ny} textAnchor="middle" fontSize={style === 'north' ? 15 : 11} fill={faint} fontFamily={fontFam}>
              {cellSignLabel(style, signIdx, lang)}
            </text>
            {lines.map((ln, i) => (
              <text
                key={i}
                x={c.cx}
                y={c.cy - ((lines.length - 1) * 8.5) + i * 17 + 4}
                textAnchor="middle"
                fontSize="14.5"
                fontWeight="600"
                fill={ink}
                fontFamily={fontFam}
              >
                {ln}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
