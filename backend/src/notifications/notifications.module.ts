import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { NotificationsService } from './notifications.service';
import { NotificationSetting } from '../entities/notification-setting.entity';
import { NotificationLog } from '../entities/notification-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationSetting, NotificationLog]),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST', 'smtp.gmail.com'),
          port: config.get<number>('MAIL_PORT', 587),
          secure: false,
          auth: {
            user: config.get('MAIL_USER', 'f.depositomails@gmail.com'),
            pass: config.get('MAIL_PASS', ''),
          },
        },
        defaults: {
          from: `"Deposito" <${config.get('MAIL_USER', 'f.depositomails@gmail.com')}>`,
        },
        template: {
          dir: join(__dirname, '..', 'notifications', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
