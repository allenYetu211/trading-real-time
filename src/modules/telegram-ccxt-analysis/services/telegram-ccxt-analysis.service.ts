import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService, CommandHandler, CallbackQueryHandler } from 'src/modules/telegram-bot';
import * as TelegramBot from 'node-telegram-bot-api';

// 核心服务依赖
import { EMAAnalysisService } from '../../ccxt-analysis/services/ema-analysis.service';
import { CCXTDataService } from '../../ccxt-analysis/services/ccxt-data.service';
import { OpenInterestService } from '../../ccxt-analysis/services/open-interest.service';
import { RSIAnalysisService } from '../../ccxt-analysis/services/rsi-analysis.service';
import { MultiTimeframeTrendService } from '../../technical-analysis/services/multi-timeframe-trend.service';
import { SupportResistanceService } from '../../technical-analysis/services/support-resistance.service';
import { CoreTechnicalAnalysisService } from '../../technical-analysis/services/core-technical-analysis.service';
import { CoinConfigService } from '../../coin-config/coin-config.service';
import { IntervalType } from 'src/shared/enums';

// 常量定义
const DEFAULT_COIN_CONFIG_INTERVAL = 'default'; // 统一使用默认interval，因为分析会查询所有周期

// 工具类导入
import {
  TelegramConfig,
  UserState,
  AnalysisType,
  AnalysisProcessorUtil,
  MenuTemplate,
} from '../utils';

/**
 * 重构后的 Telegram CCXT 分析服务
 * 使用模块化的工具类，保持服务类的简洁性
 */
@Injectable()
export class TelegramCCXTAnalysisService implements OnModuleInit {
  private readonly logger = new Logger(TelegramCCXTAnalysisService.name);
  private config: TelegramConfig;
  private commandsInitialized = false;
  
