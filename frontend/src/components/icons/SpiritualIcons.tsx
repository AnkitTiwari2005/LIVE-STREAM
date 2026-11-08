import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

/**
 * 1. Sacred Om Symbol (Aum) with Divine Solar/Saffron Radiant Aura
 */
export function OmIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="omGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <radialGradient id="omHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Background Divine Halo */}
      <circle cx="24" cy="24" r="22" fill="url(#omHalo)" />
      {/* Sacred Om Devanagari Glyph Path */}
      <path
        d="M20.5 14.5C18.5 12 15 12.5 13 15C11 17.5 11.5 21 14.5 23C12 24.5 10.5 28 11.5 31.5C12.8 35.5 17.5 37 21.5 35.5C24.5 34.3 26 31.5 26 29C26 26.5 24 25 21.5 24.5C25.5 23 27 18 24.5 15.5C23.5 14.5 22 14.5 20.5 14.5ZM21.5 28.5C23.5 29.5 23 32.5 20.5 33C17.5 33.5 14.5 32 14 29.5C13.5 27 16 26 18.5 26.5C19.8 26.8 20.8 27.5 21.5 28.5ZM20 20C18 20.5 15.5 19.5 15 17.5C14.5 15.5 16.5 14.5 18.5 14.5C20.5 14.5 22 16 21.5 18C21.2 19 20.8 19.5 20 20Z"
        fill="url(#omGrad)"
      />
      {/* Right Sweeping Curve */}
      <path
        d="M23 23C26.5 24 33 26 32 32C31.5 35 28.5 37 25 36"
        stroke="url(#omGrad)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Upper Crescent (Chandrabindu base) */}
      <path
        d="M27 13.5C29 15.5 33.5 15.5 35.5 13.5"
        stroke="url(#omGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Bindu (The Sacred Supreme Consciousness Point) */}
      <circle cx="31.2" cy="10" r="2" fill="url(#omGrad)" />
    </svg>
  );
}

/**
 * 2. Sacred Diya / Deepak (Traditional Brass Lamp with Glowing Flame)
 */
export function DiyaIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="brassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <linearGradient id="flameOuter" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>
        <radialGradient id="flameCore" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Glowing Teardrop Flame */}
      <path
        d="M24 6C24 6 17 17 17 22C17 25.866 20.134 29 24 29C27.866 29 31 25.866 31 22C31 17 24 6 24 6Z"
        fill="url(#flameOuter)"
      />
      {/* Flame Inner Luminous Core */}
      <ellipse cx="24" cy="22" rx="4" ry="6" fill="url(#flameCore)" />
      {/* Brass Diya Vessel Bowl */}
      <path
        d="M8 28C8 28 11 40 24 40C37 40 40 28 40 28C40 28 35 32 24 32C13 32 8 28 8 28Z"
        fill="url(#brassGrad)"
      />
      {/* Diya Base Stand */}
      <path
        d="M18 39H30L32 43H16L18 39Z"
        fill="url(#brassGrad)"
      />
    </svg>
  );
}

/**
 * 3. Sacred Gold Coin (Embossed Minted Vedic Coin with High-Contrast White ॐ)
 */
