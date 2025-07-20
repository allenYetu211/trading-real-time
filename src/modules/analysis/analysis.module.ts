import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DataModule } from '../data/data.module';
import { CoinConfigModule } from '../coin-config/coin-config.module';
import { NotificationModule } from '../notification/notification.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { ScheduledAnalysisService } from './services/scheduled-analysis.service';
import { IndicatorService } from './indicators/indicator.service';
import { PatternRecognitionService } from './patterns/pattern-recognition.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    forwardRef(() => DataModule),
    CoinConfigModule,
    NotificationModule,
  ],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    ScheduledAnalysisService,
    IndicatorService,
    PatternRecognitionService,
  ],
  exports: [
    AnalysisService,
    ScheduledAnalysisService,
    IndicatorService,
    PatternRecognitionService,
  ],
})
export class AnalysisModule {} 