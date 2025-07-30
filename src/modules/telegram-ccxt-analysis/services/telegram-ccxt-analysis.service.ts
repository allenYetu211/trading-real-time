import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';

// 核心服务依赖
import { EMAAnalysisService } from '../../ccxt-analysis/services/ema-analysis.service';
import { CCXTDataService } from '../../ccxt-analysis/services/ccxt-data.service';
import { MultiTimeframeTrendService } from '../../technical-analysis/services/multi-timeframe-trend.service';
import { SupportResistanceService } from '../../technical-analysis/services/support-resistance.service';
import { CoreTechnicalAnalysisService } from '../../technical-analysis/services/core-technical-analysis.service';

// 工具类导入
import {
  TelegramConfig,
  UserState,
  AnalysisType,
  BotManagerUtil,
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
  private bot: TelegramBot | null = null;
  private config: TelegramConfig;
  private commandsInitialized = false;
  
  // 用户状态管理
  private userStates = new Map<string, UserState>();
  private readonly STATE_TIMEOUT = 5 * 60 * 1000; // 5分钟超时

  constructor(
    private readonly configService: ConfigService,
    private readonly emaAnalysisService: EMAAnalysisService,
    private readonly ccxtDataService: CCXTDataService,
    private readonly multiTimeframeTrendService: MultiTimeframeTrendService,
    private readonly supportResistanceService: SupportResistanceService,
    private readonly coreTechnicalAnalysisService: CoreTechnicalAnalysisService,
  ) {
    this.config = this.configService.get<TelegramConfig>('telegram')!;
  }

  async onModuleInit(): Promise<void> {
    await this.initializeBot();
    this.startStateCleanup();
  }

  /**
   * 初始化 Telegram Bot
   */
  private async initializeBot(): Promise<void> {
    this.logger.debug(`Telegram 配置: enabled=${this.config?.enabled}, botToken=${!!this.config?.botToken}, chatId=${!!this.config?.chatId}`);
    
    this.bot = BotManagerUtil.createBot(this.config);
    
    if (this.bot) {
      this.setupCommandHandlers();
      await this.initializeMenus();
      this.logger.log('Telegram CCXT 分析 Bot 初始化成功');
    }
  }

  /**
   * 设置命令处理器
   */
  private setupCommandHandlers(): void {
    if (!this.bot) return;

    // 命令处理
    this.bot.on('message', async (msg) => {
      if (!this.isEnabled()) return;

      const chatId = msg.chat.id;
      const text = msg.text || '';

      try {
        // 处理 /start 命令
        if (text === '/start') {
          await this.handleStartCommand(chatId);
          return;
        }

        // 处理 /help 命令
        if (text === '/help') {
          await this.handleHelpCommand(chatId);
          return;
        }

        // 处理 /status 命令
        if (text === '/status') {
          await this.handleStatusCommand(chatId);
          return;
        }

        // 处理 /technical 命令
        if (text.startsWith('/technical')) {
          await this.handleTechnicalCommand(text, chatId);
          return;
        }

        // 处理直接输入的交易对
        if (this.isSymbolInput(text)) {
          await this.handleSymbolInput(text, chatId);
          return;
        }

      } catch (error) {
        this.logger.error('处理消息时发生错误:', error);
        await this.sendErrorMessage(chatId, '处理消息时发生错误', text);
      }
    });

    // 回调查询处理
    this.bot.on('callback_query', async (query) => {
      if (!this.isEnabled()) return;

      const chatId = query.message?.chat.id;
      const data = query.data;

      if (!chatId || !data) return;

      try {
        await BotManagerUtil.answerCallbackQuery(this.bot, query.id);

        // 处理不同的回调数据
        if (data === 'main_menu') {
          await this.showMainMenu(chatId);
        } else if (data === 'analysis_menu') {
          await this.showAnalysisMenu(chatId);
        } else if (data.startsWith('symbols_list:')) {
          const analysisType = data.split(':')[1] as AnalysisType;
          await this.showSymbolSelection(chatId, analysisType);
        } else if (data.startsWith('analyze:')) {
          await this.handleAnalysisCallback(data, chatId);
        }

      } catch (error) {
        this.logger.error('处理回调查询时发生错误:', error);
        await this.sendErrorMessage(chatId, '处理请求时发生错误');
      }
    });

    // 设置命令列表
    if (!this.commandsInitialized) {
      this.bot.setMyCommands([
        { command: 'start', description: '启动机器人' },
        { command: 'help', description: '显示帮助信息' },
        { command: 'technical', description: '完整技术分析' },
        { command: 'status', description: '查看机器人状态' },
      ]);
      this.commandsInitialized = true;
    }
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
    const [, symbol, analysisType] = data.split(':');
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
        analysisType
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
    const analysisDescription = AnalysisProcessorUtil.getAnalysisTypeDescription(analysisType);
    const menuOptions = MenuTemplate.getSymbolSelectionMenu(analysisType);
    await this.sendMessage(chatId, `请选择要进行${analysisDescription}的交易对：`, menuOptions);
  }

  /**
   * 发送消息
   */
  private async sendMessage(chatId: number, message: string, options?: any): Promise<void> {
    await BotManagerUtil.sendMessage(this.bot, chatId, message, options);
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
      BotManagerUtil.cleanupUserStates(this.userStates, this.STATE_TIMEOUT);
    }, 60000); // 每分钟清理一次
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
    return this.config?.enabled && !!this.bot;
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
    const botInfo = await BotManagerUtil.getBotInfo(this.bot);
    
    return {
      isRunning: !!this.bot,
      config: this.config,
      botInfo,
      userStatesCount: this.userStates.size,
      commandsInitialized: this.commandsInitialized,
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    const chatId = parseInt(this.config.chatId);
    return await BotManagerUtil.testConnection(this.bot, chatId);
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