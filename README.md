<div align="center">

<img src="frontend/public/images/logo.png" alt="Shubhdarshan Sacred Emblem" width="128" />

# Shubhdarshan (शुभदर्शन)

### Sacred Live Pooja, Aarti Darshan & Vedic Astrology Platform

*Next-generation devotional broadcast infrastructure engineered for real-time WebRTC live streams, interactive two-way private pooja rituals, public devotee video guest participation, an atomic Sacred Coin economy (`150 coins = ₹100`), comprehensive Vedic Kundli calculations with client-side PDF export, sitewide Hindi/English bilingual support, and strict DPDP Act 2023 compliance.*

---

<p>
  <img src="https://img.shields.io/badge/NestJS-10.4-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS 10.4" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/LiveKit-WebRTC_SFU-F59E0B?style=for-the-badge&logo=webrtc&logoColor=white" alt="LiveKit WebRTC" />
  <img src="https://img.shields.io/badge/PostgreSQL-16_(Neon)-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma 5.22" />
  <img src="https://img.shields.io/badge/Redis-7.2-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis 7.2" />
  <img src="https://img.shields.io/badge/Razorpay-Top--Ups-0C2451?style=for-the-badge&logo=razorpay&logoColor=white" alt="Razorpay Top-Ups" />
  <img src="https://img.shields.io/badge/Brevo-REST_%26_SMTP-0092FF?style=for-the-badge&logo=brevo&logoColor=white" alt="Brevo Email" />
  <img src="https://img.shields.io/badge/AstroLogics-Vedic_Kundli-8B5CF6?style=for-the-badge&logoColor=white" alt="AstroLogics Kundli" />
  <img src="https://img.shields.io/badge/DPDP_Act_2023-Compliant-10B981?style=for-the-badge&logo=shield&logoColor=white" alt="DPDP Act 2023" />
</p>

<p>
  <a href="#core-platform-capabilities"><strong>Key Features</strong></a> &nbsp;&bull;&nbsp;
  <a href="#system-architecture"><strong>Architecture</strong></a> &nbsp;&bull;&nbsp;
  <a href="#two-way-video--interactive-broadcasting"><strong>Interactive Video</strong></a> &nbsp;&bull;&nbsp;
  <a href="#sacred-coin-economy--studio-earnings"><strong>Coin Economy</strong></a> &nbsp;&bull;&nbsp;
  <a href="#vedic-kundli--ashtakoota-milan"><strong>Vedic Astrology</strong></a> &nbsp;&bull;&nbsp;
  <a href="#security-billing--compliance"><strong>Security &amp; DPDP</strong></a> &nbsp;&bull;&nbsp;
  <a href="#local-development--testing"><strong>Getting Started</strong></a> &nbsp;&bull;&nbsp;
  <a href="#production-deployment"><strong>Deployment</strong></a>
</p>

</div>

---

## Executive Overview

**Shubhdarshan** bridges ancient Vedic traditions with modern ultra-low-latency streaming technology. The platform connects devotees worldwide with authentic Vedic temples and verified Acharyas for:
1. **Ultra-Low Latency Public Broadcasts**: Sacred temple aartis, havan yagyas, and spiritual discourses powered by self-hosted LiveKit SFU (sub-500ms WebRTC).
2. **Interactive Video Guest Slot**: Devotees can request to appear on live video/audio inside a public stream with the Acharya, backed by atomic stream locks, queue moderation, and instant disconnect safety.
3. **Encrypted 1-on-1 Private Pooja Rooms**: High-definition, two-way audio/video consultations for personalized sankalp, matrimonial advice, and remedial rituals with pre-join hardware testing lobby.
4. **Sacred Coin Economy**: Devotee top-ups via Razorpay (`150 coins = ₹100`), per-minute darshan metering (`5 coins/min`), instant coin Dakshina offerings, and live real-time 85% revenue telemetry delivered to the Acharya's studio screen.
5. **Vedic Kundli & Ashtakoota Milan Engine**: High-precision Janam Kundali generation, D1/D9 SVG charts in North & South Indian styles, Vimshottari Dasha periods, and browser-side PDF generation with embedded Devanagari typography.
6. **Bilingual Sitewide Localization**: Seamless real-time Hindi (हिंदी) and English language toggle with zero layout shift, backed by self-hosted Noto Sans Devanagari font bundling.

---

