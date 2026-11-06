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

  // Unified Next.js Frontend Static Client Serving
  const clientDir = path.join(process.cwd(), 'public', 'client');
  if (fs.existsSync(clientDir)) {
    logger.log(`Mounting Unified Next.js Frontend Static Client from ${clientDir}`);

    // Serve static Next.js assets (_next/static, images, etc.) with aggressive caching
    expressApp.use(express.static(clientDir, { index: false, maxAge: '7d' }));

    // SPA Page Route Handler
    expressApp.get('*', (req: any, res: any, next: any) => {
      // Pass all /api and /socket.io requests to NestJS
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }

      // Root path -> index.html (Next.js Homepage)
      if (req.path === '/' || req.path === '') {
        const indexPath = path.join(clientDir, 'index.html');
        if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
      }

      // Check for exact file matches
      const exactFile = path.join(clientDir, req.path);
      if (fs.existsSync(exactFile) && fs.statSync(exactFile).isFile()) {
        return res.sendFile(exactFile);
      }

      // Clean directory routing (e.g. /login/ -> /login/index.html)
      const dirIndex = path.join(clientDir, req.path, 'index.html');
      if (fs.existsSync(dirIndex)) {
        return res.sendFile(dirIndex);
      }

      // Clean route without slash (e.g. /login -> /login/index.html)
      const altIndex = path.join(clientDir, `${req.path.replace(/^\//, '')}`, 'index.html');
      if (fs.existsSync(altIndex)) {
        return res.sendFile(altIndex);
      }

      // Dynamic stream route fallback: /stream/:id -> /stream/demo/index.html
      if (req.path.startsWith('/stream/')) {
        const streamFile = path.join(clientDir, 'stream', 'demo', 'index.html');
        if (fs.existsSync(streamFile)) return res.sendFile(streamFile);
      }

      // Dynamic studio route fallback: /studio/:id -> /studio/demo/index.html
      if (req.path.startsWith('/studio/')) {
        const studioFile = path.join(clientDir, 'studio', 'demo', 'index.html');
        if (fs.existsSync(studioFile)) return res.sendFile(studioFile);
      }

      // Dynamic private link fallback: /join/:tokenSlug -> /join/invite/index.html
      if (req.path.startsWith('/join/')) {
        const joinFile = path.join(clientDir, 'join', 'invite', 'index.html');
        if (fs.existsSync(joinFile)) return res.sendFile(joinFile);
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
