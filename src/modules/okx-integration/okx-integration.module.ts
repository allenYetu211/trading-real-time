import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { okxConfig } from 'src/config';
import { TradingHistoryModule } from '../trading-history/trading-history.module';
import { OkxApiService } from './services/okx-api.service';
import { TradeProcessorService } from './services/trade-processor.service';
import { OkxSyncService } from './services/okx-sync.service';

@Module({
  imports: [
    ConfigModule.forFeature(okxConfig),
    forwardRef(() => TradingHistoryModule),
  ],
  providers: [
    OkxApiService,
    TradeProcessorService,
    OkxSyncService,
  ],
  exports: [
    OkxApiService,
    TradeProcessorService,
    OkxSyncService,
  ],
})
export class OkxIntegrationModule {} 