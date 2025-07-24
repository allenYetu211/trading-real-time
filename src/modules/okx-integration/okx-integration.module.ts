import { Module } from '@nestjs/common';
import { OkxApiService } from './services/okx-api.service';
import { OkxSyncService } from './services/okx-sync.service';
import { TradeProcessorService } from './services/trade-processor.service';
import { PendingOrderProcessorService } from './services/pending-order-processor.service';
import { OkxIntegrationController } from './okx-integration.controller';
import { TradingHistoryModule } from '../trading-history/trading-history.module';

@Module({
  imports: [TradingHistoryModule],
  controllers: [OkxIntegrationController],
  providers: [
    OkxApiService,
    OkxSyncService,
    TradeProcessorService,
    PendingOrderProcessorService,
  ],
  exports: [
    OkxApiService,
    OkxSyncService,
    TradeProcessorService,
    PendingOrderProcessorService,
  ],
})
export class OkxIntegrationModule {} 