import { Injectable, Scope, HttpStatus } from '@nestjs/common';
import { IdempotencyStrategy, Storage } from '@google-cloud/storage';
import { env } from 'process';
import { Response } from 'express';
import { join } from 'path';

@Injectable({
  scope: Scope.DEFAULT,
})
export class StorageService {
  static URL_LIFETIME = 60 * 60 * 1e3; // 1h

  private readonly storage: Storage;

  private get expirationDate(): number {
    return Date.now() + StorageService.URL_LIFETIME;
  }

  private get maxAgeSeconds(): number {
    return StorageService.URL_LIFETIME / 1e3;
  }

  constructor() {
    this.storage = new Storage({
      keyFilename: env.CWD
        ? join(env.CWD, env.GOOGLE_STORAGE_KEYFILE)
        : env.GOOGLE_STORAGE_KEYFILE,
      retryOptions: {
        autoRetry: true,
        idempotencyStrategy: IdempotencyStrategy.RetryAlways,
        retryDelayMultiplier: 3,
        maxRetryDelay: 60,
        totalTimeout: 500,
        maxRetries: 5,
      },
    });
  }

  async createBucket(name: string) {
    return await this.storage.createBucket(name);
  }

  async deleteBucket(name: string) {
    return await this.storage.bucket(name).delete();
  }

  uploadBuffer(bucket: string, fileName: string, buffer: Buffer) {
    return new Promise((resolve) => {
      const stream = this.storage
        .bucket(bucket)
        .file(fileName)
        .createWriteStream();

      stream.once('error', (error) => resolve({ success: false, error }));
      stream.once('finish', () => resolve({ success: true }));
      stream.end(buffer);
    });
  }

  getLocalStorageURL(bucketName: string, fileName: string): string | null {
    return env.LOCAL_STORAGE
      ? join(env.LOCAL_STORAGE, bucketName, fileName)
      : null;
  }

  async getFileTmpURL(bucketName: string, fileName: string) {
    const bucket = this.storage.bucket(bucketName),
      [metadata] = await bucket.getMetadata();

    if (
      !metadata.cors?.some(
        ({ origin, method, responseHeader }) =>
          origin.includes(env.CORS_ORIGIN) &&
          method.includes('GET') &&
          responseHeader.includes('Content-Type'),
      )
    )
      await bucket.setCorsConfiguration([
        {
          origin: [env.CORS_ORIGIN],
          method: ['GET'],
          responseHeader: ['Content-Type'],
          maxAgeSeconds: this.maxAgeSeconds,
        },
      ]);

    const [url] = await bucket.file(fileName).getSignedUrl({
      action: 'read',
      expires: this.expirationDate,
    });
    return url;
  }

  async pipeFile(response: Response, bucketName: string, fileName: string) {
    try {
      const [file] = await this.storage.bucket(bucketName).file(fileName).get();
      if (!file) response.status(HttpStatus.NOT_FOUND).send();
      else file.createReadStream().pipe(response);
    } catch (e) {
      response.status(HttpStatus.NOT_FOUND).send();
    }
  }

  async getFileTmpUploadURL(
    bucketName: string,
    fileName: string,
    contentType?: string,
  ) {
    const bucket = this.storage.bucket(bucketName),
      [metadata] = await bucket.getMetadata();

    if (
      !metadata.cors?.some(
        ({ origin, method, responseHeader }) =>
          origin.includes(env.CORS_ORIGIN) &&
          method.includes('PUT') &&
          responseHeader.includes('Content-Type'),
      )
    )
      await bucket.setCorsConfiguration([
        {
          origin: [env.CORS_ORIGIN],
          responseHeader: ['Content-Type'],
          method: ['GET', 'PUT'],
          maxAgeSeconds: this.maxAgeSeconds,
        },
      ]);

    const [url] = await bucket.file(fileName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: this.expirationDate,
      contentType,
    });
    return url;
  }
}
