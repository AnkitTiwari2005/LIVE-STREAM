<div align="center">

<img src="frontend/public/images/logo.png" alt="Shubhdarshan Sacred Emblem" width="118" />

# Shubhdarshan

**Sacred Pooja, Live Darshan & Vedic Astrology Streaming Platform**

*Self-hosted WebRTC media infrastructure paired with metered Sacred Coins, encrypted private pooja rooms, Razorpay Dakshina offerings, and DPDP Act 2023 controls.*

<p>
  <img src="https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS 10" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/LiveKit-WebRTC_SFU-F59E0B?style=for-the-badge&logo=webrtc&logoColor=white" alt="LiveKit WebRTC" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma 5" />
  <img src="https://img.shields.io/badge/Redis-7.2-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis 7.2" />
  <img src="https://img.shields.io/badge/Razorpay-Payments-0C2451?style=for-the-badge&logo=razorpay&logoColor=white" alt="Razorpay" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

<p>
  <a href="#architecture"><strong>Architecture</strong></a> &nbsp;&bull;&nbsp;
  <a href="#security--billing-design"><strong>Security &amp; Billing</strong></a> &nbsp;&bull;&nbsp;
  <a href="#local-development"><strong>Quick Start</strong></a> &nbsp;&bull;&nbsp;
  <a href="#production-deployment"><strong>Production</strong></a> &nbsp;&bull;&nbsp;
  <a href="#operations--maintenance"><strong>Operations</strong></a>
</p>

</div>

---

## Highlights at a Glance

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Real-Time Sacred Streaming</h3>
      <p>
        Self-hosted <strong>LiveKit v1.7.2</strong> SFU in single-UDP port mode (<code>7882/udp</code>) with TCP fallback and built-in TURN/STUN relays — zero transcoding overhead, instant participant eviction, and automated room reconciliation.
      </p>
    </td>
    <td width="50%" valign="top">
      <h3>Metered Coins &amp; Dakshina</h3>
      <p>
        Server-authoritative 60-second heartbeat billing (<code>POST /api/v1/wallet/meter-tick</code>), automated 90-second eviction watchdog, atomic top-up packs, and HMAC-verified Razorpay Dakshina webhooks.
      </p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Private Interactive Pooja Rooms</h3>
      <p>
        128-bit secret links indexed by SHA-256 digest, AES-256-GCM encrypted metadata, <code>bcryptjs</code>-hashed room passwords, capacity gates, and active-user JWT checks across HTTP join and Socket.IO chat.
      </p>
    </td>
    <td width="50%" valign="top">
      <h3>Zero-Trust Ops &amp; DPDP 2023</h3>
      <p>
        Boot-time secret checks (<code>validate-env.ts</code>), TOTP 2FA gate on <code>/admin</code>, 18+ DPDP consent records, KYC review workflow, Indic NFKC chat filtering, and daily encrypted Cloudflare R2 backups.
      </p>
    </td>
  </tr>
</table>

---

## Architecture

Shubhdarshan runs from a single codebase across **two production deployment topologies**: a full Docker Compose Linux VPS stack behind Nginx, or a unified Node.js single-origin host (such as Hostinger + Neon PostgreSQL) where Express serves both `/api/v1` and the verified Next.js static export in `backend/public/client`.

```mermaid
flowchart LR
    user["Devotee and Pandit Browser"] --> proxy["Cloudflare or Hostinger Proxy"]
    proxy -->|"Unified Host"| unified["NestJS API and Static Client"]

    subgraph vps ["Mode A: Docker Compose VPS"]
        nginx["Nginx Reverse Proxy and CSP"] -->|"Web UI"| web["Next.js Web Container"]
        nginx -->|"API and WS"| api["NestJS API Container"]
        nginx -->|"Media WS"| lk["LiveKit SFU and TURN"]
        api --> worker["Cron Worker"]
        lk -->|"Webhook"| api
    end

    proxy -->|"VPS Stack"| nginx
    api --> pg["PostgreSQL 16 or Neon"]
    unified --> pg
    api --> redis["Redis 7.2"]
    unified --> redis
    api --> pay["Razorpay and Brevo"]
    unified --> pay
```

| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend Web** | Next.js 14 (App Router), React 18, Tailwind CSS | Static export (`backend/public/client`) via `scripts/sync-client.sh` or standalone SSR container (`BUILD_STANDALONE=true`) |
| **Video SFU & TURN** | LiveKit Server `v1.7.2` + `@livekit/components-react` | `7882/udp` media, `7881/tcp` fallback, `3478/udp` + `5349/tcp` TURN, rendered from `livekit/livekit.yaml.template` |
| **Backend API & WS** | NestJS 10, Prisma 5, Socket.IO (`@socket.io/redis-adapter`) | REST `/api/v1/*`, Helmet CSP, global `@Throttle()`, raw-body webhooks, live chat & spiritual reactions |
| **Background Worker** | NestJS Application Context (`worker.main.ts`) | 30s coin-meter eviction, disconnect watchdog, LiveKit room reconciler, 15m stream reminders, DPDP purge |
| **Database & Cache** | PostgreSQL 16 (or Neon Pooled/Unpooled) + Redis 7.2 | Least-privilege `pooja_app` runtime DB role (`backend/docker/initdb/01-app-role.sh`) + `noeviction` Redis |

---

## Security & Billing Design

### Metered Sacred Coins Lifecycle

```mermaid
sequenceDiagram
    participant Viewer as Viewer Browser
    participant API as NestJS Wallet API
    participant Cron as Watchdog Cron 30s
    participant SFU as LiveKit SFU

    Viewer->>API: POST /api/v1/wallet/meter-tick every 60s
    API-->>Viewer: Return balance and classifyTick action
    alt Status 401 Unauthorized
        Viewer->>Viewer: Redirect to login
    else Status 402 or ZERO_BALANCE
        Viewer->>Viewer: Open CoinTopupModal
    else Reason SESSION_EXPIRED
        Viewer->>API: Re-run join flow up to 3 tries
    else Heartbeat missing over 90s
        Cron->>SFU: Kick participant from room
        Cron->>API: Mark session DISCONNECTED_TIMEOUT
    end
```

### Guardrails Built Into Code

| Control Area | Implementation | Source |
| :--- | :--- | :--- |
| **Boot Secret Validation** | Hard fails in `NODE_ENV=production` on placeholder strings, duplicate access/refresh JWT secrets, missing `ENCRYPTION_MASTER_KEY`, or invalid `FRONTEND_ORIGIN` | [`validate-env.ts`](backend/src/common/config/validate-env.ts) |
| **Admin 2FA Gate** | Passwords hashed with `bcryptjs` (cost 12); TOTP 2FA (`otplib`) with 5-attempt challenge lock; `/admin` verifies live `/api/v1/auth/me` role & 2FA state | [`auth.service.ts`](backend/src/modules/auth/auth.service.ts) |
| **Private Pooja Rooms** | 128-bit link secret (SHA-256 hash lookup), AES-256-GCM token encryption, `bcryptjs` password check, blocklist & active-user validation | [`private-links.service.ts`](backend/src/modules/private-links/private-links.service.ts) |
| **Rate Limiting & CSP** | Global `ThrottlerModule` (`300` req/min default, `@SkipThrottle()` on health probes, webhooks, and `meter-tick`) + Helmet / Nginx CSP headers | [`app.module.ts`](backend/src/app.module.ts), [`main.ts`](backend/src/main.ts) |
| **Moderation & Chat Safety** | 60-second synced `IndicWordFilter` with Devanagari/NFKC normalization, pinned messages, kick/ban socket sync, verified socket JWT lookup | [`chat.service.ts`](backend/src/modules/chat/chat.service.ts) |
| **Wallet Integrity** | `Cache-Control: no-store, no-cache, must-revalidate, private` on wallet balance & ledger endpoints + Razorpay HMAC signature verification | [`wallet.controller.ts`](backend/src/modules/wallet/wallet.controller.ts) |

---

## Repository Reference

<details>
<summary><strong>Explore Full Directory Tree &amp; Module Map</strong></summary>

