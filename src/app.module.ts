import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CoinConfigModule } from './modules/coin-config/coin-config.module';
import { DataModule } from './modules/data/data.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { NotificationModule } from './modules/notification/notification.module';
import { TradingHistoryModule } from './modules/trading-history/trading-history.module';
import { OkxIntegrationModule } from './modules/okx-integration/okx-integration.module';
import { NotionIntegrationModule } from './modules/notion-integration/notion-integration.module';
// import { TradingDecisionModule } from './modules/trading-decision/trading-decision.module'; // 已被CCXT模块替代
import { CCXTAnalysisModule } from './modules/ccxt-analysis/ccxt-analysis.module';
import { TechnicalAnalysisModule } from './modules/technical-analysis/technical-analysis.module';
import { appConfig, databaseConfig, redisConfig, binanceConfig, okxConfig, notionConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, binanceConfig, okxConfig, notionConfig],
    }),
    PrismaModule,
    CoinConfigModule,
    DataModule,
    AnalysisModule,
    StrategyModule,
    NotificationModule,
    TradingHistoryModule,
    OkxIntegrationModule,
    NotionIntegrationModule,
    // TradingDecisionModule, // 已被CCXT模块替代
    CCXTAnalysisModule,
    TechnicalAnalysisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
