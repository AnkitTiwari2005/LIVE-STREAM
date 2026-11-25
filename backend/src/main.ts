import * as dotenv from 'dotenv';
dotenv.config();

import * as dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
const cookieParser = require('cookie-parser');
const compression = require('compression');
import helmet from 'helmet';
import { validateProductionSecrets } from './common/config/validate-env';
import { isDevMode, isProductionLike } from './common/runtime-mode';
import { isAllowedSocketOrigin } from './modules/chat/chat.gateway';

const bootstrapLogger = new Logger('Bootstrap');

process.on('uncaughtException', (err: any) => {
  bootstrapLogger.error(`Uncaught Exception: ${err?.message || err}`, err?.stack);
});

process.on('unhandledRejection', (reason: any) => {
  bootstrapLogger.error(`Unhandled Rejection: ${reason?.message || reason}`, reason?.stack);
});

async function bootstrap() {
  const logger = bootstrapLogger;
  const mem = process.memoryUsage();
  logger.log(`Booting Node.js PID ${process.pid} (RSS: ${Math.round(mem.rss / 1024 / 1024)}MB, Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB)...`);

  // B-08 & N-11: Boot-time Production Secret Enforcement
  validateProductionSecrets('Bootstrap');

  // R-08: Resolve the canonical site origin once at startup.
  // All sitemap, robots.txt, llms.txt and private-link URLs are built from this value.
  // Set FRONTEND_ORIGIN in production (e.g. https://paramdarshan.com).
  // Falls back to http://localhost:3000 in non-production local dev only (validate-env requires FRONTEND_ORIGIN in prod).
  const siteOrigin = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

  logger.log(`Configured siteOrigin: ${siteOrigin}. Creating Nest application...`);

  let app: any;
  try {
    app = await NestFactory.create(AppModule, {
      rawBody: true, // Required for cryptographic SHA-256 HMAC LiveKit Webhook verification
    });
    logger.log('Nest application instance created successfully.');
  } catch (err: any) {
    logger.error(`Failed to create Nest application instance: ${err?.message || err}`, err?.stack);
    throw err;
  }

  // Trust first proxy hop (Hostinger hcdn / Cloudflare reverse proxy)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // High-performance gzip/brotli compression for mobile and desktop speeds
  app.use(compression());

  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          mediaSrc: ["'self'", 'https:', 'blob:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          fontSrc: ["'self'", 'data:'],
          frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
          formAction: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
          workerSrc: ["'self'", 'blob:'],
          upgradeInsecureRequests: isProductionLike() ? [] : null,
        },
      },
    }),
  );

  // H-09: Removed '*' wildcard fallback — FRONTEND_ORIGIN is now required at boot
  // (validate-env.ts enforces this in production). Reuse the shared allowlist helper so
  // both apex (https://paramdarshan.com) and www (https://www.paramdarshan.com) work cleanly.
  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedSocketOrigin(origin)),
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();

  // Canonical www -> apex 301 redirect for browser GET/HEAD routes so SEO equity
  // stays consolidated on the primary origin (when DOMAIN is configured without www).
  const configuredDomain = (process.env.DOMAIN || '').trim().toLowerCase().replace(/^www\./, '');
  if (configuredDomain && !siteOrigin.toLowerCase().includes(`//www.${configuredDomain}`)) {
    expressApp.use((req: any, res: any, next: any) => {
      if ((req.method === 'GET' || req.method === 'HEAD') && (req.hostname || '').toLowerCase() === `www.${configuredDomain}`) {
        return res.redirect(301, `${siteOrigin}${req.originalUrl}`);
      }
      next();
    });
  }

  // SD-SEC-2026-004: Strict Anti-Cache Enforcement on all REST API endpoints.
  // Prevents Hostinger edge CDN (hcdn) and browser HTTP caches from injecting default
  // public caching headers (e.g. Cache-Control: public, max-age=259200) onto user/session APIs.
  expressApp.use('/api', (_req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // Root Express discovery endpoints for AI agents and search engines
  expressApp.get('/robots.txt', (_req: any, res: any) => {
    res.type('text/plain; charset=utf-8');
    // R-08: Use siteOrigin (from FRONTEND_ORIGIN env var) so search engines get the correct domain.
    // Also disallow private/admin/api paths from indexing.
    res.send(`User-agent: *
Content-Signal: search=yes, ai-train=no
Allow: /
Disallow: /account
Disallow: /admin
Disallow: /api
Disallow: /forgot-password
Disallow: /join
Disallow: /login
Disallow: /register
Disallow: /reset-password
Disallow: /streamer
Disallow: /studio
Disallow: /verify-email
Disallow: /wallet

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

Sitemap: ${siteOrigin}/sitemap.xml
`);
  });

  expressApp.get('/llms.txt', (_req: any, res: any) => {
    res.type('text/plain; charset=utf-8');
    // R-08: All URLs built from siteOrigin — follow official llmstxt.org specification
    res.send(`# Param Darshan - Sacred Pooja & Astrology Live Streaming Platform

> Param Darshan is India's real-time devotional live-streaming and spiritual consultation platform, connecting devotees worldwide with verified Vedic priests, temples, and astrologers for live sacred rituals, aarti, sankalp, and Vedic astrological consultations.

## Core Services & Pages
- [Live Darshan Broadcasts](${siteOrigin}/): Real-time WebRTC and HLS live streams from registered temples and spiritual sanctuaries.
- [Free Vedic Kundli & Charts](${siteOrigin}/kundli/): Free instant Janam Kundli, Lagna (D1) and Navamsa (D9) SVG charts, and client-side PDF export.
- [Sacred Poojas & Schedule](${siteOrigin}/schedule/): Daily live aarti, havan yagya, and Vedic anushthan schedule.
- [Verified Vedic Pandits](${siteOrigin}/schedule/): Verified Acharyas and priests with authentic credentials and lineage.
- [Devotee Help & FAQ](${siteOrigin}/faq/): Frequently asked questions on sacred coins, pooja bookings, and technical support.
- [Contact Support](${siteOrigin}/contact/): Customer care (+91-92122-83098, WhatsApp +91-96708-42038, Email paramdarshan.com@gmail.com), Acharya onboarding, and platform inquiries.
- [Terms & DPDP Act 2023 Compliance](${siteOrigin}/terms/): Legal terms, 18+ age verification, and personal data protection policy.
- [Privacy Policy](${siteOrigin}/privacy/): Digital personal data handling, encryption standards, and retention schedules.

## Machine-Readable Resources & APIs
- [Sitemap XML](${siteOrigin}/sitemap.xml): Machine-readable index of all public canonical routes.
- [MCP Server Card](${siteOrigin}/.well-known/mcp/server-card.json): Model Context Protocol (SEP-1649) discovery manifest.
- [Live System Health](${siteOrigin}/api/v1/health/live): Public server uptime and liveness probe.
- [Database Ready Probe](${siteOrigin}/api/v1/health/ready): Public database connectivity probe.
`);
  });

  expressApp.get('/.well-known/mcp/server-card.json', (_req: any, res: any) => {
    res.type('application/json; charset=utf-8');
    res.send(JSON.stringify({
      $schema: 'https://modelcontextprotocol.io/schemas/server-card/v1.json',
      name: 'Param Darshan MCP Server',
      version: '1.0.0',
      description: 'Vedic Astrology, Live Temple Darshan, and Sacred Pooja Rituals Model Context Protocol (MCP) Server',
      endpoint: `${siteOrigin}/api/v1`,
      homepage: siteOrigin,
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
      authentication: {
        type: 'none',
      },
    }, null, 2));
  });

  expressApp.get('/sitemap.xml', (_req: any, res: any) => {
    // R-08: Build all URLs from siteOrigin (FRONTEND_ORIGIN env var).
    // Removed /api/docs — it is disabled in production (ENABLE_SWAGGER gate).
    // Date is generated at request time so it stays current after deploys.
    const today = new Date().toISOString().slice(0, 10);
    res.type('application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteOrigin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteOrigin}/pooja/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteOrigin}/schedule/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteOrigin}/kundli/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteOrigin}/about/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteOrigin}/faq/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteOrigin}/contact/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/pandit-guidelines/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/terms/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/privacy/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/refund/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/grievance/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`);
  });

  // Mount public uploads directory
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  expressApp.use('/uploads', express.static(uploadsDir, { maxAge: '30d' }));

  // Unified Next.js Frontend Static Client Serving
  const clientDir = path.join(process.cwd(), 'public', 'client');
  if (fs.existsSync(clientDir)) {
    logger.log(`Mounting Unified Next.js Frontend Static Client from ${clientDir}`);

    // Serve static Next.js assets (_next/static, images, etc.) with aggressive caching
    expressApp.use(express.static(clientDir, { index: false, maxAge: '7d' }));

    // SPA Page Route Handler
    expressApp.get('*', (req: any, res: any, next: any) => {
      // Pass all /api, /socket.io and /uploads requests
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path.startsWith('/uploads')) {
        return next();
      }

      // Root path -> index.html (Next.js Homepage) or Markdown representation if requested
      if (req.path === '/' || req.path === '') {
        // Emit RFC 8288 Link header for discovery (Goal 8)
        res.setHeader('Link', `</llms.txt>; rel="alternate"; type="text/markdown", </sitemap.xml>; rel="sitemap"; type="application/xml"`);

        // Content negotiation: Serve Markdown if client explicitly requests it (Goal 7)
        const accept = req.headers['accept'] || '';
        if (accept.includes('text/markdown') && !accept.includes('text/html')) {
          res.type('text/markdown; charset=utf-8');
          return res.send(`# Param Darshan (परम दर्शन)
Sacred Live Pooja, Aarti Darshan & Vedic Astrology Streaming Platform

> Connecting devotees worldwide with verified Vedic priests, temples, and certified astrologers for live sacred rituals, aarti, sankalp, and personalized horoscope consultations.

## Core Platform Services
- **Live Temple Darshan**: Real-time WebRTC broadcasts from registered temples across India.
- **Two-Way Private Pooja Sessions**: 1-on-1 encrypted video rituals with verified Acharyas.
- **Public Video Guest Slot**: Devotee live video participation during open broadcasts.
- **Free Vedic Kundli & Charts**: Instant Lagna (D1) and Navamsa (D9) SVG charts with client-side PDF export.
- **Sacred Coin Economy**: 150 coins = ₹100, 5 coins/min metered darshan, and atomic Dakshina offerings.

## Key Links
- [Live Darshan & Home](${siteOrigin}/)
- [Free Janam Kundli](${siteOrigin}/kundli)
- [Upcoming Pooja Schedule](${siteOrigin}/schedule)
- [Verified Acharyas](${siteOrigin}/schedule)
- [Devotee Support & FAQ](${siteOrigin}/faq)
- [Terms & DPDP Compliance](${siteOrigin}/terms)
- [Support Helpline](tel:+919212283098): +91 9212283098 (Call), +91 9670842038 (WhatsApp), paramdarshan.com@gmail.com (Email)
`);
        }

        const indexPath = path.join(clientDir, 'index.html');
        if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
      }

      // Check for exact file matches (C-08 Path Traversal Hardening)
      const normalizedPath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
      const safePath = path.resolve(clientDir, '.' + (normalizedPath.startsWith(path.sep) ? normalizedPath : path.sep + normalizedPath));
      if (!safePath.startsWith(clientDir)) {
        return res.status(403).send('Forbidden');
      }

      if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
        return res.sendFile(safePath);
      }

      const cleanPath = normalizedPath.replace(/^[\\\/]+|[\\\/]+$/g, '');

      // Explicit studio create check (handles /studio/create or /studio/create/)
      if (cleanPath === 'studio/create') {
        const createIndex = path.join(clientDir, 'studio', 'create', 'index.html');
        if (fs.existsSync(createIndex)) return res.sendFile(createIndex);
      }

      // Clean directory routing (e.g. /login or /login/ -> /login/index.html)
      const altIndex = path.join(clientDir, cleanPath, 'index.html');
      if (fs.existsSync(altIndex)) {
        return res.sendFile(altIndex);
      }

      // Dynamic stream route fallback: /stream/:id -> /stream/demo/index.html
      if (cleanPath.startsWith('stream/')) {
        const streamFile = path.join(clientDir, 'stream', 'demo', 'index.html');
        if (fs.existsSync(streamFile)) return res.sendFile(streamFile);
      }

      // Dynamic studio route fallback: /studio/:id -> /studio/demo/index.html
      if (cleanPath.startsWith('studio/') && cleanPath !== 'studio/create') {
        const studioFile = path.join(clientDir, 'studio', 'demo', 'index.html');
        if (fs.existsSync(studioFile)) return res.sendFile(studioFile);
      }

      // Dynamic private link fallback: /join/:tokenSlug -> /join/invite/index.html
      if (cleanPath.startsWith('join/')) {
        const joinFile = path.join(clientDir, 'join', 'invite', 'index.html');
        if (fs.existsSync(joinFile)) return res.sendFile(joinFile);
      }

      // Dynamic pandit profile fallback: /pandit/:id -> /pandit/rohit-tiwari/index.html
      if (cleanPath.startsWith('pandit/')) {
        const panditFile = path.join(clientDir, 'pandit', 'rohit-tiwari', 'index.html');
        if (fs.existsSync(panditFile)) return res.sendFile(panditFile);
        const legacyFile = path.join(clientDir, 'pandit', 'aarav-sharma', 'index.html');
        if (fs.existsSync(legacyFile)) return res.sendFile(legacyFile);
      }

      // Explicit schedule route check (/schedule -> /schedule/index.html)
      if (cleanPath === 'schedule') {
        const scheduleFile = path.join(clientDir, 'schedule', 'index.html');
        if (fs.existsSync(scheduleFile)) return res.sendFile(scheduleFile);
      }

      // Dynamic CMS page fallback for known policy slugs
      const CMS_SLUGS = ['terms', 'privacy', 'refund', 'grievance', 'pandit-guidelines', 'about', 'contact', 'faq'];
      if (CMS_SLUGS.includes(cleanPath)) {
        const slugFile = path.join(clientDir, cleanPath, 'index.html');
        if (fs.existsSync(slugFile)) return res.sendFile(slugFile);
        const termsIndex = path.join(clientDir, 'terms', 'index.html');
        if (fs.existsSync(termsIndex)) return res.sendFile(termsIndex);
      }

      // Clean 404 for truly missing pages (eliminates soft-404) (Goal 3)
      const notFoundPage = path.join(clientDir, '404.html');
      if (fs.existsSync(notFoundPage)) {
        return res.status(404).sendFile(notFoundPage);
      }
      return res.status(404).send('Not Found');
    });
  }

  // REST API Route Prefix
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger OpenAPI Documentation (Secured in Production)
  if (isDevMode() || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Param Darshan Live Streaming Platform API')
      .setDescription('Self-hosted WebRTC & Live Chat Platform API for Sacred Spiritual Broadcasts')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  logger.log(`Attempting to bind HTTP server to port/socket [${port}]...`);
  try {
    if (typeof port === 'string' && (port.includes('/') || port.includes('\\') || isNaN(Number(port)))) {
      await app.listen(port);
      logger.log(`API Server successfully running on socket [${port}] with prefix /api/v1 (OpenAPI docs at /api/docs)`);
    } else {
      await app.listen(Number(port), '0.0.0.0');
      logger.log(`API Server successfully running on port ${port} (0.0.0.0) with prefix /api/v1 (OpenAPI docs at /api/docs)`);
    }
  } catch (listenErr: any) {
    logger.error(`Failed to bind server to port/socket [${port}]: ${listenErr?.message || listenErr}`, listenErr?.stack);
    throw listenErr;
  }
}

bootstrap().catch((err: any) => {
  const fatalLogger = new Logger('FatalBootstrap');
  fatalLogger.error(`Fatal Bootstrap Error: ${err?.message || err}`, err?.stack);
  console.error('Fatal Bootstrap Error:', err);
  process.exit(1);
});
