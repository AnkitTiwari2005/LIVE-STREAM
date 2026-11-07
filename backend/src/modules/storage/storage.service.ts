import { Injectable, Logger, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads');
  private readonly privateKycDir = path.join(process.cwd(), 'storage', 'kyc');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.privateKycDir)) {
      fs.mkdirSync(this.privateKycDir, { recursive: true });
    }
  }

  /**
   * Generates a signed or direct upload token and target URL for authenticated media assets (C-07, B-06)
   */
  async getPresignedUploadUrl(filename: string, contentType: string, folder = 'general') {
    if (!ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
      throw new BadRequestException(
        `Disallowed file type: ${contentType}. Allowed types: JPEG, PNG, WEBP, PDF.`,
      );
    }

    const rawExt = path.extname(filename).toLowerCase();
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.jpg';

    // Sanitize folder
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `${safeFolder}/${uniqueId}${ext}`;

    const uploadUrl = `/api/v1/storage/upload?key=${encodeURIComponent(storageKey)}`;
    // B-06: KYC documents are served strictly through the protected route to prevent DPDP exposure
    const publicUrl =
      safeFolder === 'kyc'
        ? `/api/v1/storage/kyc-document?key=${encodeURIComponent(storageKey)}`
        : `/uploads/${storageKey}`;

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
   * Save uploaded file stream directly to disk storage with path traversal & magic byte verification
   */
  async saveFile(storageKey: string, buffer: Buffer): Promise<string> {
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException('File size exceeds the 10 MB limit');
    }

    // Verify magic bytes for safety against polyglot files
    const ext = path.extname(storageKey).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Disallowed file extension');
    }

    const isPdf = buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp = buffer.length >= 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP';

    if (!isPdf && !isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Uploaded file content does not match allowed binary format');
    }

    // Sanitize against directory traversal
    const safeKey = storageKey.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+/, '');
    const isKyc = safeKey.startsWith('kyc/');
    const baseDir = isKyc ? this.privateKycDir : this.uploadDir;
    const relativeKey = isKyc ? safeKey.replace(/^kyc\//, '') : safeKey;
    const targetPath = path.resolve(baseDir, relativeKey);

    if (!targetPath.startsWith(baseDir)) {
      throw new BadRequestException('Invalid storage key traversal');
    }

    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, buffer);
    this.logger.log(`File saved securely: ${safeKey} (${buffer.length} bytes) to ${isKyc ? 'private KYC' : 'public uploads'}`);

    return isKyc
      ? `/api/v1/storage/kyc-document?key=${encodeURIComponent(safeKey)}`
      : `/uploads/${safeKey}`;
  }

  /**
   * Retrieve a private KYC document with strict boundary check (B-06)
   */
  getKycFile(storageKey: string): { filePath: string; contentType: string } {
    const safeKey = storageKey.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+/, '');
    const relativeKey = safeKey.replace(/^kyc\//, '');
    const targetPath = path.resolve(this.privateKycDir, relativeKey);

    if (!targetPath.startsWith(this.privateKycDir) || !fs.existsSync(targetPath)) {
      throw new BadRequestException('Document not found or invalid path');
    }

    const ext = path.extname(targetPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    return { filePath: targetPath, contentType };
  }
}
