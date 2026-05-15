import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly presignTtlSeconds: number;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET') ?? 'better-reports';
    this.presignTtlSeconds = Number(this.config.get('STORAGE_PRESIGN_TTL_SECONDS') ?? 3600);

    this.s3 = new S3Client({
      region: 'us-east-1',
      endpoint: this.config.get<string>('MINIO_ENDPOINT') ?? 'http://localhost:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
      },
    });
  }

  async onModuleInit() {
    const { CreateBucketCommand, HeadBucketCommand } = await import('@aws-sdk/client-s3');
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async upload(key: string, buffer: Buffer, contentType = 'application/pdf'): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async presign(key: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.presignTtlSeconds },
    );
  }
}
