import { Controller, Post, Delete, Param } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly remindersService: RemindersService) {}

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
