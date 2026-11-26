import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

export interface StorageDirs {
  uploadDir: string;
  privateKycDir: string;
}

const HOSTINGER_HBUILDS_RE = /^(.*?)[\\/]hbuilds[\\/](?:versions|current)(?:[\\/]|$)/;

/**
 * Resolves upload & private KYC directories outside ephemeral per-build folders on Hostinger
 * (`.../domains/<domain>/hbuilds/versions/<uuid>/nodejs` -> `.../domains/<domain>/persistent-storage`),
 * while preserving Docker volume paths (`/app/public/uploads`, `/app/storage/kyc`) and STORAGE_ROOT overrides.
 */
export function resolveStorageDirs(
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): StorageDirs {
  const customRoot = env.STORAGE_ROOT?.trim();
  if (customRoot) {
    const resolvedRoot = path.resolve(customRoot);
    return {
      uploadDir: path.join(resolvedRoot, 'uploads'),
      privateKycDir: path.join(resolvedRoot, 'kyc'),
    };
  }

  const hostingerMatch = cwd.match(HOSTINGER_HBUILDS_RE);
  if (hostingerMatch?.[1]) {
    const persistentRoot = path.join(hostingerMatch[1], 'persistent-storage');
    return {
      uploadDir: path.join(persistentRoot, 'uploads'),
      privateKycDir: path.join(persistentRoot, 'kyc'),
    };
  }

  return {
    uploadDir: path.join(cwd, 'public', 'uploads'),
    privateKycDir: path.join(cwd, 'storage', 'kyc'),
  };
}

/**
 * Ensures preferred directory is writable, falling back gracefully so boot never fails on
 * unexpected filesystem permissions.
 */
export function ensureWritableStorageDir(
  preferred: string,
  fallback: string,
  logger?: Logger,
): string {
  try {
    if (!fs.existsSync(preferred)) {
      fs.mkdirSync(preferred, { recursive: true });
    }
    return preferred;
  } catch (err: any) {
    logger?.warn(
      `Cannot create preferred storage directory [${preferred}] (${err?.message || err}); falling back to [${fallback}].`,
    );
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
    return fallback;
  }
}
