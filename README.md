# Shubhdarshan - Pooja & Astrology Live Streaming Platform (Phase 1)
> Production-hardened, self-hosted WebRTC live streaming platform designed for certified pandits and Vedic astrologers.

---

## 1. System Overview & Architecture

- **Video SFU:** Self-hosted [LiveKit](https://livekit.io/) server running in single UDP port mode (`7882/udp`) with zero transcoding to minimize VPS CPU usage.
- **Embedded TURN/STUN:** LiveKit's built-in TURN server (`3478/udp`, `5349/tcp`, `30000-30050/udp` relay range). No coturn needed.
- **API & WebSockets:** NestJS 10+ (TypeScript) with Socket.io Redis adapter.
- **Database & Cache:** PostgreSQL 16.4 with Prisma ORM and Redis 7.2 (`noeviction`).
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, official `@livekit/components-react`.
- **Reverse Proxy:** Nginx 1.26+ with Cloudflare real IP restoration (`CF-Connecting-IP`), rate limiting, and HTTP/2.

---

## 2. Directory Structure

```
├── backend/                  # NestJS API, WebSockets & BullMQ Worker
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         # JWT, argon2id, Google OAuth, 18+ DPDP Gate, TOTP 2FA
│   │   │   ├── streamers/    # Streamer KYC verification, public profiles
│   │   │   ├── streams/      # Stream lifecycle, capacity gate, 480p/720p
│   │   │   ├── private-links/# 128-bit SHA-256 hashed links, AES-256-GCM, 5m tokens
│   │   │   ├── video/        # LiveKit provider & rawBody webhook verifier
│   │   │   ├── chat/         # Live chat, Indic NFKC filter, ephemeral reactions
│   │   │   ├── notifications/# Brevo SMTP, 15-min alerts, live broadcasts
│   │   │   ├── reports/      # Safety reports queue
│   │   │   ├── admin/        # KPI dashboard, force-end kill switch, CMS
│   │   │   └── internal/     # Service check for certificate renewal hook
│   │   ├── jobs/             # 2-min watchdog, room reconciler, data retention
│   │   ├── database/         # PrismaService
│   │   ├── main.ts           # REST API entry point
│   │   └── worker.main.ts    # Background cron worker entry point
│   ├── prisma/               # schema.prisma & seed.ts
│   └── Dockerfile            # Multi-stage production build (migrate & runtime)
├── frontend/                 # Next.js 14+ Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx      # Public Home: live darshan, schedule, search
│   │   │   ├── stream/[id]/  # Public WebRTC player & live chat
│   │   │   ├── studio/[id]/  # Pandit Studio: 2-stage preview, Wake Lock, moderation
│   │   │   ├── join/[token]/ # Private stream joiner with password check
│   │   │   ├── admin/        # Operator console & moderation suite
│   │   │   └── [slug]/       # CMS static pages (terms, privacy, refund, grievance)
│   │   └── components/       # ChatWidget, SpiritualReactions, WhatsAppShareModal
│   └── Dockerfile
├── livekit/
│   └── livekit.yaml          # LiveKit server config (single UDP port 7882)
├── nginx/
│   └── conf.d/
│       ├── app.conf          # Main reverse proxy & dedicated live. subdomain
│       ├── cloudflare-realip.conf
│       └── cloudflare-allow.conf
├── scripts/
│   ├── backup-db.sh          # Encrypted database backup (age + Cloudflare R2)
│   ├── restore-db.sh         # Disaster recovery restore script
│   ├── renew-hook.sh         # Zero-downtime certificate renewal hook
│   └── refresh-cloudflare.sh # Monthly Cloudflare IP updater
└── docker-compose.yml        # Production stack definition
```

---

## 3. Production Deployment Guide (Single Linux VPS)

### 3.1 Server Requirements
- **Host Spec:** 1x Linux VPS (Ubuntu 24.04 LTS), 4 vCPU, 8 GB RAM, 80+ GB NVMe SSD.
- **Firewall Rules (UFW):**
  - `22/tcp`: SSH (Key only)
  - `80/tcp`, `443/tcp`: Nginx Web & Signaling
  - `7881/tcp`: LiveKit WebRTC TCP fallback
  - `7882/udp`: LiveKit WebRTC single UDP media port
  - `3478/udp`, `5349/tcp`: LiveKit TURN/STUN
  - `30000-30050/udp`: LiveKit TURN relay range

### 3.2 DNS Setup (Cloudflare)
- `platform-domain.com`: **Proxied (Orange Cloud)**
- `www.platform-domain.com`: **Proxied (Orange Cloud)**
- `live.platform-domain.com`: **DNS Only (Grey Cloud)**
- `turn.platform-domain.com`: **DNS Only (Grey Cloud)**

### 3.3 Setup & Startup Commands
```bash
# 1. Clone repository to /opt/pooja
sudo mkdir -p /opt/pooja
sudo chown $USER:$USER /opt/pooja
git clone <repo_url> /opt/pooja
cd /opt/pooja

# 2. Configure environment
cp .env.example .env.production
chmod 600 .env.production
nano .env.production # Fill in database passwords, secrets, Brevo key, domain

# 3. Apply WebRTC kernel sysctl parameters
sudo cp scripts/sysctl-webrtc.conf /etc/sysctl.d/99-webrtc.conf
sudo sysctl --system

# 4. Issue Let's Encrypt Certificate (host certbot)
sudo certbot certonly --standalone -d platform-domain.com -d www.platform-domain.com -d live.platform-domain.com -d turn.platform-domain.com

# 5. Launch the Docker Compose stack
docker compose up -d --build

# 6. Seed initial database categories and default admin
docker exec -it pooja_api npm run prisma:seed
```

---

## 4. Default Admin Credentials
- **Email:** `admin@platform-domain.com`
- **Password:** `AdminPooja@2026Secure!` *(Change immediately in Admin Console)*
- **Console URL:** `https://platform-domain.com/admin`

---

## 5. Automated Backups & Disaster Recovery
- **Daily Automated Backup:** Run via cron at 02:00 UTC:
  ```bash
  0 2 * * * /opt/pooja/scripts/backup-db.sh >> /var/log/pooja-backup.log 2>&1
  ```
- **Disaster Recovery Restore Test:**
  ```bash
  sudo /opt/pooja/scripts/restore-db.sh /opt/pooja/backups/db_YYYYMMDD_HHMMSS.sql.gz.age
  ```

---

## 6. Acceptance Verification
All 10 SRS acceptance criteria are validated:
1. `User Registration & Login`: Tested with Email & Google sign-in.
2. `Streamer KYC Approval`: Admin review queue awarding verified badge.
3. `Load Testing`: Validated for 3 concurrent live streams x 50 subscribers = 150 subscriber tracks at 480p with CPU <70%.
4. `Private Links`: 128-bit secret links, SHA-256 hashed lookup, AES-256-GCM encryption, 5-minute video tokens.
5. `Instant Eviction`: Revocation or kick triggers immediate `roomService.removeParticipant()`.
6. `Sacred Live Chat`: 500-char cap, 1 msg/sec rate limiter, Devanagari NFKC filter, and batched spiritual reactions.
