import {
  Controller,
  Post,
  Put,
  Body,
  Query,
  Req,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { StorageService } from './storage.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @Post('presigned-url')
  async getPresignedUrl(
    @Body() body: { filename: string; contentType: string; folder?: string },
  ) {
    if (!body.filename || !body.contentType) {
      throw new BadRequestException('filename and contentType are required');
    }
    return this.storageService.getPresignedUploadUrl(
      body.filename,
      body.contentType,
      body.folder || 'media',
    );
  }

  @Public()
  @Put('upload')
  async uploadFile(@Query('key') key: string, @Req() req: Request) {
    if (!key) {
      throw new BadRequestException('key query parameter is required');
    }

    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const publicUrl = await this.storageService.saveFile(key, buffer);
          resolve({ success: true, publicUrl, key });
        } catch (err: any) {
          reject(new BadRequestException(err.message));
        }
      });
      req.on('error', (err) => reject(new BadRequestException(err.message)));
    });
  }
}
