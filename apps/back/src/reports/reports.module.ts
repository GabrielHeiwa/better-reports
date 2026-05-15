import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { PDF_QUEUE, PdfProcessor } from './pdf.processor';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: PDF_QUEUE }),
    StorageModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, PdfProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
