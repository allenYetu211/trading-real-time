import { Module } from '@nestjs/common';
import { CoinConfigController } from './coin-config.controller';
import { CoinConfigService } from './coin-config.service';

@Module({
  controllers: [CoinConfigController],
  providers: [CoinConfigService],
  exports: [CoinConfigService],
})
export class CoinConfigModule {} 