import { Module } from '@nestjs/common';

// Controllers
import { CCXTAnalysisController } from './ccxt-analysis.controller';

// Services  
import { CCXTDataService } from './services/ccxt-data.service';
import { EMAAnalysisService } from './services/ema-analysis.service';

/**
 * CCXT分析模块
 * 提供基于CCXT的市场数据获取和EMA分析功能
 */
@Module({
  imports: [],
  controllers: [CCXTAnalysisController],
  providers: [
    CCXTDataService,
    EMAAnalysisService,
  ],
  exports: [
    CCXTDataService,
    EMAAnalysisService,
  ],
})
export class CCXTAnalysisModule {} 