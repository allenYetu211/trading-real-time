import { Controller, Post, Body, Logger, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TelegramCCXTAnalysisService } from './services/telegram-ccxt-analysis.service';
import { 
  TelegramAnalysisRequestDto,
  TelegramQuickAnalysisDto,
  TelegramMenuActionDto,
  TelegramTechnicalAnalysisDto,
  TelegramTrendAnalysisDto,
  TelegramSupportResistanceDto
} from './dto/index';

/**
 * Telegram CCXT 分析控制器
 * 提供 Telegram 集成的市场分析功能
 */
@ApiTags('Telegram CCXT Analysis')
@Controller('api/telegram-ccxt-analysis')
export class TelegramCCXTAnalysisController {
  private readonly logger = new Logger(TelegramCCXTAnalysisController.name);

  constructor(
    private readonly telegramCCXTAnalysisService: TelegramCCXTAnalysisService,
  ) {}

  /**
   * 重新初始化 Telegram 菜单
   */
  @Post('menu/reinitialize')
  @ApiOperation({ summary: '重新初始化 Telegram 菜单' })
  @ApiResponse({
    status: 200,
    description: '菜单重新初始化完成',
  })
  async reinitializeMenu(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.telegramCCXTAnalysisService.reinitializeMenus();
      return {
        success: true,
        message: '菜单重新初始化成功'
      };
    } catch (error) {
      this.logger.error('重新初始化菜单失败:', error);
      return {
        success: false,
        message: `重新初始化菜单失败: ${error.message}`
      };
    }
  }

  /**
   * 获取 Telegram Bot 状态
   */
  @Get('status')
  @ApiOperation({ summary: '获取 Telegram Bot 状态' })
  @ApiResponse({
    status: 200,
    description: '返回 Bot 状态信息',
  })
  async getBotStatus(): Promise<any> {
    return await this.telegramCCXTAnalysisService.getBotStatus();
  }

  /**
   * 手动触发快速分析
   */
  @Post('analyze/quick')
  @ApiOperation({ summary: '手动触发快速分析' })
  @ApiResponse({
    status: 200,
    description: '快速分析已触发',
  })
  async triggerQuickAnalysis(@Body() body: TelegramQuickAnalysisDto): Promise<{ success: boolean; message: string }> {
    try {
      await this.telegramCCXTAnalysisService.performQuickAnalysis(body.symbol, body.timeframe);
      return {
        success: true,
        message: `${body.symbol} 快速分析已完成`
      };
    } catch (error) {
      this.logger.error('快速分析失败:', error);
      return {
        success: false,
        message: `快速分析失败: ${error.message}`
      };
    }
  }

  /**
   * 测试 Telegram 连接
   */
  @Post('test')
  @ApiOperation({ summary: '测试 Telegram 连接' })
  @ApiResponse({
    status: 200,
    description: '连接测试结果',
  })
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.telegramCCXTAnalysisService.testConnection();
      return {
        success: result,
        message: result ? '连接测试成功' : '连接测试失败'
      };
    } catch (error) {
      this.logger.error('连接测试失败:', error);
      return {
        success: false,
        message: `连接测试失败: ${error.message}`
      };
    }
  }

  /**
   * 手动触发技术分析
   */
  @Post('analyze/technical')
  @ApiOperation({ summary: '手动触发技术分析' })
  @ApiResponse({
    status: 200,
    description: '技术分析已触发',
  })
  async triggerTechnicalAnalysis(@Body() body: TelegramTechnicalAnalysisDto): Promise<{ success: boolean; message: string }> {
    try {
      await this.telegramCCXTAnalysisService.performTechnicalAnalysis(body.symbol, body.analysisType);
      return {
        success: true,
        message: `${body.symbol} 技术分析已完成`
      };
    } catch (error) {
      this.logger.error('技术分析失败:', error);
      return {
        success: false,
        message: `技术分析失败: ${error.message}`
      };
    }
  }

  /**
   * 手动触发趋势分析
   */
  @Post('analyze/trend')
  @ApiOperation({ summary: '手动触发多时间周期趋势分析' })
  @ApiResponse({
    status: 200,
    description: '趋势分析已触发',
  })
  async triggerTrendAnalysis(@Body() body: TelegramTrendAnalysisDto): Promise<{ success: boolean; message: string }> {
    try {
      await this.telegramCCXTAnalysisService.performTrendAnalysis(body.symbol);
      return {
        success: true,
        message: `${body.symbol} 趋势分析已完成`
      };
    } catch (error) {
      this.logger.error('趋势分析失败:', error);
      return {
        success: false,
        message: `趋势分析失败: ${error.message}`
      };
    }
  }

  /**
   * 手动触发支撑阻力位分析
   */
  @Post('analyze/support-resistance')
  @ApiOperation({ summary: '手动触发支撑阻力位分析' })
  @ApiResponse({
    status: 200,
    description: '支撑阻力位分析已触发',
  })
  async triggerSupportResistanceAnalysis(@Body() body: TelegramSupportResistanceDto): Promise<{ success: boolean; message: string }> {
    try {
      await this.telegramCCXTAnalysisService.performSupportResistanceAnalysis(body.symbol);
      return {
        success: true,
        message: `${body.symbol} 支撑阻力位分析已完成`
      };
    } catch (error) {
      this.logger.error('支撑阻力位分析失败:', error);
      return {
        success: false,
        message: `支撑阻力位分析失败: ${error.message}`
      };
    }
  }
} 