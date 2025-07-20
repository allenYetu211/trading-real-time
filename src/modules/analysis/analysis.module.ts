import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DataModule } from '../data/data.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { IndicatorService } from './indicators/indicator.service';
import { PatternRecognitionService } from './patterns/pattern-recognition.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    DataModule,
  ],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    IndicatorService,
    PatternRecognitionService,
  ],
  exports: [
    AnalysisService,
    IndicatorService,
    PatternRecognitionService,
  ],
})
export class AnalysisModule {} 