export function CoinIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      {/* 1. Outer Coin Base with Rich Vedic Amber Rim */}
      <circle cx="24" cy="24" r="22" fill="#d97706" stroke="#b45309" strokeWidth="1.5" />

      {/* 2. Inner Radiant Golden Field */}
      <circle cx="24" cy="24" r="18.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.2" />

      {/* 3. Minted Beaded Edge (Vedic Coin Mill Marks) */}
      <circle cx="24" cy="24" r="16" stroke="#fef08a" strokeWidth="0.9" strokeDasharray="1.8 1.8" strokeOpacity="0.95" fill="none" />

      {/* 4a. Shadow Relief for Sacred Om (Devanagari ॐ) */}
      <g transform="matrix(0.76, 0, 0, 0.76, 5.76, 6.8)">
        <path
          d="M20.5 14.5C18.5 12 15 12.5 13 15C11 17.5 11.5 21 14.5 23C12 24.5 10.5 28 11.5 31.5C12.8 35.5 17.5 37 21.5 35.5C24.5 34.3 26 31.5 26 29C26 26.5 24 25 21.5 24.5C25.5 23 27 18 24.5 15.5C23.5 14.5 22 14.5 20.5 14.5ZM21.5 28.5C23.5 29.5 23 32.5 20.5 33C17.5 33.5 14.5 32 14 29.5C13.5 27 16 26 18.5 26.5C19.8 26.8 20.8 27.5 21.5 28.5ZM20 20C18 20.5 15.5 19.5 15 17.5C14.5 15.5 16.5 14.5 18.5 14.5C20.5 14.5 22 16 21.5 18C21.2 19 20.8 19.5 20 20Z"
          fill="#78350f"
        />
        <path
          d="M23 23C26.5 24 33 26 32 32C31.5 35 28.5 37 25 36"
          stroke="#78350f"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M27 13.5C29 15.5 33.5 15.5 35.5 13.5"
          stroke="#78350f"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="31.2" cy="10" r="2.2" fill="#78350f" />
      </g>

      {/* 4b. Pure High-Contrast White Sacred Om Emblem */}
      <g transform="matrix(0.76, 0, 0, 0.76, 5.76, 5.6)">
        <path
          d="M20.5 14.5C18.5 12 15 12.5 13 15C11 17.5 11.5 21 14.5 23C12 24.5 10.5 28 11.5 31.5C12.8 35.5 17.5 37 21.5 35.5C24.5 34.3 26 31.5 26 29C26 26.5 24 25 21.5 24.5C25.5 23 27 18 24.5 15.5C23.5 14.5 22 14.5 20.5 14.5ZM21.5 28.5C23.5 29.5 23 32.5 20.5 33C17.5 33.5 14.5 32 14 29.5C13.5 27 16 26 18.5 26.5C19.8 26.8 20.8 27.5 21.5 28.5ZM20 20C18 20.5 15.5 19.5 15 17.5C14.5 15.5 16.5 14.5 18.5 14.5C20.5 14.5 22 16 21.5 18C21.2 19 20.8 19.5 20 20Z"
          fill="#ffffff"
        />
        <path
          d="M23 23C26.5 24 33 26 32 32C31.5 35 28.5 37 25 36"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M27 13.5C29 15.5 33.5 15.5 35.5 13.5"
          stroke="#ffffff"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="31.2" cy="10" r="2.2" fill="#ffffff" />
      </g>
    </svg>
  );
}

/**
 * 4. Devotional Pranam / Anjali Mudra (Folded Hands with Kalava Wrist Thread)
 */
export function PranamIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Left Hand / Palm */}
      <path
        d="M23 8C23 8 20 12 19 17C18 21 16 26 15 29C14 32 15 36 18 38C20 39.5 22 40 23 40V8Z"
        fill="url(#skinGrad)"
      />
      {/* Right Hand / Palm */}
      <path
        d="M25 8C25 8 28 12 29 17C30 21 32 26 33 29C34 32 33 36 30 38C28 39.5 26 40 25 40V8Z"
        fill="url(#skinGrad)"
      />
      {/* Sacred Central Division Line */}
      <line x1="24" y1="8" x2="24" y2="40" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sacred Kalava (Red & Yellow Sacred Wrist Thread) */}
      <rect x="15" y="37" width="18" height="3" rx="1.5" fill="#dc2626" />
      <line x1="17" y1="38.5" x2="31" y2="38.5" stroke="#facc15" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  );
}

/**
 * 5. Temple Ghanti / Auspicious Brass Bell with Resonance Waves
 */
