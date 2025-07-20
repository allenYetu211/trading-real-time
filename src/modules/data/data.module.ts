import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CoinConfigModule } from '../coin-config/coin-config.module';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { DataStorageService } from './data-storage.service';
import { CacheService } from './cache.service';
import { BinanceApiService } from './binance/binance-api.service';
import { WebSocketService } from './websocket/websocket.service';
import { WebSocketController } from './websocket/websocket.controller';
import { StartupService } from './startup.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CoinConfigModule,
  ],
  controllers: [DataController, WebSocketController],
  providers: [
    DataService,
    DataStorageService,
    CacheService,
    BinanceApiService,
    WebSocketService,
    StartupService,
  ],
  exports: [
    DataService,
    DataStorageService,
    CacheService,
    BinanceApiService,
    WebSocketService,
  ],
})
export class DataModule {} 