```text
├── backend/                        # NestJS API, WebSockets, Static Host & Worker
│   ├── docker/initdb/              # 01-app-role.sh (creates least-privilege pooja_app DB role)
│   ├── prisma/                     # schema.prisma, migrations & seed.ts
│   ├── public/
│   │   ├── client/                 # Verified Next.js static export served by Express
│   │   └── uploads/                # Public uploaded thumbnails/assets
│   ├── scripts/                    # E2E API, Neon, and wallet test scripts
│   ├── src/
│   │   ├── common/
│   │   │   ├── config/             # validate-env.ts (production boot secret enforcement)
│   │   │   ├── decorators/         # @Public, @Roles, @CurrentUser
│   │   │   ├── filters/            # GlobalExceptionFilter
│   │   │   ├── guards/             # JwtAuthGuard, RolesGuard
│   │   │   └── *.util.ts           # crypto.util.ts, livekit-url.util.ts, payments.util.ts
│   │   ├── database/               # PrismaModule & PrismaService
│   │   ├── jobs/                   # cron-tasks.service.ts (watchdogs, reconciler, retention)
│   │   ├── modules/
│   │   │   ├── admin/              # KPIs, KYC approval queue, stream kill switch, CMS, filters
│   │   │   ├── auth/               # JWT, bcryptjs, Google OAuth, 18+ DPDP gate, TOTP 2FA
│   │   │   ├── chat/               # Socket.IO chat gateway, Indic NFKC filter, reactions
│   │   │   ├── health/             # GET /api/v1/health/live & /api/v1/health/ready
│   │   │   ├── internal/           # Internal live-stream count check (X-Internal-Key)
│   │   │   ├── notifications/      # Brevo transactional mailer & 15-minute alerts
│   │   │   ├── payments/           # Razorpay Dakshina orders & HMAC-verified webhook
│   │   │   ├── private-links/      # 128-bit SHA-256 invite links & AES-256-GCM room access
│   │   │   ├── reports/            # Viewer safety report queue
│   │   │   ├── storage/            # MIME/extension & 10 MB upload guard (local + private KYC)
│   │   │   ├── streamers/          # Pandit KYC onboarding & public profiles
│   │   │   ├── streams/            # Scheduled/live stream lifecycle & capacity controls
│   │   │   ├── video/              # LiveKit SFU provider & raw-body webhook controller
│   │   │   └── wallet/             # Sacred Coins balance, packages, Razorpay top-up, meter-tick
│   │   ├── main.ts                 # HTTP API, Helmet CSP, robots/sitemap/llms, static client host
│   │   └── worker.main.ts          # Headless cron scheduler entry point
│   └── Dockerfile                  # Multi-stage build (migrate & runtime targets)
├── frontend/                       # Next.js 14 Web Application
│   ├── public/images/              # Platform emblem & verified Pandit WebP portraits
│   ├── src/
│   │   ├── app/                    # /, /stream/[id], /studio/[id], /join/[token], /admin, /wallet, etc.
│   │   ├── components/             # ChatWidget, ConfirmDialog, CoinTopupModal, DakshinaModal, etc.
│   │   └── lib/                    # api.ts client & meter-tick.ts tick classifier
│   ├── next.config.js              # Dual mode: 'export' (default) or 'standalone'
│   └── Dockerfile                  # Standalone Next.js Docker build
├── livekit/
│   ├── livekit.yaml.template       # Source config template (__DOMAIN__, __LIVEKIT_API_KEY__)
│   └── livekit.yaml                # Rendered config mounted into pooja_livekit
├── nginx/conf.d/
│   ├── app.conf                    # Reverse proxy for web, api, socket.io, uploads, and live.*
│   ├── cloudflare-allow.conf       # Origin CIDR allowlist (auto-refreshed)
│   └── cloudflare-realip.conf      # CF-Connecting-IP restoration rules
├── scripts/
│   ├── backup-db.sh                # Daily compressed + age-encrypted pg_dump to Cloudflare R2
│   ├── refresh-cloudflare.sh       # Monthly Cloudflare IPv4/IPv6 Nginx rule updater
│   ├── render-livekit-config.sh    # Validates env & atomically renders livekit/livekit.yaml
│   ├── renew-hook.sh               # Safe Nginx reload & stream-aware LiveKit cert restart
│   ├── restore-db.sh               # Decrypts .sql.gz.age archive & restores PostgreSQL
│   ├── sync-client.sh              # Builds Next.js export, validates assets/fonts, updates client
│   └── sysctl-webrtc.conf          # Linux UDP buffer & file-descriptor tuning
├── .env.example                    # Complete documented environment template
└── docker-compose.yml              # 8-service production Compose stack
```

</details>

<details>
<summary><strong>Background Worker Cron Schedule (<code>cron-tasks.service.ts</code>)</strong></summary>

| Schedule | Job | Action |
| :--- | :--- | :--- |
| Every `30s` | **Disconnect Watchdog** | Auto-ends streams stuck in `RECONNECTING_GRACE_PERIOD` past `120s` and closes active sessions |
| Every `30s` | **Coin Meter Watchdog** | Evicts viewers from LiveKit when `meter-tick` heartbeat lags `>90s` (including `lastTickAt IS NULL`) |
| Every `1m` | **LiveKit Room Reconciler** | Closes orphaned `LIVE` DB streams missing in LiveKit and cancels stale `SCHEDULED` streams `>48h` |
| Every `1m` | **Reminder Dispatcher** | Sends email alerts via Brevo 15 minutes before scheduled broadcasts |
| Daily `03:00 UTC` | **DPDP Retention Purge** | Deletes chat messages `>30 days` on ended streams and clears `ViewerSession.ipAddress` `>90 days` |