  // 用户状态管理
  private userStates = new Map<string, UserState>();
  private readonly STATE_TIMEOUT = 5 * 60 * 1000; // 5分钟超时

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramBotService: TelegramBotService,
    private readonly emaAnalysisService: EMAAnalysisService,
    private readonly ccxtDataService: CCXTDataService,
    private readonly openInterestService: OpenInterestService,
    private readonly rsiAnalysisService: RSIAnalysisService,
    private readonly multiTimeframeTrendService: MultiTimeframeTrendService,
    private readonly supportResistanceService: SupportResistanceService,
    private readonly coreTechnicalAnalysisService: CoreTechnicalAnalysisService,
    private readonly coinConfigService: CoinConfigService,
  ) {
    this.config = this.configService.get<TelegramConfig>('telegram')!;
  }

  async onModuleInit(): Promise<void> {
    await this.initializeCommandHandlers();
    this.startStateCleanup();
  }

  /**
   * 初始化命令处理器
   */
  private async initializeCommandHandlers(): Promise<void> {
    if (!this.telegramBotService.isEnabled()) {
      this.logger.log('Telegram Bot 未启用，跳过命令处理器初始化');
      return;
    }

    this.setupCommandHandlers();
    this.setupCallbackQueryHandlers();
    await this.initializeMenus();
    this.logger.log('Telegram CCXT 分析命令处理器初始化成功');
  }

  /**
   * 设置命令处理器
   */
  private setupCommandHandlers(): void {
    const commands: CommandHandler[] = [
      {
        command: '/start',
        description: '开始使用',
        handler: (msg) => this.handleStartCommand(msg.chat.id),
      },
      {
        command: '/help',
        description: '显示帮助信息',
        handler: (msg) => this.handleHelpCommand(msg.chat.id),
      },
      {
        command: '/status',
        description: '显示系统状态',
        handler: (msg) => this.handleStatusCommand(msg.chat.id),
      },
      {
        command: '/technical',
        description: '技术分析',
        handler: (msg) => this.handleTechnicalCommand(msg.text || '', msg.chat.id),
      },
      {
        command: '/list',
        description: '查看关注列表',
        handler: (msg) => this.handleListCommand(msg.chat.id),
      },
      {
        command: '/watch_list',
        description: '查看关注列表',
        handler: (msg) => this.handleListCommand(msg.chat.id),
      },
      {
        command: '/add',
        description: '添加关注的交易对',
        handler: (msg) => this.handleAddCommandWithMessage(msg),
      },
      {
        command: '/remove',
        description: '移除关注的交易对',
        handler: (msg) => this.handleRemoveCommandWithMessage(msg),
      },
    ];

    // 注册所有命令处理器
    this.telegramBotService.registerCommandHandlers(commands);
  }

  /**
   * 处理 /add 命令（带消息解析）
   */
  private async handleAddCommandWithMessage(msg: TelegramBot.Message): Promise<void> {
    const text = msg.text || '';
    const chatId = msg.chat.id;
    
    if (text.startsWith('/add ')) {
      const symbol = text.substring(5).trim().toUpperCase();
      await this.handleAddCommand(chatId, symbol);
    } else {
      await this.sendMessage(chatId, '请使用格式: /add SYMBOL\n例如: /add BTC/USDT');
    }
  }

  /**
   * 处理 /remove 命令（带消息解析）
   */
  private async handleRemoveCommandWithMessage(msg: TelegramBot.Message): Promise<void> {
    const text = msg.text || '';
    const chatId = msg.chat.id;
    
    if (text.startsWith('/remove ')) {
      const symbol = text.substring(8).trim().toUpperCase();
      await this.handleRemoveCommand(chatId, symbol);
    } else {
      await this.sendMessage(chatId, '请使用格式: /remove SYMBOL\n例如: /remove BTC/USDT');
    }
  }

  /**
   * 设置回调查询处理器
   */
  private setupCallbackQueryHandlers(): void {
    const callbackHandlers: CallbackQueryHandler[] = [
      {
        pattern: 'main_menu',
        description: '主菜单',
        handler: async (query) => {
          const chatId = query.message?.chat.id;
          if (chatId) {
            await this.showMainMenu(chatId);
          }
        },
      },
      {
        pattern: 'analysis_menu',
        description: '分析菜单',
        handler: async (query) => {
          const chatId = query.message?.chat.id;
          if (chatId) {
            await this.showAnalysisMenu(chatId);
          }
        },
      },
      {
        pattern: /^symbols_list:/,
        description: '符号列表',
        handler: async (query) => {
          const chatId = query.message?.chat.id;
          const data = query.data || '';
          if (chatId) {
            const analysisType = data.split(':')[1] as AnalysisType;
            await this.showSymbolSelection(chatId, analysisType);
          }
        },
      },
      {
        pattern: /^analyze:/,
        description: '执行分析',
        handler: async (query) => {
          const chatId = query.message?.chat.id;
          const data = query.data || '';
          if (chatId) {
            await this.handleAnalysisCallback(data, chatId);
          }
        },
      },
    ];

    // 注册所有回调查询处理器
    this.telegramBotService.registerCallbackQueryHandlers(callbackHandlers);
  }

  /**
   * 统一的消息发送方法
   */
  private async sendMessage(chatId: number, message: string, options?: any): Promise<boolean> {
    const result = await this.telegramBotService.sendMessage(message, chatId, {
      parse_mode: options?.parse_mode || 'HTML',
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
      disable_notification: options?.disable_notification ?? false,
      reply_markup: options?.reply_markup,
    });
    return result.success;
  }

  /**
   * 处理 /start 命令
   */
  private async handleStartCommand(chatId: number): Promise<void> {
    const mainMenu = MenuTemplate.getMainMenu();
    const menuOptions = MenuTemplate.getAnalysisTypeMenu();
    await this.sendMessage(chatId, mainMenu, menuOptions);
  }

  /**
   * 处理 /help 命令
   */
  private async handleHelpCommand(chatId: number): Promise<void> {
    const helpMenu = MenuTemplate.getHelpMenu();
    await this.sendMessage(chatId, helpMenu);
  }

  /**
   * 处理 /status 命令
   */
  private async handleStatusCommand(chatId: number): Promise<void> {
    const status = await this.getBotStatus();
    const statusMessage = MenuTemplate.getStatusTemplate(status);
    await this.sendMessage(chatId, statusMessage);
  }

  /**
   * 处理 /technical 命令
   */
  private async handleTechnicalCommand(text: string, chatId: number): Promise<void> {
    const params = text.split(' ').slice(1);
    
    if (params.length === 0) {
      await this.showAnalysisMenu(chatId);
      return;
    }

    const symbol = params[0];
    const analysisType = (params[1] || 'comprehensive') as AnalysisType;
    
    await this.performAnalysis(symbol, analysisType, chatId);
  }

  /**
   * 处理交易对输入
   */
  private async handleSymbolInput(text: string, chatId: number): Promise<void> {
    const cleanSymbol = AnalysisProcessorUtil.normalizeSymbol(text);
    
    if (!AnalysisProcessorUtil.validateSymbol(cleanSymbol)) {
      await this.sendErrorMessage(chatId, '无效的交易对格式', text);
      return;
    }

    await this.performAnalysis(cleanSymbol, AnalysisType.COMPREHENSIVE, chatId);
  }

  /**
   * 处理分析回调
   */
  private async handleAnalysisCallback(data: string, chatId: number): Promise<void> {
    // 数据格式: analyze:SYMBOL:ANALYSIS_TYPE
    // 但对于期货合约，SYMBOL可能包含冒号，如 SOL/USDT:USDT
    // 因此需要特殊处理，从最后一个冒号分割
    const parts = data.split(':');
    const analysisType = parts[parts.length - 1]; // 最后一部分是分析类型
    const symbol = parts.slice(1, -1).join(':'); // 中间部分重新拼接成交易对
    
    await this.performAnalysis(symbol, analysisType as AnalysisType, chatId);
  }

  /**
   * 执行分析
   */
  private async performAnalysis(symbol: string, analysisType: AnalysisType, chatId: number): Promise<void> {
    const analysisDescription = AnalysisProcessorUtil.getAnalysisTypeDescription(analysisType);
    await this.sendMessage(chatId, `⏳ 正在进行 ${symbol} ${analysisDescription}...`);

    try {
      const message = await AnalysisProcessorUtil.performAnalysisByType(
        this.coreTechnicalAnalysisService,
        symbol,
        analysisType,
        this.rsiAnalysisService,
        this.openInterestService
      );
      await this.sendMessage(chatId, message);

    } catch (error) {
      this.logger.error(`分析失败 ${symbol}:`, error);
      await this.sendErrorMessage(chatId, error.message, symbol);
    }
  }

  /**
   * 显示主菜单
   */
  private async showMainMenu(chatId: number): Promise<void> {
    const mainMenu = MenuTemplate.getMainMenu();
    const menuOptions = MenuTemplate.getAnalysisTypeMenu();
    await this.sendMessage(chatId, mainMenu, menuOptions);
  }

  /**
   * 显示分析菜单
   */
  private async showAnalysisMenu(chatId: number): Promise<void> {
    const menuOptions = MenuTemplate.getAnalysisTypeMenu();
    await this.sendMessage(chatId, '请选择分析类型：', menuOptions);
  }

  /**
   * 显示交易对选择
   */
  private async showSymbolSelection(chatId: number, analysisType: AnalysisType): Promise<void> {
    try {
      const analysisDescription = AnalysisProcessorUtil.getAnalysisTypeDescription(analysisType);
      
      // 从数据库获取活跃的交易对配置
      const activeConfigs = await this.coinConfigService.findActiveConfigs();
      
      if (activeConfigs.length === 0) {
        await this.sendMessage(chatId, `
❌ <b>没有可用的交易对</b>

目前没有配置任何关注的交易对。

💡 <b>使用说明：</b>
• 使用 <code>/add BTCUSDT</code> 添加交易对
• 使用 <code>/list</code> 查看关注列表
        `.trim(), { parse_mode: 'HTML' });
        return;
      }

      // 获取唯一的交易对符号（去重）
      const uniqueSymbols = [...new Set(activeConfigs.map(config => config.symbol))];
      
      // 生成交易对按钮
      const symbolButtons = uniqueSymbols.map(symbol => {
        const displayText = symbol.replace('USDT', ''); // BTCUSDT -> BTC
        
        // 对于持仓量分析，回调数据中使用期货格式
        let callbackSymbol = symbol;
        if (analysisType === 'open_interest') {
          const base = symbol.replace('USDT', '');
          callbackSymbol = `${base}/USDT:USDT`;
        }
        
        return {
          text: displayText,
          callback_data: `analyze:${callbackSymbol}:${analysisType}`
        };
      });

      // 将按钮按3个一排排列
      const rows = [];
      for (let i = 0; i < symbolButtons.length; i += 3) {
        rows.push(symbolButtons.slice(i, i + 3));
      }

      // 添加返回按钮
      rows.push([
        { text: '🔙 返回分析选择', callback_data: 'analysis_menu' },
        { text: '🏠 返回主菜单', callback_data: 'main_menu' }
      ]);

      const menuOptions = {
        reply_markup: {
          inline_keyboard: rows
        }
      };

      await this.sendMessage(chatId, `请选择要进行${analysisDescription}的交易对 (${uniqueSymbols.length}个可选)：`, menuOptions);
    } catch (error) {
      this.logger.error('显示交易对选择菜单时出错:', error);
      await this.sendErrorMessage(chatId, '获取交易对列表时发生错误');
    }
  }

  // ==================== 新命令处理方法 ====================

  /**
   * 处理查看关注列表命令
   */
  private async handleListCommand(chatId: number): Promise<void> {
    try {
      const activeConfigs = await this.coinConfigService.findActiveConfigs();
      
      if (activeConfigs.length === 0) {
        await this.sendMessage(chatId, `
📋 <b>关注列表</b>

目前没有配置任何关注的交易对。

💡 <b>使用说明：</b>
• 使用 <code>/add BTCUSDT</code> 添加交易对
• 使用 <code>/remove BTCUSDT</code> 移除交易对
        `.trim(), { parse_mode: 'HTML' });
        return;
      }

      // 获取唯一的交易对符号
      const uniqueSymbols = [...new Set(activeConfigs.map(config => config.symbol))];

      let message = '📋 <b>当前关注的交易对列表</b>\n\n';
      
      // 按每行4个显示，更整洁
      const symbolsPerRow = 4;
      for (let i = 0; i < uniqueSymbols.length; i += symbolsPerRow) {
        const row = uniqueSymbols.slice(i, i + symbolsPerRow);
        message += `💰 ${row.join(' • ')}\n`;
      }

      message += `\n📊 总计: ${uniqueSymbols.length} 个交易对\n\n`;
      message += `💡 <b>使用说明：</b>\n`;
      message += `• 使用 <code>/add SYMBOL</code> 添加交易对\n`;
      message += `• 使用 <code>/remove SYMBOL</code> 移除交易对\n`;
      message += `• 分析时会自动查询所有时间周期的数据`;

      await this.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error('处理关注列表命令时出错:', error);
      await this.sendErrorMessage(chatId, '获取关注列表时发生错误');
    }
  }

  /**
   * 处理添加token命令
   */
  private async handleAddCommand(chatId: number, symbol: string): Promise<void> {
    if (!symbol) {
      await this.sendMessage(chatId, `
❌ <b>参数错误</b>

请提供要添加的交易对符号。

💡 <b>使用示例：</b>
<code>/add BTCUSDT</code>
<code>/add ETHUSDT</code>
      `.trim(), { parse_mode: 'HTML' });
      return;
    }

    try {
      // 检查是否已存在
      const existing = await this.coinConfigService.exists(symbol, DEFAULT_COIN_CONFIG_INTERVAL);
      if (existing) {
        await this.sendMessage(chatId, `
⚠️ <b>交易对已存在</b>

交易对 <code>${symbol}</code> 已在关注列表中。

💡 使用 <code>/list</code> 查看完整列表
        `.trim(), { parse_mode: 'HTML' });
        return;
      }

      // 添加到数据库
      await this.coinConfigService.create({
        symbol,
        interval: DEFAULT_COIN_CONFIG_INTERVAL as any, // 使用默认interval，分析会查询所有周期
        isActive: true,
      });

      await this.sendMessage(chatId, `
✅ <b>添加成功</b>

交易对 <code>${symbol}</code> 已添加到关注列表。

📊 使用 <code>/list</code> 查看完整列表
💰 直接输入 <code>${symbol}</code> 进行分析
      `.trim(), { parse_mode: 'HTML' });

    } catch (error) {
      this.logger.error(`添加交易对 ${symbol} 时出错:`, error);
      await this.sendErrorMessage(chatId, `添加交易对 ${symbol} 时发生错误`);
    }
  }

  /**
   * 处理移除token命令
   */
  private async handleRemoveCommand(chatId: number, symbol: string): Promise<void> {
    if (!symbol) {
      await this.sendMessage(chatId, `
❌ <b>参数错误</b>

请提供要移除的交易对符号。

💡 <b>使用示例：</b>
<code>/remove BTCUSDT</code>
<code>/remove ETHUSDT</code>
      `.trim(), { parse_mode: 'HTML' });
      return;
    }

    try {
      // 查找配置
      const config = await this.coinConfigService.findBySymbolAndInterval(symbol, DEFAULT_COIN_CONFIG_INTERVAL);
      if (!config) {
        await this.sendMessage(chatId, `
❌ <b>交易对不存在</b>

交易对 <code>${symbol}</code> 不在关注列表中。

💡 使用 <code>/list</code> 查看当前关注列表
        `.trim(), { parse_mode: 'HTML' });
        return;
      }

      // 从数据库删除
      await this.coinConfigService.remove(config.id);

      await this.sendMessage(chatId, `
✅ <b>移除成功</b>

交易对 <code>${symbol}</code> 已从关注列表中移除。

📊 使用 <code>/list</code> 查看当前列表
      `.trim(), { parse_mode: 'HTML' });

    } catch (error) {
      this.logger.error(`移除交易对 ${symbol} 时出错:`, error);
      await this.sendErrorMessage(chatId, `移除交易对 ${symbol} 时发生错误`);
    }
  }



  /**
   * 发送错误消息
   */
  private async sendErrorMessage(chatId: number, error: string, symbol?: string): Promise<void> {
    const errorMessage = MenuTemplate.getErrorTemplate(error, symbol);
    await this.sendMessage(chatId, errorMessage);
  }

  /**
   * 初始化菜单
   */
  private async initializeMenus(): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const chatId = parseInt(this.config.chatId);
      const mainMenu = MenuTemplate.getMainMenu();
      const menuOptions = MenuTemplate.getAnalysisTypeMenu();
      
      await this.sendMessage(chatId, mainMenu, menuOptions);
      this.logger.log('菜单初始化完成');

    } catch (error) {
      this.logger.error('初始化菜单失败:', error);
    }
  }

  /**
   * 启动状态清理
   */
  private startStateCleanup(): void {
    setInterval(() => {
      // 清理过期的用户状态
      this.cleanupExpiredUserStates();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理过期的用户状态
   */
  private cleanupExpiredUserStates(): void {
    const now = Date.now();
    for (const [userId, state] of this.userStates.entries()) {
      if (now - state.timestamp > this.STATE_TIMEOUT) {
        this.userStates.delete(userId);
        this.logger.debug(`清理过期用户状态: ${userId}`);
      }
    }
  }

  /**
   * 检查是否为交易对输入
   */
  private isSymbolInput(text: string): boolean {
    return /^[A-Za-z]{2,10}(USDT?)?$/i.test(text.trim());
  }

  /**
   * 检查是否启用
   */
  private isEnabled(): boolean {
    return this.telegramBotService.isEnabled();
  }

  // ==================== 公共API方法 ====================

  /**
   * 重新初始化菜单
   */
  async reinitializeMenus(): Promise<{ success: boolean }> {
    try {
      await this.initializeMenus();
      return { success: true };
    } catch (error) {
      this.logger.error('重新初始化菜单失败:', error);
      return { success: false };
    }
  }

  /**
   * 获取机器人状态
   */
  async getBotStatus(): Promise<any> {
    const botStatus = this.telegramBotService.getBotStatus();
    
    return {
      isRunning: botStatus.isConnected,
      config: this.config,
      botStatus,
      userStatesCount: this.userStates.size,
      commandsInitialized: this.commandsInitialized,
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    const chatId = parseInt(this.config.chatId);
    const result = await this.telegramBotService.sendMessage('🔧 连接测试', chatId);
    return result.success;
  }

  // ==================== 兼容性方法 (为Controller提供) ====================

  /**
   * 执行快速分析 (兼容性方法)
   */
  async performQuickAnalysis(symbol: string, analysisType: string = 'comprehensive', chatId?: number): Promise<void> {
    const targetChatId = chatId || parseInt(this.config.chatId);
    await this.performAnalysis(symbol, analysisType as AnalysisType, targetChatId);
  }

  /**
   * 执行技术分析 (兼容性方法)
   */
  async performTechnicalAnalysis(symbol: string, analysisType: string = 'comprehensive', chatId?: number): Promise<void> {
    const targetChatId = chatId || parseInt(this.config.chatId);
    await this.performAnalysis(symbol, analysisType as AnalysisType, targetChatId);
  }

  /**
   * 执行趋势分析 (兼容性方法)
   */
  async performTrendAnalysis(symbol: string, chatId?: number): Promise<void> {
    const targetChatId = chatId || parseInt(this.config.chatId);
    await this.performAnalysis(symbol, AnalysisType.TREND, targetChatId);
  }

  /**
   * 执行支撑阻力位分析 (兼容性方法)
   */
  async performSupportResistanceAnalysis(symbol: string, chatId?: number): Promise<void> {
    const targetChatId = chatId || parseInt(this.config.chatId);
    await this.performAnalysis(symbol, AnalysisType.SUPPORT_RESISTANCE, targetChatId);
  }
} 