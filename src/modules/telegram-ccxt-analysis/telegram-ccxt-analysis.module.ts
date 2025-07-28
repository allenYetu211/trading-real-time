import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// 控制器
import { TelegramCCXTAnalysisController } from './telegram-ccxt-analysis.controller';

// 服务
import { TelegramCCXTAnalysisService } from './services/telegram-ccxt-analysis.service';

// 外部模块
import { CCXTAnalysisModule } from '../ccxt-analysis/ccxt-analysis.module';
import { TechnicalAnalysisModule } from '../technical-analysis/technical-analysis.module';
// import { NotificationModule } from '../notification/notification.module';

/**
 * Telegram CCXT 分析模块
 * 提供基于 CCXT 的分析功能的 Telegram 交互界面
 */
@Module({
  imports: [
    ConfigModule,
    CCXTAnalysisModule,
    TechnicalAnalysisModule,
    // forwardRef(() => NotificationModule),
  ],
  controllers: [TelegramCCXTAnalysisController],
  providers: [TelegramCCXTAnalysisService],
  exports: [TelegramCCXTAnalysisService],
})
export class TelegramCCXTAnalysisModule {} 