import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

import { ScheduledAnalysisService } from './services/scheduled-analysis.service';
import { RealtimePriceMonitorService } from './services/realtime-price-monitor.service';
import { PriceTriggerDetectionService } from './services/price-trigger-detection.service';
import { TradingNotificationService } from './services/trading-notification.service';
import { TriggerTestResult } from './interfaces';

/**
 * 交易自动化控制器
 * 提供管理和测试交易自动化功能的API接口
 */
@ApiTags('交易自动化')
@Controller('api/trading-automation')
export class TradingAutomationController {
  constructor(
    private readonly scheduledAnalysisService: ScheduledAnalysisService,
    private readonly realtimePriceMonitorService: RealtimePriceMonitorService,
    private readonly priceTriggerDetectionService: PriceTriggerDetectionService,
    private readonly tradingNotificationService: TradingNotificationService,
  ) {}

  /**
   * 获取交易自动化系统状态
   */
  @Get('status')
  @ApiOperation({ summary: '获取系统状态', description: '获取交易自动化系统的整体状态信息' })
  getSystemStatus() {
    const analysisStatus = this.scheduledAnalysisService.getAnalysisStatus();
    const priceMonitorStatus = this.realtimePriceMonitorService.getConnectionStatus();
    const triggerStats = this.priceTriggerDetectionService.getTriggerStatistics();
    const notificationStatus = this.tradingNotificationService.getNotificationStatus();

    return {
      success: true,
      data: {
        analysis: analysisStatus,
        priceMonitor: priceMonitorStatus,
        triggerDetection: triggerStats,
        notification: notificationStatus,
        timestamp: Date.now(),
      }
    };
  }

