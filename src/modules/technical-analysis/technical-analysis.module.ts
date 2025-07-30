import { Module } from '@nestjs/common';

// Import CCXT module for data access
import { CCXTAnalysisModule } from '../ccxt-analysis/ccxt-analysis.module';

// Controllers
import { TechnicalAnalysisController } from './technical-analysis.controller';

// Services
import { MultiTimeframeTrendService } from './services/multi-timeframe-trend.service';
import { SupportResistanceService } from './services/support-resistance.service';
import { CoreTechnicalAnalysisService } from './services/core-technical-analysis.service';

/**
 * 技术分析模块
 * 提供多时间周期趋势分析和支撑阻力位分析功能
 */
@Module({
  imports: [
    CCXTAnalysisModule, // 导入CCXT模块以获取市场数据
  ],
  controllers: [TechnicalAnalysisController],
  providers: [
    MultiTimeframeTrendService,
    SupportResistanceService,
    CoreTechnicalAnalysisService,
  ],
  exports: [
    MultiTimeframeTrendService,
    SupportResistanceService,
    CoreTechnicalAnalysisService,
  ],
})
export class TechnicalAnalysisModule {} 