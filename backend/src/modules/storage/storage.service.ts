import { Injectable, Logger, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export const ALLOWED_FOLDERS = ['media', 'avatars', 'thumbnails', 'kyc'] as const;
export type AllowedFolder = typeof ALLOWED_FOLDERS[number];

export const MAX_FILES_PER_USER_PER_FOLDER: Record<string, number> = {
  media: 50,
  avatars: 10,
  thumbnails: 50,
  kyc: 10,
};

export const KEY_RE = /^(media|avatars|thumbnails|kyc)\/([A-Za-z0-9_-]+)_[0-9a-f]{32}\.(jpg|jpeg|png|webp|pdf)$/;

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
   * Check user upload quota per folder to prevent disk exhaustion attacks (N3)
   */
  checkUserFolderQuota(folder: string, userId: string): void {
    const max = MAX_FILES_PER_USER_PER_FOLDER[folder] || 50;
    const isKyc = folder === 'kyc';
    const folderDir = isKyc ? this.privateKycDir : path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderDir)) return;

    const userPrefix = `${userId}_`;
    const existingFiles = fs.readdirSync(folderDir).filter((file) => file.startsWith(userPrefix));
    if (existingFiles.length >= max) {
      throw new BadRequestException(
        `Upload quota exceeded for folder '${folder}' (maximum ${max} files allowed)`,
      );
    }
  }

  /**
   * Generates a signed or direct upload token and target URL for authenticated media assets (C-07, B-06, N3)
   */
  async getPresignedUploadUrl(filename: string, contentType: string, folder = 'media', userId?: string) {
    const safeFolder = (folder || 'media').trim().toLowerCase();
    if (!ALLOWED_FOLDERS.includes(safeFolder as AllowedFolder)) {
      throw new BadRequestException(
        `Disallowed upload folder: ${folder}. Allowed folders: ${ALLOWED_FOLDERS.join(', ')}`,
      );
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
      throw new BadRequestException(
        `Disallowed file type: ${contentType}. Allowed types: JPEG, PNG, WEBP, PDF.`,
      );
    }

    const rawExt = path.extname(filename).toLowerCase();
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.jpg';

    if (ext === '.pdf' && safeFolder !== 'kyc') {
      throw new BadRequestException('PDF documents are only permitted in the kyc folder');
    }

    if (userId) {
      this.checkUserFolderQuota(safeFolder, userId);
    }

    const uniqueId = crypto.randomBytes(16).toString('hex');
    const userPrefix = userId ? `${userId}_` : '';
    const storageKey = `${safeFolder}/${userPrefix}${uniqueId}${ext}`;

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

    // Strict key format validation (N3)
    const match = storageKey.match(KEY_RE);
    if (!match) {
      throw new BadRequestException('Invalid storage key format');
    }
    const [_, folder, ownerId] = match;

    // Enforce quota at save time
    this.checkUserFolderQuota(folder, ownerId);

    // Verify magic bytes and strict agreement with extension (N3)
    const ext = path.extname(storageKey).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Disallowed file extension');
    }

    const isPdf = buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp = buffer.length >= 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP';

    if (ext === '.pdf' && !isPdf) {
      throw new BadRequestException('File extension .pdf does not match file content (expected PDF)');
    }
    if ((ext === '.jpg' || ext === '.jpeg') && !isJpeg) {
      throw new BadRequestException('File extension does not match file content (expected JPEG)');
    }
    if (ext === '.png' && !isPng) {
      throw new BadRequestException('File extension .png does not match file content (expected PNG)');
    }
    if (ext === '.webp' && !isWebp) {
      throw new BadRequestException('File extension .webp does not match file content (expected WEBP)');
    }

    // Sanitize against directory traversal
    const safeKey = storageKey.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+/, '');
    const isKyc = safeKey.startsWith('kyc/');
    const baseDir = isKyc ? this.privateKycDir : this.uploadDir;
    const relativeKey = isKyc ? safeKey.replace(/^kyc\//, '') : safeKey;
    const targetPath = path.resolve(baseDir, relativeKey);

    if (!targetPath.startsWith(baseDir + path.sep)) {
      throw new BadRequestException('Invalid storage key traversal');
    }

    // B-06: Prevent overwriting existing stored files
    if (fs.existsSync(targetPath)) {
      throw new BadRequestException('Target storage key already exists');
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
   * Securely delete a file from storage (N-06)
   */
  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      const safeKey = storageKey.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+/, '');
      const isKyc = safeKey.startsWith('kyc/');
      const baseDir = isKyc ? this.privateKycDir : this.uploadDir;
      const relativeKey = isKyc ? safeKey.replace(/^kyc\//, '') : safeKey;
      const targetPath = path.resolve(baseDir, relativeKey);

      if (targetPath.startsWith(baseDir) && fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        this.logger.log(`Deleted file securely: ${safeKey}`);
        return true;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to delete file [${storageKey}]: ${err.message}`);
    }
    return false;
  }

  /**
   * Retrieve a private KYC document with strict boundary check (B-06)
   */
  getKycFile(storageKey: string): { filePath: string; contentType: string } {
    const safeKey = storageKey.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+/, '');
    const relativeKey = safeKey.replace(/^kyc\//, '');
    const targetPath = path.resolve(this.privateKycDir, relativeKey);

    if (!targetPath.startsWith(this.privateKycDir + path.sep) || !fs.existsSync(targetPath)) {
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
