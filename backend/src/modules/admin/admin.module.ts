import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ChatModule } from '../chat/chat.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ChatModule, StorageModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
