import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSetting } from '../entities/notification-setting.entity';
import { NotificationLog } from '../entities/notification-log.entity';
import { Order } from '../entities/order.entity';

export type OrderEventType = 'ORDER_VALIDATE' | 'ORDER_CLOSE';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly mailer: MailerService,
    @InjectRepository(NotificationSetting)
    private settingRepo: Repository<NotificationSetting>,
    @InjectRepository(NotificationLog)
    private logRepo: Repository<NotificationLog>,
  ) {}

  /**
   * Fire email notification for an order event.
   * Non-blocking — errors are logged, not thrown, so they don't block order transactions.
   */
  async sendOrderEvent(event: OrderEventType, order: Order): Promise<void> {
    try {
      const settings = await this.settingRepo.find({
        where: { event, isActive: true, type: 'email' },
      });
      if (!settings.length) return;

      for (const setting of settings) {
        const recipient = setting.email;
        if (!recipient) continue;

        const subject = this.buildSubject(event, order);
        const template = event === 'ORDER_VALIDATE' ? 'order-validate' : 'order-close';

        let sendError: string | null = null;
        try {
          await this.mailer.sendMail({
            to: recipient,
            subject,
            template,
            context: {
              ref: order.ref,
              thirdPartyId: order.thirdPartyId,
              totalTTC: order.totalTTC,
              orderDate: order.orderDate,
              deliveryDate: order.deliveryDate,
              nroSeguimiento: order.nroSeguimiento,
              agencia: order.agencia,
            },
          });
          this.logger.log(`[${event}] Email sent to ${recipient} for order ${order.ref}`);
        } catch (mailErr) {
          sendError = String(mailErr);
          this.logger.error(`[${event}] Mail error to ${recipient}: ${mailErr}`);
        }

        await this.logRepo.save(
          this.logRepo.create({
            event,
            entityType: 'order',
            entityId: order.id,
            email: recipient,
            response: sendError ?? 'ok',
            thirdPartyId: order.thirdPartyId,
          }),
        );
      }
    } catch (err) {
      this.logger.error(`[${event}] Notification error for order #${order.id}: ${err}`);
      // Intentionally not rethrowing — notifications must never block order operations
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private buildSubject(event: OrderEventType, order: Order): string {
    if (event === 'ORDER_VALIDATE') return `Pedido validado: ${order.ref}`;
    return `Pedido despachado: ${order.ref}`;
  }
}
