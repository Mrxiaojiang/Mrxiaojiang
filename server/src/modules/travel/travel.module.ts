import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { TravelPlan } from './travel-plan.entity';
import { TravelSuggestion } from './travel-suggestion.entity';
import { TravelController } from './travel.controller';
import { TravelService } from './travel.service';
import { AmapService } from './amap.service';

@Module({
  imports: [TypeOrmModule.forFeature([TravelPlan, TravelSuggestion]), ConfigModule, NotificationModule],
  controllers: [TravelController],
  providers: [TravelService, AmapService],
})
export class TravelModule {}
