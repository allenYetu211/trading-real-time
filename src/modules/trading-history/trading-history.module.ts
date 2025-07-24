import { Module } from '@nestjs/common';
import { TradingHistoryController } from './trading-history.controller';
import { TradingHistoryService } from './trading-history.service';
import { PrismaModule } from 'src/prisma/prisma.module';

/**
 * 交易历史记录模块
 */
@Module({
  imports: [PrismaModule],
  controllers: [TradingHistoryController],
  providers: [TradingHistoryService],
  exports: [TradingHistoryService], // 导出服务供其他模块使用
})
export class TradingHistoryModule {} 