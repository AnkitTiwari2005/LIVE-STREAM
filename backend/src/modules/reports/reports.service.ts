import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReportDto, ResolveReportDto } from './dto/create-report.dto';
import { ReportStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    // Validate every reference first: a bad id used to surface as a foreign-key 500 after the reporter
    // already saw the form succeed. Guests' socket ids, for example, are not user ids.
    if (dto.streamId && !(await this.prisma.stream.findUnique({ where: { id: dto.streamId }, select: { id: true } }))) {
      throw new NotFoundException('Reported stream not found');
    }
    if (dto.targetUserId && !(await this.prisma.user.findUnique({ where: { id: dto.targetUserId }, select: { id: true } }))) {
      throw new NotFoundException('Reported user not found');
    }
    let reportedMessageText: string | null = null;
    if (dto.chatMessageId) {
      const msg = await this.prisma.chatMessage.findUnique({
        where: { id: dto.chatMessageId },
        select: { id: true, message: true, streamId: true },
      });
      if (!msg) throw new NotFoundException('Reported message not found');
      if (dto.streamId && msg.streamId !== dto.streamId) {
        throw new BadRequestException('Reported message does not belong to that stream');
      }
      reportedMessageText = msg.message; // evidence survives the 30-day chat purge
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        streamId: dto.streamId || null,
        targetUserId: dto.targetUserId || null,
        chatMessageId: dto.chatMessageId || null,
        reportedMessageText,
        reason: dto.reason,
        details: dto.details || null,
        status: ReportStatus.OPEN,
      },
    });

    this.logger.log(`New safety report [${report.id}] submitted by user ${reporterId}`);
    return { message: 'Report submitted successfully. Administrators will review it.', reportId: report.id };
  }

  async getReportsQueue(status?: ReportStatus) {
    if (status && !Object.values(ReportStatus).includes(status)) {
      throw new BadRequestException('Invalid report status');
    }
    const rows = await this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        stream: { select: { id: true, title: true, status: true } },
        targetUser: { select: { id: true, name: true, email: true, status: true } },
        chatMessage: { select: { id: true, message: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    // The live chat row is purged after 30 days; fall back to the snapshot taken at report time.
    return rows.map((r) =>
      r.chatMessage || !r.reportedMessageText
        ? r
        : { ...r, chatMessage: { id: null, message: r.reportedMessageText, createdAt: r.createdAt, purged: true } },
    );
  }

  async resolveReport(reportId: string, adminId: string, adminEmail: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: dto.status,
          adminNotes: dto.adminNotes || null,
          handledBy: adminId,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: `REPORT_${dto.status}`,
          targetResource: `Report:${reportId}`,
          details: { status: dto.status, adminNotes: dto.adminNotes },
        },
      }),
    ]);

    return { message: `Report status updated to ${dto.status}`, report: updated[0] };
  }
}
