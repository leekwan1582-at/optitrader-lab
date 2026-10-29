import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export interface StorageSaveResult {
  fileRef: string;
  checksum: string;
  localPath: string;
}

export interface DatasetStorageAdapter {
  save(owner: string, datasetId: string, content: Buffer | string): Promise<StorageSaveResult>;
  getLocalPath(fileRef: string): Promise<string>;
  exists(fileRef: string): Promise<boolean>;
  delete(fileRef: string): Promise<void>;
}

export class LocalStorageAdapter implements DatasetStorageAdapter {
  private baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir && path.isAbsolute(baseDir)) {
      this.baseDir = baseDir;
    } else {
      // Default to packages/backend/uploads/
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      this.baseDir = path.resolve(currentDir, '../../', baseDir || 'uploads');
    }
  }

  async save(owner: string, datasetId: string, content: Buffer | string): Promise<StorageSaveResult> {
    const ownerDir = path.join(this.baseDir, owner);
    await fs.promises.mkdir(ownerDir, { recursive: true });

    const filename = `${datasetId}.csv`;
    const targetPath = path.join(ownerDir, filename);

    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    await fs.promises.writeFile(targetPath, buffer);

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const relativeRef = `${owner}/${filename}`;

    return {
      fileRef: relativeRef,
      checksum: hash,
      localPath: targetPath,
    };
  }

  async getLocalPath(fileRef: string): Promise<string> {
    const resolved = path.resolve(this.baseDir, fileRef);
    // Path traversal check
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error('Invalid file reference');
    }
    return resolved;
  }

  async exists(fileRef: string): Promise<boolean> {
    try {
      const resolved = await this.getLocalPath(fileRef);
      await fs.promises.access(resolved, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  async delete(fileRef: string): Promise<void> {
    try {
      const resolved = await this.getLocalPath(fileRef);
      await fs.promises.unlink(resolved);
    } catch {
      // Idempotent delete
    }
  }
}

export const defaultStorage = new LocalStorageAdapter();

