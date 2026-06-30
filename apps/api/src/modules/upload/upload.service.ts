import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../../common/logger/logger.service';
import { FILE_UPLOAD } from '../../common/constants';

@Injectable()
export class UploadService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'smarttable');
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" created`, 'UploadService');
      }
    } catch (error) {
      this.logger.warn(
        `Could not initialize MinIO bucket: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UploadService',
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > FILE_UPLOAD.MAX_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB limit`,
      );
    }

    if (!FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${FILE_UPLOAD.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.minioClient.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';
    const url = `${protocol}://${endpoint}:${port}/${this.bucket}/${key}`;

    this.logger.log(`File uploaded: ${key}`, 'UploadService');

    return { url, key };
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, key);
      this.logger.log(`File deleted: ${key}`, 'UploadService');
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'UploadService',
      );
    }
  }

  async getPresignedUrl(key: string, expiry: number = 3600): Promise<string> {
    return this.minioClient.presignedGetObject(this.bucket, key, expiry);
  }
}
