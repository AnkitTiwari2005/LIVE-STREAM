import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole, UserStatus } from '@prisma/client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  UpdateUserStatusDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  AddWordFilterDto,
  UpdateStaticPageDto,
  UpdateBannerDto,
} from './dto/admin.dto';

@ApiTags('Admin Panel')
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin KPI Overview statistics (FR-M1)' })
  async getDashboard() {
    return this.adminService.getDashboardOverview();
  }

  @Get('users')
  @ApiOperation({ summary: 'Search and view users (FR-M3)' })
  async getUsers(
    @Query('query') query?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
  ) {
    return this.adminService.searchUsers(query, role, status);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Suspend, ban, or restore user (FR-A6, FR-M3)' })
  async updateUserStatus(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, dto.status, adminId, adminEmail, dto.reason);
  }

  @Get('streams/live')
  @ApiOperation({ summary: 'Monitor active live streams (FR-M4)' })
  async getLiveStreams() {
    return this.adminService.getLiveStreamsMonitor();
  }

  @Post('streams/:id/force-end')
  @ApiOperation({ summary: 'Emergency kill switch: force end any live stream (FR-M4, FR-R3)' })
  async forceEndStream(
    @Param('id') streamId: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminService.forceEndStream(streamId, adminId, adminEmail);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View immutable audit trail of all moderation and admin actions (FR-R4)' })
  async getAuditLogs(@Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(limit ? Number(limit) : 100);
  }

  // --- Categories (FR-M6) ---
  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get list of stream categories' })
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create new stream category (FR-M6)' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto.name, dto.slug, dto.displayOrder);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update stream category order or active status (FR-M6)' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminService.updateCategory(id, dto.name, dto.displayOrder, dto.isActive);
  }

  // --- Prohibited Words (FR-M6) ---
  @Get('word-filters')
  @ApiOperation({ summary: 'Get list of prohibited chat words' })
  async getWordFilters() {
    return this.adminService.getWordFilters();
  }

  @Post('word-filters')
  @ApiOperation({ summary: 'Add prohibited word to filter list' })
  async addWordFilter(@Body() dto: AddWordFilterDto) {
    return this.adminService.addWordFilter(dto.word, dto.severity);
  }

  @Delete('word-filters/:id')
  @ApiOperation({ summary: 'Remove word from filter list' })
  async removeWordFilter(@Param('id') id: string) {
    return this.adminService.removeWordFilter(id);
  }

  // --- Static Pages CMS (FR-M7, FR-X1) ---
  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get CMS content for static page (terms, privacy, refund, about, grievance)' })
  async getStaticPage(@Param('slug') slug: string) {
    return this.adminService.getStaticPage(slug);
  }

  @Patch('pages/:slug')
  @ApiOperation({ summary: 'Update CMS static page content (FR-M7)' })
  async updateStaticPage(
    @Param('slug') slug: string,
    @Body() dto: UpdateStaticPageDto,
  ) {
    return this.adminService.updateStaticPage(slug, dto.title, dto.contentHtml);
  }

  // --- Occasion Announcement Banner (FR-M7) ---
  @Public()
  @Get('banner')
  @ApiOperation({ summary: 'Get active occasion announcement banner config' })
  async getBanner() {
    return this.adminService.getBannerConfig();
  }

  @Patch('banner')
  @ApiOperation({ summary: 'Update occasion announcement banner config (Admin only)' })
  async updateBanner(@Body() dto: UpdateBannerDto) {
    return this.adminService.updateBannerConfig(dto);
  }
}