</details>

<details>
<summary><strong>Production Secret &amp; Boot Validation Rules (<code>validate-env.ts</code>)</strong></summary>

When `NODE_ENV=production`, startup aborts immediately if any rule below is violated:
- **JWT Secrets:** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be non-placeholder, `>= 32` chars, and **strictly distinct**.
- **2FA Challenge Secret:** `JWT_2FA_SECRET` (recommended `>= 32` chars and distinct from access/refresh); if omitted, an independent key is derived via `HMAC-SHA256(JWT_ACCESS_SECRET)`.
- **Data Encryption Key:** `ENCRYPTION_MASTER_KEY` must be a valid non-placeholder 32-byte key (`openssl rand -base64 32`).
- **LiveKit Credentials:** `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` reject default/placeholder values (`pooja`, `devkey`, `replace_with_*`), require `>= 32` chars on the secret, and reject `:`, `#`, quotes, or spaces.
- **Canonical Origin:** `FRONTEND_ORIGIN` must be a clean `https://` origin with no path, query, hash, loopback host, or placeholder domain (normalized to `origin` for CORS, `robots.txt`, `sitemap.xml`, `llms.txt`, and transactional emails).
- **Feature Safety Flags:** Keep `ALLOW_MOCK_PAYMENTS=false` and `NEXT_PUBLIC_BOOKINGS_ENABLED=false` in production unless backend booking APIs are enabled.

</details>

<details>
<summary><strong>Seeded Sacred Coin Packs &amp; Container Budgets</strong></summary>

**Coin Packages (`backend/prisma/seed.ts`):**
- `shubh_100` — **Shubh Starter:** 100 coins (`INR 200`)
- `bhakti_275` — **Bhakti Pack:** 250 + 25 bonus = 275 coins (`INR 500`)
- `siddhi_600` — **Siddhi Pack:** 500 + 100 bonus = 600 coins (`INR 1,000`)
- `mahodadhi_1500` — **Mahodadhi Pack:** 1,200 + 300 bonus = 1,500 coins (`INR 2,100`)

**Docker Compose Resource Allocation (`docker-compose.yml`):**
- `postgres` (`1536m`) &bull; `livekit` (`1536m`) &bull; `api` (`1024m`) &bull; `web` (`768m`) &bull; `worker` (`512m`) &bull; `redis` (`384m`) &bull; `nginx` (`128m`)

</details>

---

## Local Development

### Prerequisites
- **Node.js** `20+`, **PostgreSQL** `16+` (or Neon), **Redis** `7.2+`, and a **LiveKit** server instance.

### 1. Configure Environment
```bash
cp .env.example .env
# Populate local DATABASE_URL, DATABASE_URL_UNPOOLED, REDIS_URL, JWT secrets, ENCRYPTION_MASTER_KEY, LIVEKIT_*
```

### 2. Start Backend API & Worker
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```
- API listens on `http://localhost:4000/api/v1` (Swagger docs at `/api/docs` when `NODE_ENV !== 'production'` or `ENABLE_SWAGGER=true`).
- Run the headless cron worker separately when testing watchdogs locally: `npm run start:worker`.

### 3. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```

### 4. Sync Unified Static Client Before Release
Whenever anything inside `frontend/` changes and you deploy Express as the unified host:
```bash
bash scripts/sync-client.sh
```
This executes a clean `npm ci` + `npm run build` (`output: 'export'`), verifies every HTML entry point, `/_next/static/*` bundle reference, and self-hosted `.woff2` font file, and swaps `backend/public/client` atomically. Commit the refreshed `backend/public/client` output before pushing.

---

## Production Deployment

Choose the deployment playbook that matches your infrastructure:

### Track A — Full Self-Hosted Linux VPS (Docker Compose + LiveKit + Nginx)

#### Network & DNS Checklist

**UFW Firewall Ports**

| Port / Protocol | Service |
| :--- | :--- |
| `22/tcp` | SSH (key auth only) |
| `80/tcp`, `443/tcp` | Nginx HTTP/2 &amp; TLS termination |
| `7881/tcp` | LiveKit WebRTC TCP fallback |
| `7882/udp` | LiveKit single-UDP media port |
| `3478/udp`, `5349/tcp` | LiveKit embedded TURN / STUN |
| `30000-30050/udp` | LiveKit TURN relay port range |

**Cloudflare DNS Routing**