## Core Platform Capabilities

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🎥 Two-Way WebRTC &amp; Video Guest</h3>
      <p>
        Full <strong>two-way video/audio</strong> for private poojas and a regulated <strong>Public Video Guest</strong> slot. Streamers can review incoming devotee video requests, allow, dismiss, replace, or revoke access on the fly with LiveKit participant attribute tracking (<code>videoGuest: '1'</code>) and DB moderation audit logging.
      </p>
    </td>
    <td width="50%" valign="top">
      <h3>🪙 Sacred Coin Economy &amp; Live Studio Pill</h3>
      <p>
        Unified <code>150 coins = ₹100</code> rate with an <strong>85% Acharya / 15% Platform</strong> split. Every watch-minute debit and Dakshina offering executes an atomic transaction writing both the devotee wallet debit and the <code>StreamerEarning</code> ledger, pushing instant <code>+N</code> coin pills to the broadcaster's studio via private WebSockets.
      </p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🕉️ Vedic Kundli &amp; Client-Side PDF</h3>
      <p>
        Accurate planetary degrees, nakshatra padas, Avakhada chakra, and multi-level Vimshottari Dasha powered by AstroLogics. Includes North &amp; South Indian SVG charts dynamically adapted for Light (warm ivory &amp; amber) and Dark (obsidian &amp; gold) modes, plus instant client-side PDF report downloads.
      </p>
    </td>
    <td width="50%" valign="top">
      <h3>🌐 Bilingual Sitewide Localization</h3>
      <p>
        Real-time <strong>Hindi &amp; English</strong> switching across all navigation, modals, pooja descriptions, and charts with localStorage persistence. Embedded <code>Noto Sans Devanagari</code> font eliminates external Google Font dependencies and ensures crisp glyphs across all devices.
      </p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🔒 Private Rooms &amp; Pre-Join Lobby</h3>
      <p>
        128-bit cryptographically secure invite links indexed by SHA-256 digests, AES-256-GCM encrypted tokens, and hashed passwords. Includes an interactive <strong>MediaLobby</strong> for devotee camera/microphone testing, mic level metering, camera flipping, and permission diagnostics before joining.
      </p>
    </td>
    <td width="50%" valign="top">
      <h3>🛡️ DPDP Act 2023 &amp; Zero-Trust Ops</h3>
      <p>
        Strict compliance with Indian data privacy law: verifiable 18+ age consent, zero birth-data persistence in DB/logs, 30-day chat message retention, Indic profanity filtration (NFKC normalization), TOTP 2FA admin gates, and boot-time secret validation (<code>validate-env.ts</code>).
      </p>
    </td>
  </tr>
</table>

---

## System Architecture

Shubhdarshan is designed to run flexibly under **two production topologies**:
* **Topology A (Unified Node.js Host)**: Express directly hosts both the NestJS REST/WebSocket backend and the pre-built Next.js static client export from `backend/public/client` on a single origin (ideal for Hostinger VPS, cPanel, or PaaS with Neon PostgreSQL).
* **Topology B (Docker Compose VPS Stack)**: Dedicated multi-container Linux deployment behind Nginx with isolated LiveKit SFU, Redis, PostgreSQL, and background worker containers.

```mermaid
flowchart TD
    devotee["Devotee / Viewer Client"] -->|"HTTPS / WSS"| cf["Cloudflare / Edge Proxy"]
    acharya["Verified Pandit / Studio"] -->|"HTTPS / WSS"| cf

    subgraph edge ["Reverse Proxy & Ingress"]
        cf -->|"Web & REST API"| nginx["Nginx / Express Host"]
        cf -->|"Direct Media WebRTC"| lk["LiveKit SFU (7882/udp)"]
    end

    subgraph app_core ["Shubhdarshan Application Core"]
        nginx --> api["NestJS API & Gateway (:4000)"]
        nginx --> static_ui["Static Client Bundle (/public/client)"]
        api --> socket["Socket.IO Redis Adapter (Chat & Telemetry)"]
        api --> worker["Headless Background Worker (cron-tasks)"]
        lk -->|"Webhooks (HMAC SHA-256)"| api
    end

    subgraph data_stores ["Data & Storage Layer"]
        api --> db[("Neon PostgreSQL 16")]
        api --> redis[("Redis 7.2 (Presence & Queue)")]
        api --> r2[("Cloudflare R2 (Encrypted Backups)")]
    end

    subgraph integrations ["External Cloud Integrations"]
        api --> rzp["Razorpay (Coin Pack Top-Ups)"]
        api --> brevo["Brevo (REST API & SMTP Relay)"]
        api --> astro["AstroLogics (Vedic Kundli Engine)"]
    end
```

