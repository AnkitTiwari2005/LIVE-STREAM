import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserStatus, StreamStatus, UserRole } from '@prisma/client';
import {
  IVideoProviderService,
  VIDEO_PROVIDER_TOKEN,
} from '../video/interfaces/video-provider.interface';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: IVideoProviderService,
    private readonly chatService: ChatService,
  ) {}

  async getDashboardOverview() {
    const [
      totalUsers,
      totalStreamers,
      activeLiveStreams,
      totalStreams,
      openReports,
      pendingKyc,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.streamerProfile.count({ where: { kycStatus: 'APPROVED' } }),
      this.prisma.stream.count({ where: { status: StreamStatus.LIVE } }),
      this.prisma.stream.count(),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
      this.prisma.streamerProfile.count({ where: { kycStatus: 'PENDING' } }),
    ]);

    return {
      totalUsers,
      totalStreamers,
      activeLiveStreams,
      totalStreams,
      openReports,
      pendingKyc,
    };
  }

  async searchUsers(query?: string, role?: UserRole, status?: UserStatus) {
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateUserStatus(userId: string, status: UserStatus, adminId: string, adminEmail: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot modify status of another administrator');
    }

    const updated = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: `USER_STATUS_${status}`,
          targetResource: `User:${userId}`,
          details: { previousStatus: user.status, newStatus: status, reason },
        },
      }),
    ]);

    return { message: `User status changed to ${status}`, user: updated[0] };
  }

  async getLiveStreamsMonitor() {
    return this.prisma.stream.findMany({
      where: { status: { in: [StreamStatus.LIVE, StreamStatus.RECONNECTING_GRACE_PERIOD] } },
      include: {
        streamer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        category: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async forceEndStream(streamId: string, adminId: string, adminEmail: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');

    await this.videoProvider.endRoom(stream.id);

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - new Date(stream.startedAt || stream.createdAt).getTime()) / 1000);

    await this.prisma.$transaction([
      this.prisma.stream.update({
        where: { id: streamId },
        data: {
          status: StreamStatus.ENDED,
          endedAt,
          durationSeconds: duration > 0 ? duration : 0,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: 'ADMIN_FORCE_END_STREAM',
          targetResource: `Stream:${streamId}`,
          details: { durationSeconds: duration, peakViewers: stream.peakViewers },
        },
      }),
    ]);

    return { message: 'Stream forcibly terminated.' };
  }

  async getAuditLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // --- Category Management ---
  async getCategories() {
    return this.prisma.streamCategory.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async createCategory(name: string, slug: string, displayOrder = 0) {
    return this.prisma.streamCategory.create({
      data: { name, slug, displayOrder },
    });
  }

  async updateCategory(id: string, name: string, displayOrder?: number, isActive?: boolean) {
    return this.prisma.streamCategory.update({
      where: { id },
      data: {
        name,
        displayOrder: displayOrder ?? undefined,
        isActive: isActive ?? undefined,
      },
    });
  }

  // --- Chat Word Filter Management ---
  async getWordFilters() {
    return this.prisma.chatWordFilter.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async addWordFilter(word: string, severity = 'HIGH') {
    const row = await this.prisma.chatWordFilter.upsert({
      where: { word: word.toLowerCase().trim() },
      update: { isActive: true, severity },
      create: { word: word.toLowerCase().trim(), severity, isActive: true },
    });
    await this.chatService.reloadWordFilter();
    return row;
  }

  async removeWordFilter(id: string) {
    const row = await this.prisma.chatWordFilter.delete({ where: { id } });
    await this.chatService.reloadWordFilter();
    return row;
  }

  // --- CMS Static Pages ---
  async getStaticPage(slug: string) {
    const page = await this.prisma.staticPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Static page '${slug}' not found`);
    return page;
  }

  async updateStaticPage(slug: string, title: string, contentHtml: string) {
    return this.prisma.staticPage.upsert({
      where: { slug },
      update: { title, contentHtml },
      create: { slug, title, contentHtml },
    });
  }
}
