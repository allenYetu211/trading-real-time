import { Module } from '@nestjs/common';
import { StrategyController } from './strategy.controller';
import { StrategyConfigService } from './services/strategy-config.service';
import { StrategySignalService } from './services/strategy-signal.service';
import { StrategyEngineService } from './services/strategy-engine.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [
    PrismaModule,
    AnalysisModule,
  ],
  controllers: [StrategyController],
  providers: [
    StrategyConfigService,
    StrategySignalService,
    StrategyEngineService,
  ],
  exports: [
    StrategyConfigService,
    StrategySignalService,
    StrategyEngineService,
  ],
})
export class StrategyModule {} 