### Core Tech Stack

| Layer | Technologies | Responsibilities |
| :--- | :--- | :--- |
| **Frontend Web** | Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons | Responsive devotee portal, Kundli UI, Live Player, Studio broadcaster panel, and static export mode (`output: 'export'`) |
| **Media SFU** | LiveKit Server v1.7.2 + LiveKit Client SDK | Low-latency WebRTC SFU, single-port UDP media (`7882/udp`), TCP fallback (`7881/tcp`), and embedded STUN/TURN |
| **Backend API** | NestJS 10, Express, Socket.IO, TypeScript | REST endpoints (`/api/v1`), WebSocket chat & studio telemetry, capacity gates, rate limiting, and webhook verification |
| **ORM & Database** | Prisma ORM 5.22, PostgreSQL 16 (Neon Serverless) | Strict relational schemas, ledger tables, migration versioning, and advisory locking |
| **Cache & Real-time** | Redis 7.2 + `@socket.io/redis-adapter` | Token blacklisting, presence tracking, chat message broadcast, and cluster sync |
| **Astrology Engine** | AstroLogics REST API + Custom In-Memory Cache | Planetary ephemeris, D1/D9 SVG rendering, Vimshottari dasha, and Ashtakoota compatibility calculations |
| **Transactional Mail** | Brevo (Sendinblue) REST API + NodeMailer SMTP | Dual-delivery email delivery: primary HTTPS REST with fallback to TLS SMTP (`587`) and 15m broadcast reminders |
| **Payments** | Razorpay Node SDK | Secure order creation and HMAC-SHA256 signature-verified webhooks for coin purchases |

---

## Two-Way Video & Interactive Broadcasting

The platform offers two distinct interactive video experiences tailored for sacred ceremonies:

### 1. Private Pooja Two-Way Video Consultations
* **Devotee Audio/Video Publishing**: Devotees claiming private pooja links receive LiveKit publishing permissions specifically restricted to camera and microphone (`publishSources: ['camera', 'microphone']`, screen-sharing explicitly denied).
* **MediaLobby Pre-Join Experience**: Devotees entering `/join/[tokenSlug]` access a pre-join diagnostic screen where they can test hardware, select microphones/cameras, preview audio levels, switch front/back mobile cameras, and verify connection health before entering the sanctum.
* **Streamer-Devotee Video Layout**: Both participants are rendered cleanly in dual tiles with dynamic aspect ratios and status overlays.

```mermaid
sequenceDiagram
    autonumber
    actor Devotee
    participant Lobby as MediaLobby (/join)
    participant API as Shubhdarshan API
    participant SFU as LiveKit SFU
    actor Pandit as Studio Acharya

    Devotee->>Lobby: Open invite link with token
    Lobby->>Lobby: Check Camera/Mic, level meter & mobile flip
    Devotee->>API: POST /private-links/claim (slug + password)
    API-->>Devotee: Room token with canPublish: true
    Devotee->>SFU: Connect WebRTC & publish camera/mic
    SFU->>Pandit: Stream devotee video track
    Pandit->>Devotee: Stream Acharya broadcast video track
```

### 2. Public Stream "Video Guest" Slot
* **Regulated Guest Experience**: Exactly one devotee at a time can be granted video guest privileges in a public live broadcast.
* **Request & Moderation Queue**: Signed-in viewers click **"Request Video"** (`video:request`). The Acharya views pending requests inside the Studio Viewers drawer and can **Allow**, **Dismiss**, or **Replace**.
* **Stream Lock Guard**: Concurrency is managed atomically via in-memory stream locks and LiveKit participant attributes (`videoGuest: '1'`).
* **Instant Ejection & Mute**: The Acharya can revoke video privileges or mute the guest instantly (`POST /streams/:id/video-guest/revoke`), automatically resetting LiveKit permissions and recording `VIDEO_REVOKE` in the database audit log.
* **Layout Isolation**: Devotee players render the guest as a dedicated secondary thumbnail or Picture-in-Picture window, ensuring the primary stream player always retains the Pandit's broadcast.

---

## Sacred Coin Economy & Studio Earnings

