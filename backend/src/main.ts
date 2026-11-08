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

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // B-08: Boot-time Production Secret Enforcement
  if (process.env.NODE_ENV === 'production') {
    const criticalSecrets = [
      { name: 'JWT_ACCESS_SECRET', insecureDefault: 'jwt_default_insecure_access_secret_key' },
      { name: 'JWT_REFRESH_SECRET', insecureDefault: 'jwt_default_insecure_refresh_secret_key' },
    ];
    for (const secret of criticalSecrets) {
      const val = process.env[secret.name];
      if (val === secret.insecureDefault) {
        logger.error(`FATAL: Insecure default ${secret.name} detected in production!`);
        throw new Error(`Production requires a secure, non-default ${secret.name}`);
      }
    }
  }

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
    <lastmod>2026-11-07</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/wallet/topup</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/about</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/faq</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/pandit-guidelines</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/terms</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/privacy</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/refund</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/grievance</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/contact</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/api/docs</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://darkturquoise-louse-359917.hostingersite.com/llms.txt</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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

      // Dynamic CMS page fallback: /:slug -> /terms/index.html fallback
      const slugIndex = path.join(clientDir, 'terms', 'index.html');
      if (fs.existsSync(slugIndex)) {
        return res.sendFile(slugIndex);
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
