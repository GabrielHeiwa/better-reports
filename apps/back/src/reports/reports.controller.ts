import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Queue } from 'bullmq';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { GenerateReportDto } from './generate-report.dto';
import { PDF_QUEUE, PdfJobData } from './pdf.processor';

@Controller('reports')
@UseGuards(ThrottlerGuard)
export class ReportsController {
  constructor(@InjectQueue(PDF_QUEUE) private readonly pdfQueue: Queue) {}

  @Post('generate')
  async generate(@Body() dto: GenerateReportDto) {
    const jobId = randomUUID();

    await this.pdfQueue.add(
      'generate',
      {
        jobId,
        template: dto.template,
        parameters: dto.parameters,
        options: dto.options,
      } satisfies PdfJobData,
      { jobId },
    );

    return { jobId };
  }

  @Get('job/:id/events')
  async jobEvents(@Param('id') id: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: string, data: unknown) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    const poll = async () => {
      const job = await this.pdfQueue.getJob(id);

      if (!job) {
        send('error', { message: 'Job not found' });
        return res.end();
      }

      const state = await job.getState();

      if (state === 'completed') {
        send('done', job.returnvalue);
        return res.end();
      }

      if (state === 'failed') {
        send('error', { message: job.failedReason ?? 'Job failed' });
        return res.end();
      }

      send('status', { state, progress: job.progress });
      return setTimeout(poll, 1500);
    };

    res.on('close', () => {});
    await poll();
  }

  @Get('job/:id/status')
  async jobStatus(@Param('id') id: string) {
    const job = await this.pdfQueue.getJob(id);
    if (!job) return { state: 'not_found' };
    const state = await job.getState();
    return {
      state,
      ...(state === 'completed' ? { result: job.returnvalue } : {}),
      ...(state === 'failed' ? { reason: job.failedReason } : {}),
    };
  }
}
