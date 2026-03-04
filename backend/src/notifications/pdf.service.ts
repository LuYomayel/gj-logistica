import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { Order } from '../entities/order.entity';
import { buildOrderPdfHtml } from './order-pdf.template';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Genera un PDF moderno del pedido usando Puppeteer (Chromium headless).
   * Retorna un Buffer listo para adjuntar a un email o enviar como respuesta HTTP.
   */
  async generateOrderPdf(order: Order): Promise<Buffer> {
    const html = buildOrderPdfHtml(order);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true, // Required for gradients and background colors
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });

      this.logger.log(`PDF generado para pedido ${order.ref} (${Math.round(pdf.length / 1024)}KB)`);
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
