import * as dotenv from 'dotenv';
dotenv.config();

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

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // B-08 & N-11: Boot-time Production Secret Enforcement
  validateProductionSecrets('Bootstrap');

  // R-08: Resolve the canonical site origin once at startup.
  // All sitemap, robots.txt, llms.txt and private-link URLs are built from this value.
  // Set FRONTEND_ORIGIN in Hostinger env vars (e.g. https://shubhdarshan.com).
  // Falls back to the current staging host only for local dev convenience.
  const siteOrigin = (process.env.FRONTEND_ORIGIN || 'https://darkturquoise-louse-359917.hostingersite.com').replace(/\/$/, '');

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
    origin: process.env.FRONTEND_ORIGIN || '*',
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();

  // Root Express discovery endpoints for AI agents and search engines
  expressApp.get('/robots.txt', (_req: any, res: any) => {
    res.type('text/plain; charset=utf-8');
    // R-08: Use siteOrigin (from FRONTEND_ORIGIN env var) so search engines get the correct domain.
    // Also disallow private/admin/api paths from indexing.
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /studio
Disallow: /account
Disallow: /wallet
Disallow: /join
Disallow: /streamer

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
    // R-08: All URLs built from siteOrigin — no hardcoded staging domain.
    // Also removed /api/docs from the public endpoints list (disabled in production).
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
- Portal: ${siteOrigin}/
- Live Health Status: ${siteOrigin}/api/v1/health/live
- Database Ready Status: ${siteOrigin}/api/v1/health/ready
- Categories API: ${siteOrigin}/api/v1/admin/categories
- Sitemap: ${siteOrigin}/sitemap.xml
`);
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
    <loc>${siteOrigin}/pooja</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteOrigin}/schedule</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteOrigin}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteOrigin}/faq</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteOrigin}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/pandit-guidelines</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/refund</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteOrigin}/grievance</loc>
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

      // Root path -> index.html (Next.js Homepage)
      if (req.path === '/' || req.path === '') {
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

      // Dynamic pandit profile fallback: /pandit/:id -> /pandit/aarav-sharma/index.html
      if (cleanPath.startsWith('pandit/')) {
        const panditFile = path.join(clientDir, 'pandit', 'aarav-sharma', 'index.html');
        if (fs.existsSync(panditFile)) return res.sendFile(panditFile);
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

      // Final fallback to homepage
      const fallbackIndex = path.join(clientDir, 'index.html');
      if (fs.existsSync(fallbackIndex)) {
        return res.sendFile(fallbackIndex);
      }

      return next();
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
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Shubhdarshan Live Streaming Platform API')
      .setDescription('Self-hosted WebRTC & Live Chat Platform API for Sacred Spiritual Broadcasts')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API Server running on port ${port} (0.0.0.0) with prefix /api/v1 (OpenAPI docs at /api/docs)`);
}

bootstrap().catch((err) => {
  console.error('Fatal Bootstrap Error:', err);
  process.exit(1);
});
