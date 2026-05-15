import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Handlebars from 'handlebars';
import puppeteer, { Browser } from 'puppeteer';
import { registerHelpers } from './handlebars-helpers';

@Injectable()
export class ReportsService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;

  async onModuleInit() {
    registerHelpers();
    this.browser = await puppeteer.launch({ headless: true });
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  async generatePdf(
    template: string,
    parameters: Record<string, unknown>,
    options?: {
      format?: 'A4' | 'A3' | 'Letter' | 'Legal';
      landscape?: boolean;
      marginTop?: string;
      marginRight?: string;
      marginBottom?: string;
      marginLeft?: string;
    },
  ): Promise<Buffer> {
    const html = Handlebars.compile(template)(parameters);

    const page = await this.browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: options?.format ?? 'A4',
        landscape: options?.landscape ?? false,
        printBackground: true,
        margin: {
          top: options?.marginTop ?? '1cm',
          right: options?.marginRight ?? '1cm',
          bottom: options?.marginBottom ?? '1cm',
          left: options?.marginLeft ?? '1cm',
        },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }
}