| Hostname | Proxy Mode | Purpose |
| :--- | :--- | :--- |
| `your-domain.com`, `www.your-domain.com` | **Proxied** (Orange Cloud) | Web UI, REST API &amp; Socket.IO via Nginx |
| `live.your-domain.com`, `turn.your-domain.com` | **DNS Only** (Grey Cloud) | Direct WebRTC signaling &amp; TURN media paths |

#### Server Provisioning Steps

```bash
# 1. Clone into /opt/pooja and prepare secrets
sudo mkdir -p /opt/pooja && sudo chown "$USER:$USER" /opt/pooja
git clone https://github.com/AnkitTiwari2005/LIVE-STREAM.git /opt/pooja
cd /opt/pooja

cp .env.example .env.production
chmod 600 .env.production
# Fill real domain, DB, Redis, JWT, LiveKit, Razorpay, Brevo, and ADMIN_* variables

# 2. Validate credentials & render livekit/livekit.yaml atomically
bash scripts/render-livekit-config.sh .env.production

# 3. Update domain in nginx/conf.d/app.conf & fetch Cloudflare IP ranges
bash scripts/refresh-cloudflare.sh

# 4. Tune Linux UDP buffers for WebRTC
sudo cp scripts/sysctl-webrtc.conf /etc/sysctl.d/99-webrtc.conf
sudo sysctl --system

# 5. Issue Let's Encrypt certificates
sudo certbot certonly --standalone \
  -d your-domain.com -d www.your-domain.com \
  -d live.your-domain.com -d turn.your-domain.com

# 6. Build & start containers (runs migrate -> api, worker, web, livekit, nginx)
docker compose --env-file .env.production up -d --build

# 7. Seed initial categories, word filter, coin packs, CMS pages & admin account
docker exec -it pooja_api npm run prisma:seed
```

---

### Track B — Unified Node.js Host (Hostinger + Neon PostgreSQL + Redis)

1. **Sync Client Assets:** Run `bash scripts/sync-client.sh` locally and commit `backend/public/client` so Express serves up-to-date static pages and hashed chunks.
2. **Configure Host Settings:**
   - **Application Root:** `backend`
   - **Build Command:** `npm run build` (`npx prisma generate && nest build`)
   - **Start Command:** `npm run start:prod` (`node dist/main`)
3. **Set Production Environment Variables:** Supply `NODE_ENV=production`, `FRONTEND_ORIGIN`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_2FA_SECRET`, `ENCRYPTION_MASTER_KEY`, `LIVEKIT_*`, `RAZORPAY_*`, `BREVO_API_KEY`, and set `RUN_CRONS=true` if no dedicated worker container is running.
4. **Migrate & Seed:** Run `npx prisma migrate deploy` and `npm run prisma:seed` against your Neon PostgreSQL database.

---

## Admin Onboarding

> [!IMPORTANT]
> **No hardcoded production admin password ships in the repository.**
> `backend/prisma/seed.ts` reads `ADMIN_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` (minimum 16 characters required in `NODE_ENV=production`). Enroll TOTP 2FA at `/account#2fa` immediately after signing in — `/admin` enforces both `role === 'ADMIN'` and `isTwoFactorEnabled === true` directly via `/api/v1/auth/me`.

---

## Operations & Maintenance

| Task | Command / Endpoint | Notes |
| :--- | :--- | :--- |
| **Liveness Probe** | `GET /api/v1/health/live` | Exempted from throttling (`@SkipThrottle()`); returns uptime & timestamp |
| **Readiness Probe** | `GET /api/v1/health/ready` | Executes `SELECT 1` against PostgreSQL; returns `503` if disconnected |
| **Daily Encrypted Backup** | `0 2 * * * /opt/pooja/scripts/backup-db.sh >> /var/log/pooja-backup.log 2>&1` | Runs `pg_dump`, compresses with gzip, encrypts via `age`, uploads to Cloudflare R2 |
| **Disaster Recovery** | `sudo /opt/pooja/scripts/restore-db.sh /opt/pooja/backups/db_YYYYMMDD_HHMMSS.sql.gz.age` | Decrypts archive with host `age` private key and restores into `pooja_postgres` |
| **TLS Renew Hook** | `bash /opt/pooja/scripts/renew-hook.sh` | Reloads Nginx immediately; restarts LiveKit only when `/api/v1/internal/live-count` equals `0` |
| **Cloudflare IP Refresh** | `bash /opt/pooja/scripts/refresh-cloudflare.sh` | Updates `cloudflare-realip.conf` & `cloudflare-allow.conf` atomically and reloads Nginx |

<div align="center">
  <br />
  <sub>Built for uninterrupted sacred darshan, resilient WebRTC streaming, and clean operator reliability.</sub>
</div>
