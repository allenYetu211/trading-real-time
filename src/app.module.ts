import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CoinConfigModule } from './modules/coin-config/coin-config.module';
import { DataModule } from './modules/data/data.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { appConfig, databaseConfig, redisConfig, binanceConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, binanceConfig],
    }),
    PrismaModule,
    CoinConfigModule,
    DataModule,
    AnalysisModule,
    StrategyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
