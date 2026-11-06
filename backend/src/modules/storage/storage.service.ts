import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Generates a signed or direct upload token and target URL for media and KYC assets
   */
  async getPresignedUploadUrl(filename: string, contentType: string, folder = 'general') {
    const ext = path.extname(filename) || '.jpg';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `${folder}/${uniqueId}${ext}`;

    const r2Bucket = process.env.R2_BUCKET;
    const r2PublicUrl = process.env.R2_PUBLIC_URL;

    // Direct platform upload endpoint
    const uploadUrl = `/api/v1/storage/upload?key=${encodeURIComponent(storageKey)}`;
    const publicUrl = r2PublicUrl ? `${r2PublicUrl}/${storageKey}` : `/uploads/${storageKey}`;

    return {
      storageKey,
      uploadUrl,
      publicUrl,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
    };
  }

  /**
   * Save uploaded file stream directly to disk storage
   */
  async saveFile(storageKey: string, buffer: Buffer): Promise<string> {
    // Sanitize storageKey against directory traversal
    const safeKey = storageKey.replace(/\.\./g, '').replace(/^\/+/, '');
    const targetPath = path.join(this.uploadDir, safeKey);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, buffer);
    this.logger.log(`File saved securely: ${safeKey} (${buffer.length} bytes)`);

    return `/uploads/${safeKey}`;
  }
}
