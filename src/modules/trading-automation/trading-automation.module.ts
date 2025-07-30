import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// 控制器导入
import { TradingAutomationController } from './trading-automation.controller';

// 服务导入
import { ScheduledAnalysisService } from './services/scheduled-analysis.service';
import { RealtimePriceMonitorService } from './services/realtime-price-monitor.service';
import { PriceTriggerDetectionService } from './services/price-trigger-detection.service';
import { TradingNotificationService } from './services/trading-notification.service';

// 依赖模块导入
import { PrismaModule } from 'src/prisma/prisma.module';
import { CoinConfigModule } from '../coin-config/coin-config.module';
import { TechnicalAnalysisModule } from '../technical-analysis/technical-analysis.module';
import { CCXTAnalysisModule } from '../ccxt-analysis/ccxt-analysis.module';

/**
 * 交易自动化模块
 * 整合定时分析、实时监控、价格触发检测和通知功能
 */
@Module({
  imports: [
    // 基础模块
    ConfigModule,
    ScheduleModule.forRoot(), // 启用定时任务功能
    PrismaModule,
    
    // 业务模块
    CoinConfigModule,
    TechnicalAnalysisModule,
    CCXTAnalysisModule,
  ],
  controllers: [
    TradingAutomationController,
  ],
  providers: [
    // 核心服务
    ScheduledAnalysisService,
    RealtimePriceMonitorService,
    PriceTriggerDetectionService,
    TradingNotificationService,
  ],
  exports: [
    // 导出服务供其他模块使用
    ScheduledAnalysisService,
    RealtimePriceMonitorService,
    PriceTriggerDetectionService,
    TradingNotificationService,
  ],
})
export class TradingAutomationModule {}