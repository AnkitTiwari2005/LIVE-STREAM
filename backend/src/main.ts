import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
const cookieParser = require('cookie-parser');
const compression = require('compression');
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for cryptographic SHA-256 HMAC LiveKit Webhook verification
  });

  // Trust first proxy hop (Hostinger hcdn / Cloudflare reverse proxy)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // High-performance gzip/brotli compression for mobile and desktop speeds
  app.use(compression());

  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false, // Handled with custom policy via reverse proxy
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'https://platform-domain.com',
    credentials: true,
  });

  // Root Express discovery endpoints for AI agents and search engines
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.get('/robots.txt', (_req: any, res: any) => {
    res.type('text/plain; charset=utf-8');
    res.send(`User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

Sitemap: https://darkturquoise-louse-359917.hostingersite.com/sitemap.xml
`);
  });

  expressApp.get('/llms.txt', (_req: any, res: any) => {
    res.type('text/plain; charset=utf-8');
    res.send(`# Shubhdarshan - Sacred Pooja & Astrology Live Streaming Platform

> Shubhdarshan is a real-time devotional live-streaming and spiritual consultation platform in India, connecting devotees worldwide with verified Vedic priests, temples, and astrologers for live sacred rituals, aarti, sankalp, and Vedic astrological consultations.

## Core Services
- **Public Temple Live Broadcasts**: Real-time WebRTC and HLS live streams from registered temples and spiritual sanctuaries across India.
- **Private Interactive Pooja Sessions**: Password-protected, 128-bit encrypted sankalp rituals for families and individuals worldwide with interactive video and low-latency spiritual reactions (Pranam, Aarti, Shankha).
- **Vedic Astrology Consultations**: Direct live consultations with certified astrologers and Jyotish acharyas.
- **Temple Prasad & Community**: Devotee donations, community live chat with Sanskrit profanity filtering, and temple prasad delivery tracking.

## Compliance & Trust
- **DPDP Act 2023 Compliant**: 18+ age verification, explicit verifiable consent for digital personal data processing, and 30-day chat message retention policy.
- **Verified Streamers**: Strict government-ID and priesthood credential KYC verification by platform administrators before broadcast privileges are granted.

## Key Public Endpoints
- Portal: https://darkturquoise-louse-359917.hostingersite.com/
- Interactive API Docs: https://darkturquoise-louse-359917.hostingersite.com/api/docs
- Live Health Status: https://darkturquoise-louse-359917.hostingersite.com/api/v1/health/live
- Database Ready Status: https://darkturquoise-louse-359917.hostingersite.com/api/v1/health/ready
- Categories API: https://darkturquoise-louse-359917.hostingersite.com/api/v1/admin/categories
- Sitemap: https://darkturquoise-louse-359917.hostingersite.com/sitemap.xml
`);
  });

  expressApp.get('/sitemap.xml', (_req: any, res: any) => {
    res.type('application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/</loc>
    <lastmod>2026-11-06</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/api/docs</loc>
    <lastmod>2026-11-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/llms.txt</loc>
    <lastmod>2026-11-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
  });

  expressApp.get('/', (_req: any, res: any) => {
    res.type('text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shubhdarshan — Sacred Spiritual &amp; Astrology Live Streaming Platform</title>
  <meta name="description" content="India's sacred live-streaming platform for Vedic rituals, temple aarti, and astrologer consultations with low-latency WebRTC and Neon Lakebase PostgreSQL.">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="Shubhdarshan — Sacred Spiritual Live Streaming">
  <meta property="og:description" content="Connect with verified Vedic priests, temples, and astrologers for live rituals and consultations.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://darkturquoise-louse-359917.hostingersite.com/">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0c0a09">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "Shubhdarshan",
        "url": "https://darkturquoise-louse-359917.hostingersite.com/",
        "description": "Sacred spiritual and Vedic astrology live streaming platform in India."
      },
      {
        "@type": "Organization",
        "name": "Shubhdarshan",
        "url": "https://darkturquoise-louse-359917.hostingersite.com/",
        "knowsAbout": ["Vedic Rituals", "Temple Live Stream", "Astrology", "Kundli", "Pooja"]
      },
      {
        "@type": "SoftwareApplication",
        "name": "Shubhdarshan API",
        "applicationCategory": "Spiritual/Broadcasting Application",
        "operatingSystem": "All"
      }
    ]
  }
  </script>
  <style>
    :root {
      --bg: #0c0a09;
      --card: #1c1917;
      --border: #292524;
      --text: #f5f5f4;
      --text-muted: #a8a29e;
      --amber: #f59e0b;
      --emerald: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .container {
      width: 100%;
      max-width: 760px;
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.825rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 1rem;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.025em;
      margin-bottom: 0.5rem;
    }
    h1 span {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.lead {
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.5;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      transition: border-color 0.2s;
    }
    .card:hover {
      border-color: var(--amber);
    }
    .card-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
    }
    .card-val {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      margin-top: 1.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 1.25rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.925rem;
      transition: all 0.2s;
    }
    .btn-primary {
      background: var(--amber);
      color: #000;
    }
    .btn-primary:hover {
      background: #fbbf24;
      transform: translateY(-1px);
    }
    .btn-outline {
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-outline:hover {
      border-color: #57534e;
      color: #fff;
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.8rem;
      color: #78716c;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">
        <span class="badge-dot"></span>
        All Systems Live &amp; Operational
      </div>
      <h1><span>Shubhdarshan</span> Platform</h1>
      <p class="lead">Vedic Rituals, Temple Darshan &amp; Astrology WebRTC Streaming Platform</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">API Runtime</div>
        <div class="card-val">NestJS 10 / Node 22</div>
      </div>
      <div class="card">
        <div class="card-title">Database</div>
        <div class="card-val" style="color: #38bdf8;">Neon Lakebase Postgres</div>
      </div>
      <div class="card">
        <div class="card-title">Hosting &amp; Edge</div>
        <div class="card-val">Hostinger Mumbai Edge</div>
      </div>
      <div class="card">
        <div class="card-title">Compliance</div>
        <div class="card-val" style="color: var(--emerald);">DPDP Act 2023</div>
      </div>
    </div>

    <div class="links">
      <a class="btn btn-primary" href="/api/docs">Interactive API Docs</a>
      <a class="btn btn-outline" href="/api/v1/health/ready">Database Ready Check</a>
      <a class="btn btn-outline" href="/api/v1/admin/categories">Seed Categories</a>
      <a class="btn btn-outline" href="/llms.txt">LLMs Knowledge Base</a>
    </div>

    <div class="footer">
      Shubhdarshan Platform &bull; Built with Neon Serverless Postgres &bull; Hostinger Cloud
    </div>
  </div>
</body>
</html>`);
  });

  // REST API Route Prefix
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Shubhdarshan Live Streaming Platform API')
    .setDescription('Self-hosted WebRTC & Live Chat Platform API for Sacred Spiritual Broadcasts')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API Server running on port ${port} (0.0.0.0) with prefix /api/v1 (OpenAPI docs at /api/docs)`);
}

bootstrap().catch((err) => {
  console.error('Fatal Bootstrap Error:', err);
  process.exit(1);
});
