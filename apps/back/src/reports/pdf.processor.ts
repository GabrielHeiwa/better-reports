import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ReportsService } from './reports.service';
import { StorageService } from '../storage/storage.service';

export const PDF_QUEUE = 'pdf';

export interface PdfJobData {
  jobId: string;
  template: string;
  parameters: Record<string, unknown>;
  options?: {
    format?: 'A4' | 'A3' | 'Letter' | 'Legal';
    landscape?: boolean;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
    filename?: string;
  };
}

export interface PdfJobResult {
  key: string;
  presignedUrl: string;
  expiresAt: string;
}

@Processor(PDF_QUEUE, {
  concurrency: Number(process.env.PDF_WORKERS ?? 3),
})
export class PdfProcessor extends WorkerHost {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<PdfJobData>): Promise<PdfJobResult> {
    const { jobId, template, parameters, options } = job.data;

    const pdf = await this.reportsService.generatePdf(template, parameters, options);

    const filename = options?.filename ?? 'report';
    const key = `reports/${jobId}/${filename}.pdf`;

    await this.storageService.upload(key, pdf);
    const presignedUrl = await this.storageService.presign(key);

    const expiresAt = new Date(
      Date.now() + Number(process.env.R2_PRESIGN_TTL_SECONDS ?? 3600) * 1000,
    ).toISOString();

    return { key, presignedUrl, expiresAt };
  }
}
