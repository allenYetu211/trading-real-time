import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { PriceTriggerDetectionService } from '../services/price-trigger-detection.service';
import { TradingNotificationService } from '../services/trading-notification.service';

/**
 * 交易调试控制器
 * 提供调试和测试功能
 */
@Controller('trading-debug')
export class TradingDebugController {
  constructor(
    private readonly priceTriggerDetectionService: PriceTriggerDetectionService,
    private readonly tradingNotificationService: TradingNotificationService,
  ) {}

  /**
   * 测试Telegram通知系统
   */
  @Post('test-notification')
  async testNotification() {
    const result = await this.tradingNotificationService.sendTestNotification();
    const status = this.tradingNotificationService.getNotificationStatus();
    
    return {
      success: true,
      data: {
        notificationSent: result,
        telegramStatus: status,
      },
    };
  }

  /**
   * 测试价格触发检测
   */
  @Post('test-price-trigger')
  async testPriceTrigger(@Body() body: { symbol: string; testPrice: number }) {
    const { symbol, testPrice } = body;
    
    const result = await this.priceTriggerDetectionService.testNotificationSystem(symbol, testPrice);
    
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 测试通知频率控制
   */
  @Post('test-frequency-control')
  async testFrequencyControl(@Body() body: { symbol: string; testPrice: number; triggerCount?: number }) {
    const { symbol, testPrice, triggerCount = 5 } = body;
    
    const results: any[] = [];
    
    // 连续触发多次，测试频率控制
    for (let i = 0; i < triggerCount; i++) {
      try {
        console.log(`第 ${i + 1} 次触发测试: ${symbol} 价格 ${testPrice}`);
        
        // 稍微调整价格以模拟真实情况
        const adjustedPrice = testPrice + (Math.random() - 0.5) * 0.001;
        
        await this.priceTriggerDetectionService.checkPriceTriggers(symbol, adjustedPrice);
        
        results.push({
          attempt: i + 1,
          price: adjustedPrice,
          timestamp: new Date().toISOString(),
          status: 'executed'
        });
        
        // 间隔1秒
        if (i < triggerCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        results.push({
          attempt: i + 1,
          price: testPrice,
          timestamp: new Date().toISOString(),
          status: 'error',
          error: error.message
        });
      }
    }
    
    // 获取触发统计信息
    const stats = this.priceTriggerDetectionService.getTriggerStatistics();
    
    return {
      success: true,
      data: {
        testResults: results,
        triggerStatistics: stats,
        message: `完成 ${triggerCount} 次频率控制测试`
      },
    };
  }

  /**
   * 手动触发价格检测
   */
  @Post('manual-price-check')
  async manualPriceCheck(@Body() body: { symbol: string; currentPrice: number }) {
    const { symbol, currentPrice } = body;
    
    try {
      await this.priceTriggerDetectionService.checkPriceTriggers(symbol, currentPrice);
      
      return {
        success: true,
        message: `价格检测已执行: ${symbol} @ ${currentPrice}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取触发统计信息
   */
  @Get('trigger-stats')
  async getTriggerStats() {
    const stats = this.priceTriggerDetectionService.getTriggerStatistics();
    const notificationStatus = this.tradingNotificationService.getNotificationStatus();
    
    return {
      success: true,
      data: {
        triggerStats: stats,
        notificationStatus,
      },
    };
  }

  /**
   * 清理触发记录
   */
  @Post('clear-triggers')
  async clearTriggers(@Body() body: { symbol: string }) {
    const { symbol } = body;
    
    await this.priceTriggerDetectionService.clearExpiredTriggers(symbol);
    
    return {
      success: true,
      message: `已清理 ${symbol} 的触发记录`,
    };
  }

  /**
   * 调试数据格式
   */
  @Get('debug-data/:symbol')
  async debugData(@Param('symbol') symbol: string) {
    try {
      const result = await this.priceTriggerDetectionService.debugAnalysisData(symbol);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}