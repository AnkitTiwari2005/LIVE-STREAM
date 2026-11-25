import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    // Warm up the Neon pool without blocking server.listen() past Hostinger's 3s Passenger window;
    // Prisma also connects lazily on the first query if one arrives mid-handshake.
    this.$connect().catch(() => {});
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
