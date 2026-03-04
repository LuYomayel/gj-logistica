import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { PdfService } from './pdf.service';
import { NotificationSetting } from '../entities/notification-setting.entity';
import { NotificationLog } from '../entities/notification-log.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([NotificationSetting, NotificationLog]),
  ],
  providers: [NotificationsService, PdfService],
  exports: [NotificationsService, PdfService],
})
export class NotificationsModule {}
