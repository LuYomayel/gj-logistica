import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resend } from 'resend';
import { NotificationLog } from '../entities/notification-log.entity';
import { Order } from '../entities/order.entity';
import { PdfService } from './pdf.service';

export type OrderEventType = 'ORDER_VALIDATE' | 'ORDER_CLOSE';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly recipientEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
    @InjectRepository(NotificationLog)
    private logRepo: Repository<NotificationLog>,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY no configurada. Los emails no se enviarán.');
    }
    this.resend = new Resend(apiKey ?? '');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ?? 'noreply@depositomails.com';
    this.recipientEmail =
      this.configService.get<string>('NOTIFICATION_RECIPIENT_EMAIL') ?? 'l.yomayel@gmail.com';
  }

  /**
   * Genera el PDF del pedido y envía el email vía Resend.
   * Non-blocking — los errores se loguean sin lanzar excepción para no bloquear
   * la operación principal del pedido.
   */
  async sendOrderEvent(event: OrderEventType, order: Order): Promise<void> {
    try {
      const subject = this.buildSubject(event, order);
      const html    = this.buildEmailHtml(event, order);

      // Generate PDF attachment
      const pdfBuffer  = await this.pdfService.generateOrderPdf(order);
      const pdfFilename = `${order.ref}.pdf`;

      let sendError: string | null = null;
      try {
        const { error } = await this.resend.emails.send({
          from: this.fromEmail,
          to:   this.recipientEmail,
          subject,
          html,
          attachments: [
            {
              filename: pdfFilename,
              content:  pdfBuffer,
            },
          ],
        });

        if (error) {
          sendError = JSON.stringify(error);
          this.logger.error(`[${event}] Resend error for order ${order.ref}: ${sendError}`);
        } else {
          this.logger.log(
            `[${event}] Email sent to ${this.recipientEmail} for order ${order.ref} (PDF: ${Math.round(pdfBuffer.length / 1024)}KB)`,
          );
        }
      } catch (mailErr) {
        sendError = String(mailErr);
        this.logger.error(`[${event}] Resend exception for order ${order.ref}: ${mailErr}`);
      }

      // Audit log — always write regardless of send success
      await this.logRepo.save(
        this.logRepo.create({
          event,
          entityType: 'order',
          entityId:   order.id,
          email:      this.recipientEmail,
          response:   sendError ?? 'ok',
          thirdPartyId: order.thirdPartyId,
        }),
      );
    } catch (err) {
      // Never throw — notifications must not block order operations
      this.logger.error(`[${event}] Notification error for order #${order.id}: ${err}`);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildSubject(event: OrderEventType, order: Order): string {
    return event === 'ORDER_VALIDATE'
      ? `✅ Pedido validado: ${order.ref}`
      : `🚚 Pedido despachado: ${order.ref}`;
  }

  private buildEmailHtml(event: OrderEventType, order: Order): string {
    const isValidate = event === 'ORDER_VALIDATE';
    const accent     = '#0891b2';
    const accentDark = '#0e7490';

    const statusChip = isValidate
      ? `<span style="background:#dcfce7; color:#16a34a; font-size:12px; font-weight:700; padding:4px 14px; border-radius:20px;">Validado</span>`
      : `<span style="background:#ede9fe; color:#7c3aed; font-size:12px; font-weight:700; padding:4px 14px; border-radius:20px;">Despachado</span>`;

    const headline = isValidate
      ? 'Un pedido fue validado'
      : 'Un pedido fue despachado';

    const bodyText = isValidate
      ? `El pedido <strong>${order.ref}</strong> fue validado exitosamente. Se ha descontado el stock correspondiente. Encontrará el detalle completo en el PDF adjunto.`
      : `El pedido <strong>${order.ref}</strong> fue marcado como despachado. Encontrará el detalle completo en el PDF adjunto.`;

    const thirdPartyName = (order.thirdParty as { name?: string })?.name ?? `Cliente #${order.thirdPartyId}`;
    const warehouseName  = (order.warehouse as { name?: string })?.name  ?? '—';
    const lines          = (order.lines ?? []) as { quantity?: number }[];
    const totalQty       = lines.reduce((s, l) => s + (l.quantity ?? 0), 0);
    const fmtDate        = (d: Date | string | null | undefined) =>
      d ? new Date(d as string).toLocaleDateString('es-AR') : '—';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,${accentDark} 0%,${accent} 100%); padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:white; font-size:22px; font-weight:900; letter-spacing:-0.5px;">DEPÓSITO</div>
                    <div style="color:rgba(255,255,255,0.8); font-size:11px; text-transform:uppercase; letter-spacing:2px; margin-top:3px;">Sistema de Gestión</div>
                  </td>
                  <td align="right">
                    ${statusChip}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ACCENT STRIP -->
          <tr><td style="height:3px; background:linear-gradient(90deg,${accentDark},${accent},#67e8f9);"></td></tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px 36px;">

              <h2 style="margin:0 0 6px; color:#0f172a; font-size:20px; font-weight:700;">${headline}</h2>
              <p style="margin:0 0 24px; color:#64748b; font-size:14px; line-height:1.7;">${bodyText}</p>

              <!-- ORDER CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:24px;">
                <!-- Card header -->
                <tr>
                  <td colspan="2" style="padding:14px 20px; border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:2px; color:${accent};">Resumen del Pedido</span>
                  </td>
                </tr>
                <!-- Ref -->
                <tr>
                  <td style="padding:10px 20px; color:#64748b; font-size:12px; width:160px;">Número de pedido</td>
                  <td style="padding:10px 20px; color:#0f172a; font-weight:800; font-size:15px; font-family:monospace;">${order.ref}</td>
                </tr>
                <!-- Date -->
                <tr style="background:#ffffff;">
                  <td style="padding:10px 20px; color:#64748b; font-size:12px;">Fecha</td>
                  <td style="padding:10px 20px; color:#0f172a; font-weight:600; font-size:13px;">${fmtDate(order.orderDate)}</td>
                </tr>
                <!-- Client -->
                <tr>
                  <td style="padding:10px 20px; color:#64748b; font-size:12px;">Cliente</td>
                  <td style="padding:10px 20px; color:#0f172a; font-weight:600; font-size:13px;">${thirdPartyName}</td>
                </tr>
                <!-- Warehouse -->
                <tr style="background:#ffffff;">
                  <td style="padding:10px 20px; color:#64748b; font-size:12px;">Almacén</td>
                  <td style="padding:10px 20px; color:#0f172a; font-weight:600; font-size:13px;">${warehouseName}</td>
                </tr>
                <!-- Lines / qty -->
                <tr>
                  <td style="padding:10px 20px; color:#64748b; font-size:12px;">Líneas / Unidades</td>
                  <td style="padding:10px 20px; color:#0f172a; font-weight:600; font-size:13px;">${lines.length} líneas &mdash; ${totalQty.toLocaleString('es-AR')} unidades</td>
                </tr>
                ${order.agencia ? `
                <tr style="background:#ffffff;">
                  <td style="padding:10px 20px; color:#64748b; font-size:12px;">Agencia</td>
                  <td style="padding:10px 20px; color:#0f172a; font-weight:600; font-size:13px;">${order.agencia}</td>
                </tr>` : ''}
                ${order.nroSeguimiento ? `
                <tr>
                  <td style="padding:10px 20px; color:#64748b; font-size:12px;">Nro. Seguimiento</td>
                  <td style="padding:10px 20px; color:#0f172a; font-weight:700; font-size:13px; font-family:monospace;">${order.nroSeguimiento}</td>
                </tr>` : ''}
              </table>

              <!-- PDF NOTE -->
              <div style="background:#ecfeff; border:1px solid #a5f3fc; border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:12px;">
                <span style="font-size:20px;">📎</span>
                <p style="margin:0; color:#0e7490; font-size:13px; line-height:1.5;">
                  El <strong>PDF completo del pedido</strong> se encuentra adjunto a este correo (<strong>${order.ref}.pdf</strong>).
                </p>
              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:16px 36px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; color:#94a3b8; font-size:11px;">
                GJ Logística &mdash; Sistema de Gestión de Depósito &nbsp;|&nbsp;
                &copy; ${new Date().getFullYear()}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
