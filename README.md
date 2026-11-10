# Shubhdarshan — Pooja & Astrology Live Streaming Platform

Production-hardened WebRTC live streaming, devotional darshan, private pooja consultation, and Vedic astrology platform built with NestJS, Next.js 14, Prisma, PostgreSQL, Redis, and LiveKit.

---

## 1. System Overview & Architecture

- **Media / WebRTC SFU:** Self-hosted [LiveKit](https://livekit.io/) server (`livekit/livekit-server:v1.7.2`) in single UDP port mode (`7882/udp`, `7881/tcp` fallback) with zero transcoding and built-in TURN/STUN (`3478/udp`, `5349/tcp`, `30000-30050/udp` relay range). Configuration is generated from `livekit/livekit.yaml.template` via `scripts/render-livekit-config.sh`.
- **API, WebSockets & Worker:** NestJS 10 (TypeScript) REST API & Socket.IO gateway (`@socket.io/redis-adapter`) in `backend/src/main.ts`, paired with a headless cron worker in `backend/src/worker.main.ts`.
- **Database & Cache:** PostgreSQL 16 (self-hosted container or managed Neon PostgreSQL with pooled `DATABASE_URL` + unpooled `DATABASE_URL_UNPOOLED`) via Prisma ORM 5, plus Redis 7.2 (`noeviction`, AOF). Production runtime uses a least-privilege `pooja_app` database role.
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, and `@livekit/components-react`. Supports two deployment modes:
  - **Unified static export (`output: 'export'`):** Built into `frontend/out` and synced atomically into `backend/public/client` via `scripts/sync-client.sh`, then served directly by Express in `backend/src/main.ts` (for single-origin Node.js hosting such as Hostinger).
  - **Standalone SSR container (`BUILD_STANDALONE=true`):** Built via `frontend/Dockerfile` and fronted by Nginx (`nginx/conf.d/app.conf`) in Docker Compose deployments.
- **Payments & Email:** Razorpay checkout & HMAC-signed webhooks (Sacred Coin top-up packs and live Dakshina offerings) and Brevo transactional email API (`BREVO_API_KEY`).

---

## 2. Core Features & Security Controls

- **Authentication & Access Control:** Email/password (`bcryptjs`) and Google OAuth 2.0 sign-in, email verification, password reset flows, JWT access/refresh rotation, and mandatory TOTP 2FA (`otplib` + QR setup) for `/admin` access with 5-attempt per-challenge lockouts and live `/api/v1/auth/me` verification.
- **Metered Sacred Coins & Dakshina:** Server-authoritative 60-second viewing heartbeat (`POST /api/v1/wallet/meter-tick`), 90-second heartbeat eviction watchdog (`CronTasksService`), Razorpay Dakshina & coin top-up orders with webhook verification, and resilient client tick recovery (`frontend/src/lib/meter-tick.ts`).
- **Private Interactive Pooja Rooms:** 128-bit link tokens stored via SHA-256 digest lookup, AES-256-GCM encrypted metadata (`ENCRYPTION_MASTER_KEY`), `bcryptjs`-protected room passwords, host blocklists, and verified JWT checks across HTTP join flows and Socket.IO chat.
- **Pandit Studio & Live Chat Moderation:** Streamer KYC approval workflow, Pandit Studio (`/studio/[id]`) with device checks, Wake Lock, viewer kick/ban controls, pinned messages, `IndicWordFilter`, and batched spiritual reactions. Custom 1-on-1 private booking UI is gated behind `NEXT_PUBLIC_BOOKINGS_ENABLED` (default `false`).
- **DPDP Act (2023) Compliance:** 18+ age attestation & consent timestamps, grievance/data-erasure support, and scheduled retention cleanup (`03:00 UTC` cron purging chat messages >30 days on ended streams and anonymizing viewer IPs >90 days).
- **Hardening & Throttling:** Boot-time secret validation (`backend/src/common/config/validate-env.ts`), Helmet CSP (Express) and Nginx security headers, path-traversal checks on static routes, `no-store` headers on wallet responses, and global `@Throttle()` rate limiting (`THROTTLE_LIMIT` defaults to `300` req/min) with `@SkipThrottle()` on health probes, webhooks, and `meter-tick`.

---

## 3. Directory Structure

```text
├── backend/                        # NestJS API, WebSockets, Static Host & Worker
│   ├── docker/initdb/              # Postgres init script creating least-privilege pooja_app role
│   ├── prisma/                     # schema.prisma, migrations & seed.ts
│   ├── public/
│   │   ├── client/                 # Prebuilt Next.js static export served by Express
│   │   └── uploads/                # Public uploaded thumbnails/media (local/volume storage)
│   ├── scripts/                    # API/wallet/Neon verification test scripts
│   ├── src/
│   │   ├── common/
│   │   │   ├── config/             # validate-env.ts (boot-time production secret checks)
│   │   │   ├── decorators/         # @Public, @Roles, @CurrentUser
│   │   │   ├── filters/            # GlobalExceptionFilter
│   │   │   ├── guards/             # JwtAuthGuard, RolesGuard
│   │   │   └── *.util.ts           # AES-256-GCM crypto, LiveKit URL & payment helpers
│   │   ├── database/               # PrismaModule & PrismaService
│   │   ├── jobs/                   # cron-tasks.service.ts (watchdogs, reconciler, retention)
│   │   ├── modules/
│   │   │   ├── admin/              # Operator KPIs, KYC review, kill switch, CMS, filters
│   │   │   ├── auth/               # JWT, bcryptjs, Google OAuth, 18+ DPDP consent, TOTP 2FA
│   │   │   ├── chat/               # Live chat gateway, Indic NFKC word filter, reactions
│   │   │   ├── health/             # /api/v1/health/live & /api/v1/health/ready probes
│   │   │   ├── internal/           # Internal live-stream count endpoint (X-Internal-Key)
│   │   │   ├── notifications/      # Brevo mailer & 15-minute stream reminders
│   │   │   ├── payments/           # Razorpay Dakshina checkout & signed webhooks
│   │   │   ├── private-links/      # 128-bit SHA-256 private room links & AES-256-GCM tokens
│   │   │   ├── reports/            # Viewer safety report queue
│   │   │   ├── storage/            # Authenticated upload validation (JPEG/PNG/WEBP/PDF)
│   │   │   ├── streamers/          # Streamer KYC application & public Pandit profiles
│   │   │   ├── streams/            # Public/scheduled/live stream lifecycle & capacity gates
│   │   │   ├── video/              # LiveKit provider & HMAC webhook verifier
│   │   │   └── wallet/             # Sacred Coins balance, packages, Razorpay top-up, meter-tick
│   │   ├── main.ts                 # HTTP API, Helmet CSP, SEO routes, & static client server
│   │   └── worker.main.ts          # Headless cron worker entry point
│   └── Dockerfile                  # Multi-stage build (migrate & runtime targets)
├── frontend/                       # Next.js 14 Web Application
│   ├── public/images/pandits/      # Verified Pandit WebP portraits
│   ├── src/
│   │   ├── app/                    # App Router pages (/, stream, studio, join, admin, wallet, etc.)
│   │   ├── components/             # ChatWidget, ConfirmDialog, CoinTopupModal, DakshinaModal, etc.
│   │   └── lib/                    # api.ts client & meter-tick.ts tick classifier
│   ├── next.config.js              # Dual build mode: static 'export' (default) or 'standalone'
│   └── Dockerfile                  # Standalone Next.js Docker build
├── livekit/
│   ├── livekit.yaml.template       # Source template rendered by scripts/render-livekit-config.sh
│   └── livekit.yaml                # Rendered target mounted into pooja_livekit
├── nginx/conf.d/
│   ├── app.conf                    # Reverse proxy for web, api, socket.io, uploads, and live.*
│   ├── cloudflare-allow.conf       # Origin IP allowlist (refreshed via script)
│   └── cloudflare-realip.conf      # CF-Connecting-IP restoration rules
├── scripts/
│   ├── backup-db.sh                # Daily compressed + age-encrypted pg_dump to Cloudflare R2
│   ├── refresh-cloudflare.sh       # Monthly Cloudflare IPv4/IPv6 Nginx rule updater
│   ├── render-livekit-config.sh    # Validates & renders livekit/livekit.yaml atomically
│   ├── renew-hook.sh               # Safe Nginx reload & stream-aware LiveKit cert restart
│   ├── restore-db.sh               # Decrypts .sql.gz.age archive & restores Postgres
│   ├── sync-client.sh              # Builds Next.js export, verifies assets/fonts, updates client
│   └── sysctl-webrtc.conf          # Linux UDP socket buffer & file descriptor tuning
├── .env.example                    # Documented environment variable template
└── docker-compose.yml              # Full production container stack
```

---

## 4. Environment & Secret Configuration

Copy `.env.example` to `.env` (local) or `.env.production` (VPS) and fill all credentials cleanly. Do **not** leave placeholder markers (`replace_with_*`, `your_*`, `change_me`, `platform-domain.com`, `example.com`).

When `NODE_ENV=production`, `backend/src/common/config/validate-env.ts` rejects startup unless:
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set, at least 32 characters long, and **distinct**.
- `JWT_2FA_SECRET` is either explicitly configured (min 32 chars and distinct from access/refresh secrets) or omitted so an independent key is derived via HMAC-SHA256 from `JWT_ACCESS_SECRET`. Setting a dedicated `JWT_2FA_SECRET` is recommended for independent rotation.
- `ENCRYPTION_MASTER_KEY` is set to a valid 32-byte key (generate via `openssl rand -base64 32`).
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are non-default (secret >= 32 chars, no `:`, `#`, quotes, or whitespace).
- `FRONTEND_ORIGIN` is a valid `https://` origin with no path, query, fragment, localhost, or placeholder host (used for CORS, `robots.txt`, `sitemap.xml`, `llms.txt`, and email links).
- `ALLOW_MOCK_PAYMENTS=false` in production environments.
- `NEXT_PUBLIC_BOOKINGS_ENABLED=false` unless backend booking endpoints are enabled.

---

## 5. Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (local or Neon) and Redis 7.2+
- LiveKit server (local binary/Docker or staging SFU)

### Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```
- API defaults to `http://localhost:4000/api/v1`.
- Swagger OpenAPI docs are available at `/api/docs` outside production (or when `ENABLE_SWAGGER=true`).
- To run background watchdogs/crons separately: `npm run start:worker`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Next.js dev server runs at `http://localhost:3000`.

### Rebuilding & Syncing Unified Static Client
Because Express serves prebuilt static files from `backend/public/client` in unified deployments, run the sync script (in Git Bash, WSL, or Linux/macOS) whenever `frontend/` changes:
```bash
bash scripts/sync-client.sh
```
This runs `npm ci` + `npm run build` in `frontend/`, verifies all HTML routes, `/_next/static/*` references, and self-hosted `.woff2` fonts exist, and atomically replaces `backend/public/client`. Commit the refreshed `backend/public/client` output before deploying.

---

## 6. Production Deployment

### Option A: Self-Hosted Linux VPS (Docker Compose + LiveKit + Nginx)

1. **Firewall (UFW):** Open `22/tcp` (SSH), `80/tcp`, `443/tcp` (Nginx), `7881/tcp` (LiveKit WebRTC TCP), `7882/udp` (LiveKit single UDP port), `3478/udp`, `5349/tcp`, and `30000-30050/udp` (TURN relay).
2. **DNS (Cloudflare):**
   - `your-domain.com` & `www.your-domain.com` -> **Proxied**
   - `live.your-domain.com` & `turn.your-domain.com` -> **DNS Only**
3. **Clone, Configure & Render LiveKit YAML:**
   ```bash
   sudo mkdir -p /opt/pooja && sudo chown "$USER:$USER" /opt/pooja
   git clone <repo_url> /opt/pooja && cd /opt/pooja

   cp .env.example .env.production
   chmod 600 .env.production
   # Edit .env.production with real domain, database, Redis, JWT, LiveKit, Razorpay, Brevo & admin credentials

   # Render livekit/livekit.yaml safely from livekit/livekit.yaml.template
   bash scripts/render-livekit-config.sh .env.production
   ```
   Also replace domain references in `nginx/conf.d/app.conf` and refresh Cloudflare IP rules (`bash scripts/refresh-cloudflare.sh`).
4. **Kernel Tuning & TLS Certificates:**
   ```bash
   sudo cp scripts/sysctl-webrtc.conf /etc/sysctl.d/99-webrtc.conf
   sudo sysctl --system

   sudo certbot certonly --standalone \
     -d your-domain.com -d www.your-domain.com \
     -d live.your-domain.com -d turn.your-domain.com
   ```
5. **Start Stack & Seed Database:**
   ```bash
   docker compose --env-file .env.production up -d --build
   docker exec -it pooja_api npm run prisma:seed
   ```

### Option B: Unified Node.js Hosting (e.g., Hostinger + Neon PostgreSQL)

1. Configure your Hostinger Node.js app with root directory `backend`, build command `npm run build`, and start command `npm run start:prod`.
2. Ensure `backend/public/client` is freshly synced via `bash scripts/sync-client.sh` and pushed with your changes so Express serves the latest frontend assets.
3. Set all production environment variables (`NODE_ENV=production`, `FRONTEND_ORIGIN`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `REDIS_URL`, `JWT_*`, `ENCRYPTION_MASTER_KEY`, `LIVEKIT_*`, `RAZORPAY_*`, `BREVO_API_KEY`, and set `RUN_CRONS=true` if no standalone worker process is deployed).
4. Run `npx prisma migrate deploy` and `npm run prisma:seed` against your production database before opening traffic.

---

## 7. Admin Bootstrap & Operator Access

- `backend/prisma/seed.ts` creates the initial `ADMIN` account using `ADMIN_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` (minimum 16 characters required in production; no default production password exists).
- Sign in, visit `/account#2fa` to enroll TOTP 2FA immediately, and then open `/admin`. Requests to `/admin` validate both `role === 'ADMIN'` and `isTwoFactorEnabled === true` directly against `/api/v1/auth/me`.

---

## 8. Operations, Backups & Health Checks

- **Health Endpoints:**
  - Liveness: `GET /api/v1/health/live`
  - Readiness (PostgreSQL `SELECT 1`): `GET /api/v1/health/ready`
- **Automated Encrypted Database Backup (cron at `02:00 UTC`):**
  ```cron
  0 2 * * * /opt/pooja/scripts/backup-db.sh >> /var/log/pooja-backup.log 2>&1
  ```
- **Disaster Recovery Restore:**
  ```bash
  sudo /opt/pooja/scripts/restore-db.sh /opt/pooja/backups/db_YYYYMMDD_HHMMSS.sql.gz.age
  ```
- **Certificate Renewal Hook & Cloudflare IP Sync:**
  - `scripts/renew-hook.sh` reloads Nginx immediately and restarts `pooja_livekit` only when `/api/v1/internal/live-count` returns `0` (otherwise writes `/opt/pooja/pending-livekit-restart`).
  - `scripts/refresh-cloudflare.sh` updates `nginx/conf.d/cloudflare-realip.conf` and `cloudflare-allow.conf` monthly.