All financial activity operates on a strict **INR-in / Coin-inside** model defined identically in [`economy.constants.ts`](backend/src/common/config/economy.constants.ts) and [`economy.ts`](frontend/src/lib/economy.ts).

### Financial Rules & Rates
* **Conversion Rate**: `150 coins = ₹100` (**1 coin = ₹0.6667**), computed using integer paise (`grossPaise`, `netPaise`, `feePaise`) to guarantee `netInr + platformFeeInr === grossInr` with zero floating-point discrepancies.
* **Acharya Revenue Split**: **85% net payout to the Streamer**, 15% platform maintenance fee.
* **Metered Darshan**: Deducted automatically every 60 seconds (`5 coins/min`). Viewers with depleted balances are gracefully prompted to top up without disrupting the stream.
* **Coin Dakshina**: One-click spiritual offerings (10 to 50,000 coins) sent during live broadcasts with personalized prayer messages.
* **Welcome Bonus**: All new devotees receive **100 bonus Sacred Coins** upon registration.

```mermaid
flowchart LR
    rzp["Razorpay Top-Up (INR)"] -->|"Credits Wallet"| wallet["Devotee Coin Balance"]
    wallet -->|"5 coins/min"| watch["Metered Darshan"]
    wallet -->|"10-50,000 coins"| tip["Spiritual Dakshina"]
    
    watch -->|"Atomic SQL Tx"| tx["Wallet Transaction Ledger"]
    tip -->|"Atomic SQL Tx"| tx
    
    tx -->|"85% Net Calculation"| earn["StreamerEarning Record"]
    earn -->|"Private user:<id> room"| studio["Studio Live Pill (+N coins)"]
    tip -->|"Public stream room"| chat["Live Chat Blessing Card"]
```

### Coin Packages

| SKU | Package Name | Base Coins | Bonus Coins | Total Coins | Price (INR) | Effective Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `shubh_150` | Shubh Starter | 150 | 0 | **150** | ₹100 | ₹0.67 / coin |
| `bhakti_330` | Bhakti Pack | 300 | 30 (+10%) | **330** | ₹200 | ₹0.61 / coin |
| `siddhi_900` | Siddhi Pack | 750 | 150 (+20%) | **900** | ₹500 | ₹0.56 / coin |
| `mahodadhi_1875` | Mahodadhi Pack | 1,500 | 375 (+25%) | **1,875** | ₹1,000 | ₹0.53 / coin |

---

## Vedic Kundli & Ashtakoota Milan

Shubhdarshan provides authentic, client-side and cloud-computed astrological services:

### 1. Janam Kundali Engine
* **Precision Ephemeris**: Calculates Lagna (Ascendant), planetary degrees (e.g., `14°28′`), Nakshatras, padas (1–4), Nakshatra lords, and retrograde states for all 9 Vedic Grahas.
* **North & South Indian Chart Styles**: Interactive SVG charts selectable in North Indian (diamond) or South Indian (square box) formats.
* **Lagna (D1) & Navamsa (D9) Vargas**: Switch between main birth chart and D9 spiritual destiny chart seamlessly.
* **Theme-Adaptive Visuals**:
  * **Light UI**: Rendered on a warm ivory canvas (`#FFFDF7`) with terracotta/amber lines (`#B45309`) and deep ink typography (`#1C1917`).
  * **Dark UI**: Rendered on obsidian charcoal (`dark:bg-stone-900/60`) with sacred gold lines (`#C9A24B`) and pale cream typography (`#F5E7C4`).
* **Vimshottari Dasha**: Comprehensive Mahadasha, Antardasha, and Pratyantardasha timeline analysis.

### 2. Client-Side PDF Report Generation
* **Zero Server Overhead**: Complete multi-page Kundli and Ashtakoota Milan reports compiled directly inside the devotee's browser using `pdfkit` and `blob-stream`.
* **Embedded Typography**: Bundles real Devanagari font glyphs to ensure Sanskrit mantras and Hindi planetary names render accurately in generated PDF documents.
* **Watermarked & Formatted**: Features official platform watermarks, auspicious Sanskrit shlokas, Avakhada chakras, planetary positions, and consultation callouts.

### 3. Ashtakoota Milan (36-Guna Matchmaking)
* Calculates compatibility across all 8 Vedic Kootas: **Varna** (1), **Vashya** (2), **Tara** (3), **Yoni** (4), **Graha Maitri** (5), **Gana** (6), **Bhakoot** (7), and **Nadi** (8).
* Identifies Nadi Dosha, Bhakoot Dosha, and auspicious remedies.