export function BellIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="bellBrass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      {/* Top Handle Hook */}
      <path d="M24 6V11" stroke="url(#bellBrass)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="6" r="3" stroke="url(#bellBrass)" strokeWidth="2.5" fill="none" />
      {/* Bell Dome Body */}
      <path
        d="M13 32C13 22 17 14 24 14C31 14 35 22 35 32C37 34 39 36 39 38H9C9 36 11 34 13 32Z"
        fill="url(#bellBrass)"
      />
      {/* Clapper / Dangling Bead */}
      <circle cx="24" cy="41" r="3.5" fill="#78350f" stroke="#fde047" strokeWidth="1.5" />
      {/* Decorative Ridge */}
      <path d="M12 34C17 35.5 31 35.5 36 34" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 6. Sacred Lotus (Padma Flower with Blooming Petals)
 */
export function LotusIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="lotusCenter" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="60%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#fecdd3" />
        </linearGradient>
        <linearGradient id="lotusSide" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#fda4af" />
        </linearGradient>
      </defs>
      {/* Center Main Upright Petal */}
      <path
        d="M24 8C20 16 19 25 24 35C29 25 28 16 24 8Z"
        fill="url(#lotusCenter)"
      />
      {/* Left Mid Petal */}
      <path
        d="M17 15C13 21 14 28 23 35C17 31 13 24 17 15Z"
        fill="url(#lotusSide)"
      />
      {/* Right Mid Petal */}
      <path
        d="M31 15C35 21 34 28 25 35C31 31 35 24 31 15Z"
        fill="url(#lotusSide)"
      />
      {/* Left Low Flared Petal */}
      <path
        d="M10 24C8 30 13 36 22 36C14 36 9 31 10 24Z"
        fill="url(#lotusSide)"
      />
      {/* Right Low Flared Petal */}
      <path
        d="M38 24C40 30 35 36 26 36C34 36 39 31 38 24Z"
        fill="url(#lotusSide)"
      />
      {/* Water Base Lily Pad curve */}
      <path d="M14 39C20 41 28 41 34 39" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 7. Sacred Conch Shell (Shankha)
 */
export function ConchIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="conchBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#d1d5db" />
        </linearGradient>
        <linearGradient id="conchGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Shell Spiraling Conical Body */}
      <path
        d="M36 14C36 9 29 8 23 11C17 14 11 20 10 27C9 34 14 40 21 40C28 40 37 34 37 25C37 19 32 17 30 18"
        fill="url(#conchBody)"
        stroke="url(#conchGold)"
        strokeWidth="1.5"
      />
      {/* Inner Spiral Ridge */}
      <path
        d="M23 11C28 15 30 22 28 28C26 34 20 36 17 33"
        stroke="url(#conchGold)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="28" cy="16" r="2" fill="url(#conchGold)" />
    </svg>
  );
}

/**
 * 8. Verified Vedic Pandit Badge (Saffron Shield with Gold Rim & Emerald Checkmark)
 */
export function VerifiedPanditBadge({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Sacred Shield */}
      <path
        d="M12 2L4 5V11.5C4 16.5 7.5 21.2 12 22.5C16.5 21.2 20 16.5 20 11.5V5L12 2Z"
        fill="url(#shieldGrad)"
        stroke="#f59e0b"
        strokeWidth="1.2"
      />
      {/* Verification Checkmark */}
      <path
        d="M8.5 12L11 14.5L16 9"
        stroke="#10b981"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 9. Auspicious Aarti Thali with Camphor Flame
 */
export function AartiThaliIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="thaliGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Circular Thali Plate Rim */}
      <ellipse cx="24" cy="30" rx="19" ry="10" fill="url(#thaliGold)" stroke="#fef08a" strokeWidth="1.5" />
      <ellipse cx="24" cy="30" rx="15" ry="7" fill="#78350f" fillOpacity="0.4" />
      {/* Central Flame / Camphor Diya */}
      <path
        d="M24 12C24 12 20 18 20 22C20 24.2 21.8 26 24 26C26.2 26 28 24.2 28 22C28 18 24 12 24 12Z"
        fill="#fde047"
      />
      <circle cx="24" cy="22" r="2.5" fill="#ffffff" />
      {/* Kumkum & Rice Offerings on Plate */}
      <circle cx="16" cy="30" r="2" fill="#dc2626" />
      <circle cx="32" cy="30" r="2" fill="#facc15" />
    </svg>
  );
}
