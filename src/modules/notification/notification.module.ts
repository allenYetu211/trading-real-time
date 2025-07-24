import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TelegramService } from './services/telegram.service';
import { telegramConfig } from 'src/config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(telegramConfig),
    forwardRef(() => import('../coin-config/coin-config.module').then(m => m.CoinConfigModule)),
    forwardRef(() => import('../analysis/analysis.module').then(m => m.AnalysisModule)),
    forwardRef(() => import('../data/data.module').then(m => m.DataModule)),
    forwardRef(() => import('../trading-history/trading-history.module').then(m => m.TradingHistoryModule)),
    forwardRef(() => import('../okx-integration/okx-integration.module').then(m => m.OkxIntegrationModule)),
    forwardRef(() => import('../notion-integration/notion-integration.module').then(m => m.NotionIntegrationModule)),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, TelegramService],
  exports: [NotificationService, TelegramService],
})
export class NotificationModule {} 