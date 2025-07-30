import { Module } from '@nestjs/common';

// Controllers
import { CCXTAnalysisController } from './ccxt-analysis.controller';

// Services  
import { CCXTDataService } from './services/ccxt-data.service';
import { EMAAnalysisService } from './services/ema-analysis.service';
import { OpenInterestService } from './services/open-interest.service';
import { RSIAnalysisService } from './services/rsi-analysis.service';

/**
 * CCXT分析模块
 * 提供基于CCXT的市场数据获取、技术指标分析和持仓量分析功能
 */
@Module({
  imports: [],
  controllers: [CCXTAnalysisController],
  providers: [
    CCXTDataService,
    EMAAnalysisService,
    OpenInterestService,
    RSIAnalysisService,
  ],
  exports: [
    CCXTDataService,
    EMAAnalysisService,
    OpenInterestService,
    RSIAnalysisService,
  ],
})
export class CCXTAnalysisModule {} 