---

## Security, Billing & Compliance

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Zero-Trust & DPDP Compliance Matrix                  │
├────────────────────────────┬───────────────────────────────────────────┤
│ Control                    │ Technical Enforcement                     │
├────────────────────────────┼───────────────────────────────────────────┤
│ Age Verification           │ 18+ DPDP consent recorded on registration │
│ Ephemeral Birth Data       │ Zero database storage of devotee DOB/time │
│ Chat Data Retention        │ Auto-purged 30 days after broadcast ends  │
│ IP Address Retention       │ ViewerSession IP addresses purged at 90d  │
│ Indic Word Filtering       │ NFKC Devanagari profanity normalization   │
│ Admin Access Gate          │ Mandatory TOTP 2FA (RFC 6238)             │
│ Secret Validation          │ Fail-closed startup if secrets < 32 chars │
│ Dual Transactional Mail    │ Brevo HTTPS REST primary + SMTP fallback  │
│ Idempotent Billing         │ Conditional SQL balance checks in 1 tx    │
│ SVG Sanitization           │ Strict AST rejection of script/foreignObj │
└────────────────────────────┴───────────────────────────────────────────┘
```

* **Boot-Time Secret Validation ([`validate-env.ts`](backend/src/common/config/validate-env.ts))**: The server halts immediately on boot if production environment variables contain insecure defaults, placeholders (`replace_with_*`), duplicate JWT access/refresh keys, or invalid origins.
* **Indic Word Filter ([`chat.service.ts`](backend/src/modules/chat/chat.service.ts))**: Profanity and abusive language in Sanskrit, Hindi, and English are stripped in real-time across live chat messages, Dakshina prayers, and devotee names.
* **Dual-Delivery Email Infrastructure ([`mailer.service.ts`](backend/src/modules/notifications/mailer.service.ts))**: Transactional emails prioritize Brevo REST API with instantaneous failover to authenticated TLS SMTP (`port 587`). All verification and password-reset links are suppressed from server logs to prevent credential leakage.

---

## Project Structure

```text
LIVE-STREAM/
├── backend/                              # NestJS API, WebSockets, Static Host & Worker
│   ├── prisma/
│   │   ├── migrations/                   # PostgreSQL schema version history
│   │   │   ├── 20261107000000_init/
│   │   │   ├── 20261112000001_coin_only_economy/
│   │   │   └── 20261124000001_add_video_guest_actions/ # VIDEO_GRANT/REVOKE enums
│   │   ├── schema.prisma                 # Core Prisma data model
│   │   ├── seed.ts                       # Categories, coin packs, CMS pages, admin
│   │   └── seed-verified-pandits.ts      # 7 authentic Vedic Pandits seed data
│   ├── public/
│   │   ├── client/                       # Next.js static export served by Express
│   │   └── uploads/                      # Uploaded thumbnails & assets
│   ├── scripts/
│   │   ├── video-guest.test.ts           # 29/29 tests: guest locks, tokens, kick guards
│   │   ├── test-kundli.ts                # AstroLogics API client & SVG security suite
│   │   ├── n25.test.ts                   # Email hardening & reminder loop tests
│   │   └── test-wallet-system.ts         # Coin economy & meter-tick tests
│   ├── src/
│   │   ├── common/                       # Guards, decorators, economy constants
│   │   ├── modules/
│   │   │   ├── auth/                     # JWT, bcrypt, TOTP 2FA, DPDP age gate
│   │   │   ├── chat/                     # Socket.IO gateway, presence, word filter
│   │   │   ├── kundli/                   # AstroLogics client, D1/D9 SVG calculations
│   │   │   ├── notifications/            # Brevo REST + SMTP transactional mailer
│   │   │   ├── payments/                 # Razorpay webhooks & coin Dakshina
│   │   │   ├── private-links/            # 128-bit private pooja invite & claim tokens
│   │   │   ├── streamers/                # KYC verification, public profiles, earnings
│   │   │   ├── streams/                  # Broadcast state machine & video guest logic
│   │   │   ├── video/                    # LiveKit SFU provider & room manager
│   │   │   └── wallet/                   # Sacred Coin ledger, packages, meter-tick
│   │   ├── main.ts                       # Express bootstrap, Helmet CSP, client host
│   │   └── worker.main.ts                # Background cron worker entry point
│   └── package.json
├── frontend/                             # Next.js 14 Devotee & Studio Portal
│   ├── public/images/                    # Sacred icons, logo, and Pandit WebP avatars
│   ├── src/
│   │   ├── app/
│   │   │   ├── kundli/                   # Kundli dashboard, KundliChart, PDF button
│   │   │   ├── join/[tokenSlug]/         # Private pooja claim & MediaLobby screen
│   │   │   ├── stream/[id]/              # Devotee player, chat & video guest slot
│   │   │   ├── studio/[id]/              # Broadcaster studio, hardware preview, guests
│   │   │   ├── studio/streams/           # Broadcaster schedule & stream manager
│   │   │   ├── wallet/                   # Coin balance, top-up modal, ledger
│   │   │   └── layout.tsx                # Sitewide language & theme provider
│   │   ├── components/
│   │   │   ├── video/MediaPieces.tsx     # Video guest tiles, lobby, connection banner
│   │   │   ├── LanguageToggle.tsx        # Real-time Hindi/English language toggle
│   │   │   ├── ChatWidget.tsx            # Live chat with spiritual reactions
│   │   │   └── DakshinaModal.tsx         # Atomic coin donation modal
│   │   └── lib/
│   │       ├── economy.ts                # Shared financial math & coin conversions
│   │       ├── auth-session.ts           # Zero-leakage client session management
│   │       └── i18n/hi-dict.ts           # Devanagari translation dictionary
│   └── package.json
├── docker-compose.yml                    # Multi-container production deployment stack
└── .env.example                          # Documented environment template
```

---

## Local Development & Testing

### Prerequisites
* **Node.js** `v20.x` or higher
* **PostgreSQL** `16+` (or a free [Neon](https://neon.tech) serverless branch)
* **Redis** `7.2+` (or in-memory fallback enabled automatically in local dev)
* **LiveKit Server** (Cloud URL or self-hosted instance)

### 1. Environment Setup
Copy the environment template and populate your local credentials:
```bash
cp .env.example backend/.env
```
Key variables to supply:
```dotenv
DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"
LIVEKIT_URL="wss://your-project.livekit.cloud"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret32charsminlengthstringkey"
ENCRYPTION_MASTER_KEY="32-byte-base64-encryption-key"
JWT_ACCESS_SECRET="access-secret-32-chars-minimum-length"
JWT_REFRESH_SECRET="refresh-secret-32-chars-minimum-length"
```

### 2. Backend & Database Initialization
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npx ts-node prisma/seed-verified-pandits.ts
```

