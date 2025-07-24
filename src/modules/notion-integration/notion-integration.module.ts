import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotionApiService } from './services/notion-api.service';
import { NotionSyncService } from './services/notion-sync.service';
import { TradingHistoryModule } from '../trading-history/trading-history.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => TradingHistoryModule),
  ],
  providers: [
    NotionApiService,
    NotionSyncService,
  ],
  exports: [
    NotionApiService,
    NotionSyncService,
  ],
})
export class NotionIntegrationModule {} 