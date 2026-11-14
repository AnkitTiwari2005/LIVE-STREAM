import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Query,
  Req,
  Res,
  BadRequestException,
  ForbiddenException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { StorageService, KEY_RE } from './storage.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  @ApiOperation({ summary: 'Obtain upload authorization for verified KYC or stream assets' })
  async getPresignedUrl(
    @Body() body: { filename: string; contentType: string; folder?: string },
    @CurrentUser('id') userId: string,
  ) {
    if (!body.filename || !body.contentType) {
      throw new BadRequestException('filename and contentType are required');
    }
    return this.storageService.getPresignedUploadUrl(
      body.filename,
      body.contentType,
      body.folder || 'media',
      userId,
    );
  }

  @Put('upload')
  @ApiOperation({ summary: 'Upload file directly to platform storage with streaming size cap (B-06)' })
  async uploadFile(
    @Query('key') key: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    if (!key) {
      throw new BadRequestException('key query parameter is required');
    }

    const match = key.match(KEY_RE);
    if (!match) {
      throw new BadRequestException('Invalid storage key format');
    }
    const [_, _folder, ownerId] = match;

    // B-06 & N3: Prevent cross-user key tampering - bind upload strictly to owner user ID
    if (user?.role !== UserRole.ADMIN && user?.id && ownerId !== user.id) {
      throw new ForbiddenException('Unauthorized: storage key does not belong to this account');
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const maxBytes = 10 * 1024 * 1024; // 10 MB

    return new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          req.destroy();
          return reject(new PayloadTooLargeException('File size exceeds the 10 MB limit'));
        }
        chunks.push(Buffer.from(chunk));
      });
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

  @Get('kyc-document')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin-only secure retrieval of verified KYC identity documents (B-06)' })
  async getKycDocument(@Query('key') key: string, @Res() res: Response) {
    if (!key) {
      throw new BadRequestException('key query parameter is required');
    }
    const { filePath, contentType } = this.storageService.getKycFile(key);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(filePath).pipe(res);
  }
}