### 3. Run the Unified Local Server
The backend serves both the REST API and the pre-built static client on **port 4000**:
```bash
# In backend/
npm run build
node dist/main.js
```
Open your browser at:
* **Devotee Portal**: [http://localhost:4000/](http://localhost:4000/)
* **Vedic Kundli Page**: [http://localhost:4000/kundli](http://localhost:4000/kundli)
* **API Health Status**: [http://localhost:4000/api/v1/health/live](http://localhost:4000/api/v1/health/live)
* **OpenAPI Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### 4. Run Frontend in Development Mode (Optional)
If you are developing React UI components with hot-reloading:
```bash
cd frontend
npm install
npm run dev
# Next.js will run on http://localhost:3000 proxying to http://localhost:4000/api/v1
```

### 5. Automated Testing Suites
Execute all automated test suites from the `backend/` directory:
```bash
cd backend

# Two-Way Video & Video Guest Regression Suite (29 tests)
npx ts-node --transpile-only scripts/video-guest.test.ts

# Vedic Kundli Engine, SVG security & Rate Limiting (7 tests)
npm run test:kundli

# Email Hardening, 15m Reminders & Google Account Deletion (10 tests)
npm run test:n25

# Runtime Mode, Storage Hardening & Fail-Closed Checks
npm run test:audit

# Frontend Unit & Bilingual i18n Translation Checks (307 checks)
cd ../frontend && node tests/i18n-and-chart.test.js
```

---

## Production Deployment

### Option A — Unified Single-Host Deployment (Hostinger / Node.js Host)

1. **Build and Sync Frontend Assets**:
   ```bash
   cd frontend
   npm run build
   # Copies the static export into backend/public/client
   robocopy out ../backend/public/client /E /IS /IT
   ```
2. **Commit and Deploy Backend**:
   * Set root directory to `backend`.
   * Set build command to: `npm run build` (`npx prisma generate && nest build`).
   * Set run command to: `npm run start:prod` (`node dist/main`).
3. **Configure Environment Variables**:
   Provide production values for `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `LIVEKIT_*`, `JWT_*`, `ENCRYPTION_MASTER_KEY`, `RAZORPAY_*`, and `BREVO_*`.
4. **Deploy Database Migrations**:
   Run `npx prisma migrate deploy` to apply all schema updates to your production PostgreSQL database.

---

### Option B — Multi-Container Docker Compose Stack (Linux VPS)

Shubhdarshan includes a production-ready `docker-compose.yml` deploying 8 isolated services:
* `pooja_nginx`: TLS termination, reverse proxy, and Cloudflare real-IP restoration.
* `pooja_api`: Clustered NestJS API serving REST and Socket.IO.
* `pooja_worker`: Headless background cron task scheduler.
* `pooja_livekit`: Self-hosted LiveKit WebRTC SFU with single-port UDP media (`7882/udp`).
* `pooja_postgres`: PostgreSQL 16 database with least-privilege `pooja_app` role.
* `pooja_redis`: In-memory Redis 7.2 instance with `noeviction` data safety.

#### Deployment Steps:
```bash
# 1. Clone repository on your production VPS
git clone https://github.com/AnkitTiwari2005/LIVE-STREAM.git /opt/shubhdarshan
cd /opt/shubhdarshan

# 2. Configure production environment
cp .env.example .env.production
chmod 600 .env.production

# 3. Generate LiveKit configuration
bash scripts/render-livekit-config.sh .env.production

# 4. Tune Linux kernel UDP buffers for high-concurrency WebRTC
sudo cp scripts/sysctl-webrtc.conf /etc/sysctl.d/99-webrtc.conf
sudo sysctl --system

# 5. Build and launch services
docker compose --env-file .env.production up -d --build

# 6. Apply database migrations & seed initial data
docker exec -it pooja_api npx prisma migrate deploy
docker exec -it pooja_api npm run prisma:seed
```

---

## Verified Pandit Seed Accounts

For staging and local demonstration, the platform includes 7 pre-seeded verified Acharyas:

| Pandit Name | Role / Specialty | Seed Email | Default Password |
| :--- | :--- | :--- | :--- |
| **पंडित रोहित तिवारी** | Founder & Matrimonial Astrologer | `rohit.tiwari@shubhdarshan.com` | `SanatanDharma@2026` |
| **पंडित संतोष कुमार शास्त्री** | Co-Founder & Vastu Shastra Expert | `skjyotish@gmail.com` | `SanatanDharma@2026` |
| **पंडित रवि पाठक** | Karmakand & Ganesh Aradhana | `ravi.pathak@shubhdarshan.com` | `SanatanDharma@2026` |
| **पंडित नितिन शर्मा** | Shukla Yajurveda & Sundarkand Path | `nitin.sharma@shubhdarshan.com` | `SanatanDharma@2026` |
| **पंडित उमेश शास्त्री** | Maha Rudrabhishek & Chandi Path | `umesh.shastri@shubhdarshan.com` | `SanatanDharma@2026` |
| **आचार्य कुबेर दत्त त्रिपाठी** | Astrological Sankalp & Navgrah Shanti | `kuber.tripathi@shubhdarshan.com` | `SanatanDharma@2026` |
| **पंडित सुभाष शास्त्री** | Satyanarayan Katha & Vedic Chanting | `subhash.shastri@shubhdarshan.com` | `SanatanDharma@2026` |

---

## Operations & Monitoring

* **Liveness Probe**: `GET /api/v1/health/live` (Unmetered, returns server uptime and UTC timestamp)
* **Readiness Probe**: `GET /api/v1/health/ready` (Executes database `SELECT 1` ping and Redis connection check)
* **Encrypted Database Backups**: Automatic daily `pg_dump` compressed with gzip and encrypted via `age` key pairs, uploaded to Cloudflare R2 bucket.
* **Stream Watchdog Crons**: Runs every 30 seconds to automatically terminate abandoned streams, disconnect unresponsive viewers, and reconcile LiveKit room states.

---

<div align="center">
  <br />
  <strong>Built with devotion for authentic Vedic darshan, uninterrupted sacred ceremonies, and fair compensation for spiritual leaders.</strong>
  <br /><br />
  <sub>© 2026 Shubhdarshan Devotional Media Private Limited. All rights reserved.</sub>
</div>