  /**
   * 手动触发技术分析
   */
  @Post('analysis/trigger')
  @ApiOperation({ summary: '手动触发分析', description: '手动触发指定交易对或所有交易对的技术分析' })
  @ApiQuery({ name: 'symbol', required: false, description: '交易对符号，不指定则分析所有' })
  async triggerAnalysis(@Query('symbol') symbol?: string) {
    try {
      await this.scheduledAnalysisService.triggerManualAnalysis(symbol);
      return {
        success: true,
        message: `技术分析已触发: ${symbol || '所有交易对'}`,
        data: { symbol, timestamp: Date.now() }
      };
    } catch (error) {
      return {
        success: false,
        message: `触发分析失败: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 获取实时价格信息
   */
  @Get('prices')
  @ApiOperation({ summary: '获取实时价格', description: '获取所有监控交易对的最新价格' })
  getRealtimePrices() {
    const prices = this.realtimePriceMonitorService.getAllLatestPrices();
    const pricesObj = Object.fromEntries(prices);

    return {
      success: true,
      data: {
        prices: pricesObj,
        count: prices.size,
        timestamp: Date.now(),
      }
    };
  }

  /**
   * 获取指定交易对的最新价格
   */
  @Get('prices/:symbol')
  @ApiOperation({ summary: '获取指定交易对价格', description: '获取指定交易对的最新实时价格' })
  @ApiParam({ name: 'symbol', description: '交易对符号' })
  getSymbolPrice(@Param('symbol') symbol: string) {
    const price = this.realtimePriceMonitorService.getLatestPrice(symbol);

    if (price === undefined) {
      return {
        success: false,
        message: `未找到 ${symbol} 的价格数据`,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        symbol,
        price,
        timestamp: Date.now(),
      }
    };
  }

  /**
   * 添加交易对到监控列表
   */
  @Post('monitor/:symbol')
  @ApiOperation({ summary: '添加监控', description: '将指定交易对添加到实时价格监控列表' })
  @ApiParam({ name: 'symbol', description: '交易对符号' })
  async addSymbolToMonitor(@Param('symbol') symbol: string) {
    try {
      await this.realtimePriceMonitorService.addSymbolToMonitor(symbol);
      return {
        success: true,
        message: `已添加 ${symbol} 到监控列表`,
        data: { symbol, timestamp: Date.now() }
      };
    } catch (error) {
      return {
        success: false,
        message: `添加监控失败: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 从监控列表移除交易对
   */
  @Post('monitor/:symbol/remove')
  @ApiOperation({ summary: '移除监控', description: '从实时价格监控列表中移除指定交易对' })
  @ApiParam({ name: 'symbol', description: '交易对符号' })
  removeSymbolFromMonitor(@Param('symbol') symbol: string) {
    this.realtimePriceMonitorService.removeSymbolFromMonitor(symbol);
    return {
      success: true,
      message: `已从监控列表移除 ${symbol}`,
      data: { symbol, timestamp: Date.now() }
    };
  }

  /**
   * 刷新监控列表
   */
  @Post('monitor/refresh')
  @ApiOperation({ summary: '刷新监控列表', description: '根据活跃配置刷新价格监控列表' })
  async refreshMonitorList() {
    try {
      await this.realtimePriceMonitorService.refreshMonitoredSymbols();
      return {
        success: true,
        message: '监控列表已刷新',
        data: { timestamp: Date.now() }
      };
    } catch (error) {
      return {
        success: false,
        message: `刷新监控列表失败: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 测试价格触发
   */
  @Post('trigger/test')
  @ApiOperation({ summary: '测试价格触发', description: '测试指定价格是否会触发买入/卖出通知' })
  @ApiBody({
    description: '测试参数',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '交易对符号' },
        testPrice: { type: 'number', description: '测试价格' },
        sendNotification: { type: 'boolean', description: '是否发送实际通知', default: false }
      },
      required: ['symbol', 'testPrice']
    }
  })
  async testPriceTrigger(@Body() body: {
    symbol: string;
    testPrice: number;
    sendNotification?: boolean;
  }) {
    try {
      const result = await this.priceTriggerDetectionService.testPriceTrigger(
        body.symbol,
        body.testPrice,
        body.sendNotification || false
      );

      return {
        success: true,
        message: '价格触发测试完成',
        data: {
          ...result,
          testPrice: body.testPrice,
          timestamp: Date.now(),
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `价格触发测试失败: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 清理过期触发记录
   */
  @Post('trigger/clear/:symbol')
  @ApiOperation({ summary: '清理触发记录', description: '清理指定交易对的过期触发记录' })
  @ApiParam({ name: 'symbol', description: '交易对符号' })
  async clearTriggerHistory(@Param('symbol') symbol: string) {
    try {
      await this.priceTriggerDetectionService.clearExpiredTriggers(symbol);
      return {
        success: true,
        message: `已清理 ${symbol} 的触发记录`,
        data: { symbol, timestamp: Date.now() }
      };
    } catch (error) {
      return {
        success: false,
        message: `清理触发记录失败: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 发送测试通知
   */
  @Post('notification/test')
  @ApiOperation({ summary: '发送测试通知', description: '发送测试通知到Telegram' })
  @ApiBody({
    description: '通知内容',
    schema: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['PRICE_TRIGGER', 'SYSTEM_STATUS'],
          description: '通知类型' 
        },
        message: { type: 'string', description: '测试消息内容' }
      },
      required: ['type', 'message']
    }
  })
  async sendTestNotification(@Body() body: {
    type: 'PRICE_TRIGGER' | 'SYSTEM_STATUS';
    message: string;
  }) {
    try {
      let success = false;

      if (body.type === 'SYSTEM_STATUS') {
        success = await this.tradingNotificationService.sendSystemStatusNotification({
          type: 'info',
          title: '系统启动测试',
          message: `测试通知: ${body.message}`,
          timestamp: Date.now(),
        });
      } else {
        // 构建一个测试的价格触发事件
        const testTriggerEvent = {
          symbol: 'TESTUSDT',
          triggerType: 'BUY' as const,
          currentPrice: 100.0,
          targetPrice: 99.5,
          tolerance: 0.5,
          confidence: 0.85,
          timestamp: Date.now(),
        };
        
        success = await this.tradingNotificationService.sendPriceTriggerNotification(testTriggerEvent);
      }

      return {
        success,
        message: success ? '测试通知发送成功' : '测试通知发送失败',
        data: { type: body.type, timestamp: Date.now() }
      };
    } catch (error) {
      return {
        success: false,
        message: `发送测试通知失败: ${error.message}`,
        error: error.message,
      };
    }
  }
}