import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IndicWordFilter } from './utils/indic-word-filter';

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  public wordFilter: IndicWordFilter;

  constructor(private readonly prisma: PrismaService) {
    this.wordFilter = new IndicWordFilter([]);
  }

  async onModuleInit() {
    await this.reloadWordFilter();
    // B-05: 60-second periodic poll so multiple instances/workers sync
    setInterval(() => {
      this.reloadWordFilter().catch((err) =>
        this.logger.error(`Periodic word filter reload failed: ${err.message}`),
      );
    }, 60_000);
  }

  async reloadWordFilter() {
    const prohibitedWords = await this.prisma.chatWordFilter.findMany({
      where: { isActive: true },
      select: { word: true },
    });
    this.wordFilter.updateProhibitedList(prohibitedWords.map((w) => w.word));
    this.logger.log(`Loaded ${prohibitedWords.length} active words into chat filter.`);
  }

  async saveMessage(streamId: string, userId: string | null, message: string) {
    return this.prisma.chatMessage.create({
      data: {
        streamId,
        userId: userId || undefined,
        message,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });
  }

  async deleteMessage(messageId: string) {
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  async pinMessage(streamId: string, messageId: string) {
    // Unpin any existing pinned message for this stream (FR-C4)
    await this.prisma.chatMessage.updateMany({
      where: { streamId, isPinned: true },
      data: { isPinned: false },
    });

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isPinned: true },
    });
  }

  async getRecentChat(streamId: string, limit = 50) {
    const rows = await this.prisma.chatMessage.findMany({
      where: { streamId, isDeleted: false },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    // Messages whose author was deleted (onDelete: SetNull) or that predate login-only chat have no user.
    // The client dereferences msg.user.*: never hand it null.
    return rows.map((m) => ({
      ...m,
      user: m.user ?? { id: '', name: 'Deleted Devotee', avatarUrl: null, role: 'VIEWER' },
    }));
  }
}
