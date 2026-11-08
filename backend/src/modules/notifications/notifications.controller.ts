import { Controller, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { ContactInquiryDto, GrievanceSubmissionDto } from './dto/notifications.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly remindersService: RemindersService) {}

  @Public()
  @Post('contact')
  @ApiOperation({ summary: 'Submit devotee contact inquiry desk form (B-19)' })
  async submitContact(
    @Body() dto: ContactInquiryDto,
    @Req() req: Request,
  ) {
    return this.remindersService.submitContactInquiry({
      ...dto,
      ip: req.ip,
    });
  }

  @Public()
  @Post('grievance')
  @ApiOperation({ summary: 'Submit formal statutory complaint under Rule 3(2) IT Rules 2021 (B-19)' })
  async submitGrievance(
    @Body() dto: GrievanceSubmissionDto,
    @Req() req: Request,
  ) {
    return this.remindersService.submitGrievance({
      ...dto,
      ip: req.ip,
    });
  }

  @Post('remind/:streamId')
  @ApiOperation({ summary: 'Subscribe to email reminder for a scheduled stream (FR-N2)' })
  async addReminder(
    @CurrentUser('id') userId: string,
    @Param('streamId') streamId: string,
  ) {
    return this.remindersService.addReminder(userId, streamId);
  }

  @Delete('remind/:streamId')
  @ApiOperation({ summary: 'Unsubscribe from stream reminder' })
  async removeReminder(
    @CurrentUser('id') userId: string,
    @Param('streamId') streamId: string,
  ) {
    return this.remindersService.removeReminder(userId, streamId);
  }
}
