import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThirdPartiesService } from './third-parties.service';
import { ThirdPartiesController } from './third-parties.controller';
import { ThirdParty } from '../entities/third-party.entity';
import { SalesRepresentative } from '../entities/sales-representative.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ThirdParty, SalesRepresentative])],
  controllers: [ThirdPartiesController],
  providers: [ThirdPartiesService],
  exports: [ThirdPartiesService],
})
export class ThirdPartiesModule {}
