import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function getOptimizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;
  try {
    const parsed = new URL(rawUrl);
    // Strip channel_binding if present as it can trigger TLS handshake panics in Tokio query engine on Linux
    parsed.searchParams.delete('channel_binding');
    // Ensure connection_limit is safe for shared hosting CloudLinux LVE limits.
    // Override via DB_CONNECTION_LIMIT env var (default: 5).
    // docker-compose.yml sets it to 10 for the api process and 5 for the worker.
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', process.env.DB_CONNECTION_LIMIT || '5');
    }
    // Ensure pool_timeout is reasonable
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '20');
    }
    // Ensure connect_timeout is set
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '15');
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = getOptimizedDatabaseUrl();
    super(
      url
        ? {
            datasources: {
              db: { url },
            },
          }
        : undefined,
    );
  }

  onModuleInit() {
    // Warm up the Neon pool without blocking server.listen() past Hostinger's 3s Passenger window;
    // Prisma also connects lazily on the first query if one arrives mid-handshake.
    this.$connect().catch((err: any) => {
      this.logger.warn(`Prisma background connect deferred: ${err?.message || err}`);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
