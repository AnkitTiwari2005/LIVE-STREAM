import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReportDto, ResolveReportDto } from './dto/create-report.dto';
import { ReportStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        streamId: dto.streamId || null,
        targetUserId: dto.targetUserId || null,
        chatMessageId: dto.chatMessageId || null,
        reason: dto.reason,
        details: dto.details || null,
        status: ReportStatus.OPEN,
      },
    });

    this.logger.log(`New safety report [${report.id}] submitted by user ${reporterId}`);
    return { message: 'Report submitted successfully. Administrators will review it.', reportId: report.id };
  }

  async getReportsQueue(status?: ReportStatus) {
    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        stream: { select: { id: true, title: true, status: true } },
        targetUser: { select: { id: true, name: true, email: true, status: true } },
        chatMessage: { select: { id: true, message: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
