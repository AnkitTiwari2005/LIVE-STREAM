import * as crypto from 'crypto';

export class CryptoUtil {
  private static getKey(): Buffer {
    const rawKey = process.env.ENCRYPTION_MASTER_KEY;
    if (process.env.NODE_ENV === 'production') {
      if (!rawKey || rawKey.includes('default_insecure') || rawKey.includes('placeholder')) {
        throw new Error('ENCRYPTION_MASTER_KEY must be securely defined in production (32 bytes or 44 base64 chars).');
      }
    }

    const keyString = rawKey || 'default_insecure_key_must_be_32_bytes_len!';
    if (keyString.length === 44 && keyString.endsWith('=')) {
      return Buffer.from(keyString, 'base64');
    }
    // SHA-256 digest guarantees exactly 32-byte key without padding anomalies
    return crypto.createHash('sha256').update(keyString).digest();
  }

  /**
   * Generates a 128-bit (16-byte) cryptographically secure random token in hexadecimal (32 chars)
   */
  static generate128BitToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hashes a string using SHA-256 for fast, irreversible O(1) database lookups
   */
  static hashSha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypts plaintext using AES-256-GCM (returns iv:tag:ciphertext in base64)
   */
  static encryptAesGcm(plainText: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted (in base64 for safe database storage)
    const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    return Buffer.from(combined).toString('base64');
  }

  /**
   * Decrypts ciphertext previously encrypted using AES-256-GCM
   */
  static decryptAesGcm(encryptedBase64: string): string {
    const key = this.getKey();
    const decoded = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    const [ivHex, authTagHex, encryptedHex] = decoded.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Malformed encrypted payload format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
