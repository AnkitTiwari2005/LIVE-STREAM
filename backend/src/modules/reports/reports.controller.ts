import { Controller, Post, Body, Get, Param, Patch, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto, ResolveReportDto } from './dto/create-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ReportStatus } from '@prisma/client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Reports & Safety')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit safety report for stream, streamer, or chat message (FR-R1)' })
  async createReport(
    @CurrentUser('id') reporterId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.createReport(reporterId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Get('queue')
  @ApiOperation({ summary: 'Admin queue of reported items (FR-R2, FR-M5)' })
  async getReportsQueue(@Query('status') status?: ReportStatus) {
    return this.reportsService.getReportsQueue(status);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Admin resolve or dismiss report (FR-R2)' })
  async resolveReport(
    @Param('id') reportId: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolveReport(reportId, adminId, adminEmail, dto);
  }
}
