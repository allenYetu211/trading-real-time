import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CoinConfigModule } from './modules/coin-config/coin-config.module';
// import { DataModule } from './modules/data/data.module';
// import { AnalysisModule } from './modules/analysis/analysis.module';
// import { StrategyModule } from './modules/strategy/strategy.module';
import { OkxIntegrationModule } from './modules/okx-integration/okx-integration.module';
import { NotionIntegrationModule } from './modules/notion-integration/notion-integration.module';
// import { TradingDecisionModule } from './modules/trading-decision/trading-decision.module'; // 已被CCXT模块替代
import { CCXTAnalysisModule } from './modules/ccxt-analysis/ccxt-analysis.module';
import { TechnicalAnalysisModule } from './modules/technical-analysis/technical-analysis.module';
import { TelegramCCXTAnalysisModule } from './modules/telegram-ccxt-analysis/telegram-ccxt-analysis.module';
import { TradingAutomationModule } from './modules/trading-automation/trading-automation.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { appConfig, databaseConfig, redisConfig, binanceConfig, okxConfig, notionConfig, telegramConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, binanceConfig, okxConfig, notionConfig, telegramConfig],
    }),
    PrismaModule,
    TelegramBotModule, // 全局 Telegram Bot 模块，必须在其他使用 TelegramBot 的模块之前导入
    CoinConfigModule,
    OkxIntegrationModule,
    NotionIntegrationModule,
    // TradingDecisionModule, // 已被CCXT模块替代
    CCXTAnalysisModule,
    TechnicalAnalysisModule,
    TelegramCCXTAnalysisModule,
    TradingAutomationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
