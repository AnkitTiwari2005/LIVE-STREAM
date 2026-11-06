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
  }

  async reloadWordFilter() {
    const prohibitedWords = await this.prisma.chatWordFilter.findMany({
      where: { isActive: true },
      select: { word: true },
    });
    this.wordFilter.updateProhibitedList(prohibitedWords.map((w) => w.word));
    this.logger.log(`Loaded ${prohibitedWords.length} active words into chat filter.`);
  }

  async saveMessage(streamId: string, userId: string, message: string) {
    return this.prisma.chatMessage.create({
      data: {
        streamId,
        userId,
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
    return this.prisma.chatMessage.findMany({
      where: { streamId, isDeleted: false },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
