import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GenerateReportDto } from './generate-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const pdf = await this.reportsService.generatePdf(dto.template, dto.parameters, dto.options);
    const filename = dto.options?.filename ? `${dto.options.filename}.pdf` : 'report.pdf';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }
}
