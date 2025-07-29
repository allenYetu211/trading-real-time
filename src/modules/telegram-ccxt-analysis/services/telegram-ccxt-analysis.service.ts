import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';

// CCXT 分析服务
import { EMAAnalysisService } from '../../ccxt-analysis/services/ema-analysis.service';
import { CCXTDataService } from '../../ccxt-analysis/services/ccxt-data.service';

// 技术分析服务
import { MultiTimeframeTrendService } from '../../technical-analysis/services/multi-timeframe-trend.service';
import { SupportResistanceService } from '../../technical-analysis/services/support-resistance.service';

// 接口和类型
interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  parseMode: 'HTML' | 'Markdown';
  disableWebPagePreview: boolean;
  disableNotification: boolean;
}

interface UserState {
  action: string;
  data?: any;
  timestamp: number;
}

/**
 * Telegram CCXT 分析服务
 * 提供 Telegram 机器人界面的 CCXT 市场分析功能
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

  // 预设交易对列表
  private readonly POPULAR_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'SUIUSDT', 'DOGEUSDT'
  ];

  // 时间周期选项
  private readonly TIMEFRAMES = [
    { key: '1m', label: '1分钟' },
    { key: '5m', label: '5分钟' },
    { key: '15m', label: '15分钟' },
    { key: '1h', label: '1小时' },
    { key: '4h', label: '4小时' },
    { key: '1d', label: '1天' },
    { key: '1w', label: '1周' }
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly emaAnalysisService: EMAAnalysisService,
    private readonly ccxtDataService: CCXTDataService,
    private readonly multiTimeframeTrendService: MultiTimeframeTrendService,
    private readonly supportResistanceService: SupportResistanceService,
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
    
    if (!this.config?.enabled) {
      this.logger.log('Telegram 功能已禁用');
      return;
    }

    if (!this.config?.botToken) {
      this.logger.warn('Telegram Bot Token 未配置，跳过初始化');
      return;
    }

    if (!this.config.chatId) {
      this.logger.warn('Telegram Chat ID 未配置，跳过初始化');
      return;
    }

    try {
      this.bot = new TelegramBot(this.config.botToken, { polling: true });
      this.setupCommandHandlers();
      await this.initializeMenus();
      this.logger.log('Telegram CCXT 分析 Bot 初始化成功');
    } catch (error) {
      this.logger.error('Telegram CCXT 分析 Bot 初始化失败:', error);
      this.bot = null;
    }
  }

  /**
   * 设置命令处理器
   */
  private setupCommandHandlers(): void {
    if (!this.bot || this.commandsInitialized) {
      return;
    }

    this.logger.log('正在设置 Telegram CCXT 分析命令处理器...');

    // 处理所有消息
    this.bot.on('message', async (msg) => {
      try {
        const chatId = msg.chat.id;
        const text = msg.text;
        const userId = chatId.toString();

        // 只处理来自配置的 chat ID 的消息
        if (userId !== this.config.chatId) {
          this.logger.warn(`收到来自未授权聊天的消息: ${chatId}`);
          return;
        }

        if (!text) return;

        // 检查用户是否处于等待输入状态
        const userState = this.getUserState(userId);
        
        if (userState && !text.startsWith('/')) {
          await this.handleUserInput(chatId, text, userState);
          return;
        }

        // 处理命令
        if (text.startsWith('/')) {
          await this.handleCommand(chatId, text, msg);
        }
      } catch (error) {
        this.logger.error('处理 Telegram 消息时出错:', error);
      }
    });

    // 处理内联键盘回调
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        const chatId = callbackQuery.message?.chat.id;
        const data = callbackQuery.data;

        if (chatId?.toString() !== this.config.chatId) {
          this.logger.warn(`收到来自未授权聊天的回调: ${chatId}`);
          return;
        }

        if (!data) return;

        await this.handleInlineCallback(chatId, data, callbackQuery);
      } catch (error) {
        this.logger.error('处理内联键盘回调时出错:', error);
      }
    });

    this.commandsInitialized = true;
    this.logger.log('Telegram CCXT 分析命令处理器设置完成');
  }

  /**
   * 处理命令
   */
  private async handleCommand(chatId: number, text: string, msg: any): Promise<void> {
    const [command, ...args] = text.split(' ');

    switch (command.toLowerCase()) {
      case '/start':
        await this.handleStartCommand(chatId);
        break;

      case '/help':
        await this.handleHelpCommand(chatId);
        break;

      case '/analyze':
        await this.handleAnalyzeCommand(chatId, args);
        break;

      case '/quick':
        await this.handleQuickAnalysisCommand(chatId, args);
        break;

      case '/trend':
        await this.handleTrendAnalysisCommand(chatId, args);
        break;

      case '/sr':
      case '/support':
        await this.handleSupportResistanceCommand(chatId, args);
        break;

      case '/technical':
        await this.handleTechnicalAnalysisCommand(chatId, args);
        break;

      case '/symbols':
        await this.handleSymbolsCommand(chatId);
        break;

      case '/menu':
        await this.handleMenuCommand(chatId);
        break;

      default:
        await this.sendMessage(chatId, '❓ 未知命令。使用 /help 查看可用命令。');
        break;
    }
  }

  /**
   * 处理开始命令
   */
  private async handleStartCommand(chatId: number): Promise<void> {
    const welcomeMessage = `
🚀 <b>欢迎使用 CCXT 市场分析机器人！</b>

📊 <b>主要功能：</b>
• EMA 技术分析
• 多时间周期分析
• 实时市场数据
• 交易信号提醒

📋 <b>快速开始：</b>
/analyze BTCUSDT - 分析比特币
/quick ETHUSDT 1h - 快速分析以太坊1小时图
/symbols - 查看热门交易对
/menu - 显示操作菜单

💡 <b>使用技巧：</b>
可以直接输入交易对符号（如 BTCUSDT）进行快速分析，或使用菜单进行更多操作。

需要帮助？输入 /help 查看详细说明。
`.trim();

    await this.sendMessage(chatId, welcomeMessage);
  }

  /**
   * 处理帮助命令
   */
  private async handleHelpCommand(chatId: number): Promise<void> {
    const helpMessage = `
📖 <b>CCXT 分析机器人帮助</b>

🔧 <b>基础命令：</b>
/start - 显示欢迎信息
/help - 显示此帮助信息
/menu - 显示操作菜单

📊 <b>分析命令：</b>
/analyze <symbol> [timeframe] - 完整 EMA 分析
   例: /analyze BTCUSDT 1d

/quick <symbol> [timeframe] - 快速分析
   例: /quick ETHUSDT 4h

/trend <symbol> - 多时间周期趋势分析
   例: /trend BTCUSDT

/sr <symbol> - 支撑阻力位分析
   例: /sr ETHUSDT

/technical <symbol> [type] - 完整技术分析
   例: /technical SOLUSDT comprehensive

📋 <b>其他命令：</b>
/symbols - 显示热门交易对列表

⏰ <b>支持的时间周期：</b>
1m, 5m, 15m, 1h, 4h, 1d, 1w

💡 <b>使用示例：</b>
• 直接输入 "BTCUSDT" 进行快速分析
• 输入 "ETHUSDT 4h" 分析4小时图
• 使用 /menu 打开交互菜单

🎯 <b>分析内容：</b>
• EMA(20/60/120) 技术指标
• 多时间周期趋势分析
• 支撑阻力位识别
• 价格动量分析
• 综合交易建议

需要分析特定交易对？直接发送交易对符号即可！
`.trim();

    await this.sendMessage(chatId, helpMessage);
  }

  /**
   * 处理分析命令
   */
  private async handleAnalyzeCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendSymbolSelectionMenu(chatId, 'analyze');
      return;
    }

    const symbol = args[0].toUpperCase();
    const timeframe = args[1] || '1d';

    await this.performDetailedAnalysis(chatId, symbol, timeframe);
  }

  /**
   * 处理快速分析命令
   */
  private async handleQuickAnalysisCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendSymbolSelectionMenu(chatId, 'quick');
      return;
    }

    const symbol = args[0].toUpperCase();
    const timeframe = args[1] || '1d';

    await this.performQuickAnalysis(symbol, timeframe, chatId);
  }

  /**
   * 处理交易对列表命令
   */
  private async handleSymbolsCommand(chatId: number): Promise<void> {
    await this.sendSymbolsListMenu(chatId);
  }

  /**
   * 处理菜单命令
   */
  private async handleMenuCommand(chatId: number): Promise<void> {
    await this.sendMainMenu(chatId);
  }

  /**
   * 处理趋势分析命令
   */
  private async handleTrendAnalysisCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendSymbolSelectionMenu(chatId, 'trend');
      return;
    }

    const symbol = args[0].toUpperCase();
    await this.performTrendAnalysis(symbol, chatId);
  }

  /**
   * 处理支撑阻力位分析命令
   */
  private async handleSupportResistanceCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendSymbolSelectionMenu(chatId, 'support_resistance');
      return;
    }

    const symbol = args[0].toUpperCase();
    await this.performSupportResistanceAnalysis(symbol, chatId);
  }

  /**
   * 处理技术分析命令
   */
  private async handleTechnicalAnalysisCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendSymbolSelectionMenu(chatId, 'comprehensive');
      return;
    }

    const symbol = args[0].toUpperCase();
    const analysisType = args[1] || 'comprehensive';
    await this.performTechnicalAnalysis(symbol, analysisType, chatId);
  }

  /**
   * 处理内联键盘回调
   */
  private async handleInlineCallback(chatId: number, data: string, callbackQuery: any): Promise<void> {
    try {
      // 确认回调查询
      await this.bot!.answerCallbackQuery(callbackQuery.id);

      const [action, ...params] = data.split(':');

      console.log('action', action);

      switch (action) {
        case 'analyze_symbol':
          const symbol = params[0];
          const timeframe = params[1] || '1d';
          await this.performDetailedAnalysis(chatId, symbol, timeframe);
          break;

        case 'quick_symbol':
          await this.performQuickAnalysis(params[0], params[1] || '1d', chatId);
          break;

        case 'trend_symbol':
          await this.performTrendAnalysis(params[0], chatId);
          break;

        case 'support_resistance_symbol':
          await this.performSupportResistanceAnalysis(params[0], chatId);
          break;

        case 'comprehensive_symbol':
          await this.performTechnicalAnalysis(params[0], 'comprehensive', chatId);
          break;

        case 'timeframe_select':
          await this.handleTimeframeSelection(chatId, params[0], params[1]);
          break;

        case 'main_menu':
          await this.sendMainMenu(chatId);
          break;

        case 'symbols_list':
          // 处理带参数的 symbols_list 回调
          if (params.length > 0) {
            const analysisType = params[0];
            await this.sendSymbolSelectionMenu(chatId, analysisType);
          } else {
            // 不带参数时显示默认的交易对列表菜单
            await this.sendSymbolsListMenu(chatId);
          }
          break;

        case 'help':
          await this.handleHelpCommand(chatId);
          break;

        default:
          await this.sendMessage(chatId, '❓ 未知操作');
          break;
      }
    } catch (error) {
      this.logger.error('处理内联回调时出错:', error);
      await this.sendMessage(chatId, '❌ 处理操作时出错，请重试');
    }
  }

  /**
   * 处理用户输入
   */
  private async handleUserInput(chatId: number, input: string, userState: UserState): Promise<void> {
    try {
      switch (userState.action) {
        case 'waiting_symbol':
          await this.handleSymbolInput(chatId, input, userState.data);
          break;

        case 'waiting_custom_symbol':
          await this.handleCustomSymbolInput(chatId, input);
          break;

        default:
          await this.sendMessage(chatId, '❓ 未知状态，请重新开始');
          break;
      }

      // 清除用户状态
      this.clearUserState(chatId.toString());
    } catch (error) {
      this.logger.error('处理用户输入时出错:', error);
      await this.sendMessage(chatId, '❌ 处理输入时出错，请重试');
    }
  }

  /**
   * 处理符号输入
   */
  private async handleSymbolInput(chatId: number, symbol: string, data: any): Promise<void> {
    const cleanSymbol = symbol.toUpperCase().trim();
    const timeframe = data?.timeframe || '1d';
    const analysisType = data?.analysisType || 'quick';

    if (analysisType === 'detailed') {
      await this.performDetailedAnalysis(chatId, cleanSymbol, timeframe);
    } else {
      await this.performQuickAnalysis(cleanSymbol, timeframe, chatId);
    }
  }

  /**
   * 处理自定义符号输入
   */
  private async handleCustomSymbolInput(chatId: number, symbol: string): Promise<void> {
    const cleanSymbol = symbol.toUpperCase().trim();
    await this.performQuickAnalysis(cleanSymbol, '1d', chatId);
  }

  /**
   * 处理时间周期选择
   */
  private async handleTimeframeSelection(chatId: number, symbol: string, analysisType: string): Promise<void> {
    const keyboard = {
      inline_keyboard: this.TIMEFRAMES.map(tf => [{
        text: tf.label,
        callback_data: `${analysisType}_symbol:${symbol}:${tf.key}`
      }])
    };

    await this.sendMessage(chatId, `📊 选择 ${symbol} 的分析时间周期：`, keyboard);
  }

  /**
   * 发送主菜单
   */
  private async sendMainMenu(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 快速分析', callback_data: 'symbols_list:quick' },
          { text: '📈 详细分析', callback_data: 'symbols_list:analyze' }
        ],
        [
          { text: '📊 趋势分析', callback_data: 'symbols_list:trend' },
          { text: '🎯 支撑阻力', callback_data: 'symbols_list:support_resistance' }
        ],
        [
          { text: '🔍 完整技术分析', callback_data: 'symbols_list:comprehensive' },
          { text: '💎 热门交易对', callback_data: 'symbols_list' }
        ],
        [
          { text: '❓ 帮助', callback_data: 'help' }
        ]
      ]
    };

    const message = `
🎯 <b>CCXT 分析控制面板</b>

请选择您需要的功能：

📊 <b>快速分析</b> - 获取 EMA 指标概览
📈 <b>详细分析</b> - 完整的 EMA 技术分析
📊 <b>趋势分析</b> - 多时间周期趋势分析
🎯 <b>支撑阻力</b> - 支撑阻力位识别
🔍 <b>完整技术分析</b> - 综合技术分析报告
💎 <b>热门交易对</b> - 查看主流加密货币
❓ <b>帮助</b> - 查看使用说明

💡 <b>快捷方式：</b> 直接输入交易对符号（如 BTCUSDT）即可快速分析
`.trim();

    await this.sendMessage(chatId, message, keyboard);
  }

  /**
   * 发送交易对选择菜单
   */
  private async sendSymbolSelectionMenu(chatId: number, analysisType: string = 'quick'): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        ...this.POPULAR_SYMBOLS.map(symbol => [{
          text: `💰 ${symbol}`,
          callback_data: `${analysisType}_symbol:${symbol}:1d`
        }]),
        [
          { text: '🔍 输入自定义交易对', callback_data: 'custom_symbol' },
          { text: '🔙 返回主菜单', callback_data: 'main_menu' }
        ]
      ]
    };

    // 根据分析类型设置对应的文本描述
    let actionText: string;
    let description: string;
    
    switch (analysisType) {
      case 'analyze':
        actionText = '详细分析';
        description = '完整的 EMA 技术分析';
        break;
      case 'trend':
        actionText = '趋势分析';
        description = '多时间周期趋势分析';
        break;
      case 'support_resistance':
        actionText = '支撑阻力分析';
        description = '支撑阻力位识别';
        break;
      case 'comprehensive':
        actionText = '完整技术分析';
        description = '综合技术分析报告';
        break;
      case 'quick':
      default:
        actionText = '快速分析';
        description = 'EMA 指标概览';
        break;
    }

    const message = `
💎 <b>选择要${actionText}的交易对</b>

📊 <b>分析类型：</b>${description}

点击下方按钮选择热门交易对，或选择"输入自定义交易对"来分析其他币种：
`.trim();

    await this.sendMessage(chatId, message, keyboard);

    // 如果用户选择自定义输入，设置状态
    if (analysisType === 'custom') {
      this.setUserState(chatId.toString(), 'waiting_custom_symbol');
    }
  }

  /**
   * 发送交易对列表菜单
   */
  private async sendSymbolsListMenu(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 快速分析模式', callback_data: 'symbols_list:quick' },
          { text: '📈 详细分析模式', callback_data: 'symbols_list:analyze' }
        ],
        ...this.POPULAR_SYMBOLS.map(symbol => [{
          text: `💰 ${symbol}`,
          callback_data: `quick_symbol:${symbol}:1d`
        }]),
        [
          { text: '🔙 返回主菜单', callback_data: 'main_menu' }
        ]
      ]
    };

    const message = `
💎 <b>热门交易对列表</b>

以下是主流加密货币交易对，点击即可进行快速分析：

💡 <b>提示：</b>
• 默认使用日线图分析
• 选择分析模式可进行更详细的设置
• 也可以直接输入任何交易对符号

🔍 <b>直接输入示例：</b>
BTCUSDT、ETHUSDT、DOGEUSDT 等
`.trim();

    await this.sendMessage(chatId, message, keyboard);
  }

  /**
   * 执行快速分析
   */
  async performQuickAnalysis(symbol: string, timeframe: string = '1d', chatId?: number): Promise<void> {
    const targetChatId = chatId || parseInt(this.config.chatId);

    try {
      await this.sendMessage(targetChatId, `⏳ 正在分析 ${symbol} (${timeframe})...`);

      // 获取 EMA 分析结果
      const analysis = await this.emaAnalysisService.analyzeEMA(symbol, timeframe, [20, 60, 120]);

      const message = this.formatQuickAnalysisMessage(symbol, timeframe, analysis);
      await this.sendMessage(targetChatId, message);

    } catch (error) {
      this.logger.error(`快速分析失败 ${symbol}:`, error);
      await this.sendMessage(targetChatId, `❌ 分析 ${symbol} 失败: ${error.message}`);
    }
  }

  /**
   * 执行详细分析
   */
  private async performDetailedAnalysis(chatId: number, symbol: string, timeframe: string = '1d'): Promise<void> {
    try {
      await this.sendMessage(chatId, `⏳ 正在进行 ${symbol} (${timeframe}) 详细分析...`);

      // 获取详细的 EMA 分析数据
      const detailedData = await this.emaAnalysisService.getDetailedEMAData(symbol, timeframe, [20, 60, 120]);
      const analysis = await this.emaAnalysisService.analyzeEMA(symbol, timeframe, [20, 60, 120]);

      const message = this.formatDetailedAnalysisMessage(symbol, timeframe, analysis, detailedData);
      await this.sendMessage(chatId, message);

    } catch (error) {
      this.logger.error(`详细分析失败 ${symbol}:`, error);
      await this.sendMessage(chatId, `❌ 详细分析 ${symbol} 失败: ${error.message}`);
    }
  }

  /**
   * 格式化快速分析消息
   */
  private formatQuickAnalysisMessage(symbol: string, timeframe: string, analysis: any): string {
    const trendEmoji = this.getTrendEmoji(analysis.trend);
    const confidenceLevel = this.getConfidenceLevel(analysis.trendConfidence);

    return `
📊 <b>${symbol} 快速分析 (${timeframe})</b>

💰 <b>当前价格:</b> $${this.formatPrice(analysis.currentPrice)}

📈 <b>EMA 指标:</b>
• EMA20: $${this.formatPrice(analysis.ema20)}
• EMA60: $${this.formatPrice(analysis.ema60)}  
• EMA120: $${this.formatPrice(analysis.ema120)}

${trendEmoji} <b>趋势分析:</b> ${analysis.trend}
🎯 <b>置信度:</b> ${analysis.trendConfidence}% (${confidenceLevel})

⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

💡 <b>快速建议:</b> ${this.getQuickAdvice(analysis)}
`.trim();
  }

  /**
   * 格式化详细分析消息
   */
  private formatDetailedAnalysisMessage(symbol: string, timeframe: string, analysis: any, detailedData: any): string {
    const trendEmoji = this.getTrendEmoji(analysis.trend);
    const confidenceLevel = this.getConfidenceLevel(analysis.trendConfidence);

    return `
📈 <b>${symbol} 详细分析报告 (${timeframe})</b>

💰 <b>价格信息:</b>
• 当前价格: $${this.formatPrice(analysis.currentPrice)}
• 最高价: $${this.formatPrice(detailedData.priceRange.max)}
• 最低价: $${this.formatPrice(detailedData.priceRange.min)}

📊 <b>EMA 技术指标:</b>
• EMA20: $${this.formatPrice(analysis.ema20)}
• EMA60: $${this.formatPrice(analysis.ema60)}
• EMA120: $${this.formatPrice(analysis.ema120)}

${trendEmoji} <b>趋势分析:</b>
• 趋势方向: ${analysis.trend}
• 趋势强度: ${analysis.trendConfidence}% (${confidenceLevel})

📋 <b>数据统计:</b>
• 数据点数: ${detailedData.totalCount}
• 数据源: ${detailedData.exchange}
• 时间范围: ${detailedData.firstDataPoint.datetime} - ${detailedData.lastDataPoint.datetime}

💡 <b>交易建议:</b>
${this.getDetailedAdvice(analysis, detailedData)}

⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();
  }

  /**
   * 发送消息
   */
  private async sendMessage(chatId: number, text: string, replyMarkup?: any): Promise<void> {
    if (!this.bot) {
      this.logger.warn('Telegram Bot 未初始化');
      return;
    }

    try {
      await this.bot.sendMessage(chatId, text, {
        parse_mode: this.config.parseMode,
        disable_web_page_preview: this.config.disableWebPagePreview,
        disable_notification: this.config.disableNotification,
        reply_markup: replyMarkup,
      });
    } catch (error) {
      this.logger.error('发送 Telegram 消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户状态
   */
  private getUserState(userId: string): UserState | undefined {
    return this.userStates.get(userId);
  }

  /**
   * 设置用户状态
   */
  private setUserState(userId: string, action: string, data?: any): void {
    this.userStates.set(userId, {
      action,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除用户状态
   */
  private clearUserState(userId: string): void {
    this.userStates.delete(userId);
  }

  /**
   * 启动状态清理定时器
   */
  private startStateCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [userId, state] of this.userStates.entries()) {
        if (now - state.timestamp > this.STATE_TIMEOUT) {
          this.userStates.delete(userId);
        }
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 初始化菜单
   */
  private async initializeMenus(): Promise<void> {
    if (!this.bot) return;

    try {
      // 设置 Bot 命令
      const commands = [
        { command: 'start', description: '开始使用 CCXT 分析机器人' },
        { command: 'help', description: '显示帮助信息' },
        { command: 'menu', description: '显示主菜单' },
        { command: 'analyze', description: '详细 EMA 分析' },
        { command: 'quick', description: '快速 EMA 分析' },
        { command: 'trend', description: '多时间周期趋势分析' },
        { command: 'sr', description: '支撑阻力位分析' },
        { command: 'technical', description: '完整技术分析' },
        { command: 'symbols', description: '显示热门交易对' },
      ];

      await this.bot.setMyCommands(commands);
      
      // 设置菜单按钮
      await this.bot.setChatMenuButton({
        menu_button: { type: 'commands' }
      });

      this.logger.log('✅ CCXT 分析 Bot 菜单初始化完成');
    } catch (error) {
      this.logger.error('❌ 菜单初始化失败:', error);
    }
  }

  /**
   * 获取趋势表情
   */
  private getTrendEmoji(trend: string): string {
    switch (trend?.toLowerCase()) {
      case 'uptrend':
      case '上升趋势':
        return '📈';
      case 'downtrend':
      case '下降趋势':
        return '📉';
      default:
        return '➡️';
    }
  }

  /**
   * 获取置信度级别
   */
  private getConfidenceLevel(confidence: number): string {
    if (confidence >= 80) return '高';
    if (confidence >= 60) return '中';
    return '低';
  }

  /**
   * 格式化价格
   */
  private formatPrice(price: number): string {
    if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else {
      return price.toFixed(6);
    }
  }

  /**
   * 获取快速建议
   */
  private getQuickAdvice(analysis: any): string {
    const trend = analysis.trend?.toLowerCase() || '';
    const confidence = analysis.trendConfidence || 0;

    if (trend.includes('up') && confidence >= 70) {
      return '🚀 趋势向上，可关注买入机会';
    } else if (trend.includes('down') && confidence >= 70) {
      return '📉 趋势向下，建议谨慎或考虑减仓';
    } else {
      return '⚖️ 趋势不明确，建议观望等待更明确信号';
    }
  }

  /**
   * 获取详细建议
   */
  private getDetailedAdvice(analysis: any, detailedData: any): string {
    const trend = analysis.trend?.toLowerCase() || '';
    const confidence = analysis.trendConfidence || 0;
    const currentPrice = analysis.currentPrice;
    const ema20 = analysis.ema20;
    const ema60 = analysis.ema60;

    let advice = '';

    if (trend.includes('up') && confidence >= 70) {
      advice = '🚀 <b>上升趋势确认</b>\n';
      if (currentPrice > ema20 && ema20 > ema60) {
        advice += '• 价格位于EMA均线之上，趋势健康\n';
        advice += '• 建议回调至EMA20附近时关注买入机会\n';
      }
      advice += '• 止损可设置在EMA60下方\n';
    } else if (trend.includes('down') && confidence >= 70) {
      advice = '📉 <b>下降趋势确认</b>\n';
      if (currentPrice < ema20 && ema20 < ema60) {
        advice += '• 价格位于EMA均线之下，下降趋势明确\n';
        advice += '• 建议反弹至EMA20附近时考虑减仓\n';
      }
      advice += '• 支撑位可关注EMA120附近\n';
    } else {
      advice = '⚖️ <b>横盘整理或趋势不明</b>\n';
      advice += '• 建议等待趋势明确后再进场\n';
      advice += '• 可关注EMA均线的突破方向\n';
    }

    return advice;
  }

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
   * 获取 Bot 状态
   */
  async getBotStatus(): Promise<any> {
    try {
      if (!this.bot) {
        return {
          status: 'inactive',
          message: 'Bot 未初始化',
          botInfo: null,
        };
      }

      const botInfo = await this.bot.getMe();
      
      return {
        status: 'active',
        message: 'Bot 运行正常',
        botInfo,
        config: {
          enabled: this.config.enabled,
          chatId: this.config.chatId,
          parseMode: this.config.parseMode,
        },
      };
    } catch (error) {
      this.logger.error('获取 Bot 状态失败:', error);
      return {
        status: 'error',
        message: `Bot 状态异常: ${error.message}`,
        botInfo: null,
      };
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.bot) {
        return false;
      }

      await this.bot.getMe();
      await this.sendMessage(parseInt(this.config.chatId), '🧪 CCXT 分析机器人连接测试成功！');
      
      return true;
    } catch (error) {
      this.logger.error('连接测试失败:', error);
      return false;
    }
  }

  /**
   * 检查是否启用
   */
  private isEnabled(): boolean {
    return this.config?.enabled && !!this.bot;
  }

  /**
   * 执行趋势分析
   */
  async performTrendAnalysis(symbol: string, chatId?: number): Promise<void> {
    const targetChatId = chatId || parseInt(this.config.chatId);

    try {
      await this.sendMessage(targetChatId, `⏳ 正在进行 ${symbol} 多时间周期趋势分析...`);

      // 获取趋势分析结果
      const trendAnalysis = await this.multiTimeframeTrendService.analyzeMultiTimeframeTrend(symbol);

      const message = this.formatTrendAnalysisMessage(symbol, trendAnalysis);
      await this.sendMessage(targetChatId, message);

    } catch (error) {
      this.logger.error(`趋势分析失败 ${symbol}:`, error);
      await this.sendMessage(targetChatId, `❌ ${symbol} 趋势分析失败: ${error.message}`);
    }
  }

  /**
   * 执行支撑阻力位分析
   */
  async performSupportResistanceAnalysis(symbol: string, chatId?: number): Promise<void> {
    const targetChatId = chatId || parseInt(this.config.chatId);

    try {
      await this.sendMessage(targetChatId, `⏳ 正在进行 ${symbol} 支撑阻力位分析...`);

      // 获取支撑阻力位分析结果
      const srAnalysis = await this.supportResistanceService.analyzeSupportResistance(symbol);

      const message = this.formatSupportResistanceMessage(symbol, srAnalysis);
      await this.sendMessage(targetChatId, message);

    } catch (error) {
      this.logger.error(`支撑阻力位分析失败 ${symbol}:`, error);
      await this.sendMessage(targetChatId, `❌ ${symbol} 支撑阻力位分析失败: ${error.message}`);
    }
  }

  /**
   * 执行完整技术分析
   */
  async performTechnicalAnalysis(symbol: string, analysisType: string = 'comprehensive', chatId?: number): Promise<void> {
    const targetChatId = chatId || parseInt(this.config.chatId);

    try {
      await this.sendMessage(targetChatId, `⏳ 正在进行 ${symbol} 完整技术分析...`);

      // 根据分析类型执行不同的分析
      if (analysisType === 'trend') {
        await this.performTrendAnalysis(symbol, targetChatId);
        return;
      }

      if (analysisType === 'support_resistance') {
        await this.performSupportResistanceAnalysis(symbol, targetChatId);
        return;
      }

      // 完整分析：并行执行趋势分析和支撑阻力位分析
      const [trendAnalysis, srAnalysis] = await Promise.all([
        this.multiTimeframeTrendService.analyzeMultiTimeframeTrend(symbol),
        this.supportResistanceService.analyzeSupportResistance(symbol),
      ]);

      const message = this.formatComprehensiveAnalysisMessage(symbol, trendAnalysis, srAnalysis);
      await this.sendMessage(targetChatId, message);

    } catch (error) {
      this.logger.error(`技术分析失败 ${symbol}:`, error);
      await this.sendMessage(targetChatId, `❌ ${symbol} 技术分析失败: ${error.message}`);
    }
  }

  /**
   * 格式化趋势分析消息
   */
  private formatTrendAnalysisMessage(symbol: string, analysis: any): string {
    const { overallTrend, overallConfidence, timeframes, trendAlignment, tradingSuggestion } = analysis;

    const trendEmoji = this.getTrendEmoji(overallTrend);
    const confidenceLevel = this.getConfidenceLevel(overallConfidence);

    let message = `
📊 <b>${symbol} 多时间周期趋势分析</b>

${trendEmoji} <b>整体趋势:</b> ${this.getTrendDescription(overallTrend)}
🎯 <b>整体置信度:</b> ${overallConfidence}% (${confidenceLevel})

📈 <b>各时间周期分析:</b>
`;

    // 添加各时间周期的详细信息
    Object.entries(timeframes).forEach(([tf, data]: [string, any]) => {
      const tfEmoji = this.getTimeframeEmoji(tf);
      const tfTrendEmoji = this.getTrendEmoji(data.trend);
      message += `${tfEmoji} <b>${tf}:</b> ${tfTrendEmoji} ${this.getTrendDescription(data.trend)} (${data.confidence}%)\n`;
    });

    message += `
🔗 <b>趋势一致性:</b> ${trendAlignment.isAligned ? '✅ 一致' : '❌ 冲突'} (${trendAlignment.alignmentScore}%)
`;

    if (trendAlignment.conflictingTimeframes.length > 0) {
      message += `⚠️ <b>冲突周期:</b> ${trendAlignment.conflictingTimeframes.join(', ')}\n`;
    }

    message += `
💡 <b>交易建议:</b>
${this.getActionEmoji(tradingSuggestion.action)} <b>${this.getActionDescription(tradingSuggestion.action)}</b>
📝 ${tradingSuggestion.reason}
⚠️ 风险级别: ${tradingSuggestion.riskLevel}

⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();

    return message;
  }

  /**
   * 格式化支撑阻力位分析消息
   */
  private formatSupportResistanceMessage(symbol: string, analysis: any): string {
    const { currentPrice, keyLevels, allLevels, currentPosition, tradingZones } = analysis;

    let message = `
🎯 <b>${symbol} 支撑阻力位分析</b>

💰 <b>当前价格:</b> $${this.formatPrice(currentPrice)}

🔑 <b>关键位置:</b>
`;

    if (keyLevels.nearestSupport) {
      const support = keyLevels.nearestSupport;
      message += `📉 <b>最近支撑:</b> $${this.formatPrice(support.priceRange.center)} (${support.strength}, ${support.confidence}%)\n`;
    }

    if (keyLevels.nearestResistance) {
      const resistance = keyLevels.nearestResistance;
      message += `📈 <b>最近阻力:</b> $${this.formatPrice(resistance.priceRange.center)} (${resistance.strength}, ${resistance.confidence}%)\n`;
    }

    message += `
📊 <b>位置统计:</b>
• 识别支撑位: ${allLevels.supports.length}个
• 识别阻力位: ${allLevels.resistances.length}个

📍 <b>当前位置:</b>
`;

    if (currentPosition.inSupportZone) {
      message += '• ✅ 位于支撑区域\n';
    }
    if (currentPosition.inResistanceZone) {
      message += '• ⚠️ 位于阻力区域\n';
    }
    if (currentPosition.betweenLevels) {
      message += '• 📊 位于支撑阻力位之间\n';
    }

    message += `• 价格行为: ${this.getPriceActionDescription(currentPosition.priceAction)}\n`;

    // 添加交易区间建议
    if (tradingZones.buyZones.length > 0) {
      message += `\n💚 <b>买入区间:</b>\n`;
      tradingZones.buyZones.slice(0, 3).forEach((zone: any) => {
        message += `• $${this.formatPrice(zone.priceRange.min)} - $${this.formatPrice(zone.priceRange.max)} (${zone.strength})\n`;
      });
    }

    if (tradingZones.sellZones.length > 0) {
      message += `\n🔴 <b>卖出区间:</b>\n`;
      tradingZones.sellZones.slice(0, 3).forEach((zone: any) => {
        message += `• $${this.formatPrice(zone.priceRange.min)} - $${this.formatPrice(zone.priceRange.max)} (${zone.strength})\n`;
      });
    }

    message += `\n⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

    return message.trim();
  }

  /**
   * 格式化完整技术分析消息
   */
  private formatComprehensiveAnalysisMessage(symbol: string, trendAnalysis: any, srAnalysis: any): string {
    const { overallTrend, overallConfidence, tradingSuggestion } = trendAnalysis;
    const { currentPrice, keyLevels, currentPosition } = srAnalysis;

    const trendEmoji = this.getTrendEmoji(overallTrend);
    const confidenceLevel = this.getConfidenceLevel(overallConfidence);

    let message = `
🔍 <b>${symbol} 完整技术分析报告</b>

💰 <b>当前价格:</b> $${this.formatPrice(currentPrice)}

📊 <b>趋势分析:</b>
${trendEmoji} 整体趋势: ${this.getTrendDescription(overallTrend)}
🎯 置信度: ${overallConfidence}% (${confidenceLevel})

🎯 <b>关键位置:</b>
`;

    if (keyLevels.nearestSupport) {
      const support = keyLevels.nearestSupport;
      const distance = ((currentPrice - support.priceRange.center) / currentPrice * 100).toFixed(2);
      message += `📉 支撑位: $${this.formatPrice(support.priceRange.center)} (-${distance}%)\n`;
    }

    if (keyLevels.nearestResistance) {
      const resistance = keyLevels.nearestResistance;
      const distance = ((resistance.priceRange.center - currentPrice) / currentPrice * 100).toFixed(2);
      message += `📈 阻力位: $${this.formatPrice(resistance.priceRange.center)} (+${distance}%)\n`;
    }

    message += `
📍 <b>位置状态:</b> ${this.getPositionStatus(currentPosition)}

💡 <b>综合建议:</b>
${this.getActionEmoji(tradingSuggestion.action)} <b>${this.getActionDescription(tradingSuggestion.action)}</b>
📝 ${tradingSuggestion.reason}
⚠️ 风险级别: ${tradingSuggestion.riskLevel}

⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();

    return message;
  }

  // 辅助方法
  private getTrendDescription(trend: string): string {
    const descriptions = {
      'STRONG_UPTREND': '强势上涨',
      'UPTREND': '上涨趋势',
      'WEAK_UPTREND': '弱势上涨',
      'RANGING': '震荡整理',
      'WEAK_DOWNTREND': '弱势下跌',
      'DOWNTREND': '下跌趋势',
      'STRONG_DOWNTREND': '强势下跌',
    };
    return descriptions[trend] || trend;
  }

  private getTimeframeEmoji(timeframe: string): string {
    const emojis = {
      '15m': '⚡',
      '1h': '🕐',
      '4h': '⏰',
      '1d': '📅',
    };
    return emojis[timeframe] || '📊';
  }

  private getActionEmoji(action: string): string {
    const emojis = {
      'STRONG_BUY': '🚀',
      'BUY': '💚',
      'HOLD': '🤚',
      'SELL': '🔴',
      'STRONG_SELL': '💥',
      'WAIT': '⏳',
    };
    return emojis[action] || '❓';
  }

  private getActionDescription(action: string): string {
    const descriptions = {
      'STRONG_BUY': '强烈买入',
      'BUY': '买入',
      'HOLD': '持有',
      'SELL': '卖出',
      'STRONG_SELL': '强烈卖出',
      'WAIT': '观望',
    };
    return descriptions[action] || action;
  }

  private getPriceActionDescription(priceAction: string): string {
    const descriptions = {
      'APPROACHING_SUPPORT': '正接近支撑位',
      'APPROACHING_RESISTANCE': '正接近阻力位',
      'BREAKING_OUT': '正在突破',
      'CONSOLIDATING': '盘整中',
    };
    return descriptions[priceAction] || priceAction;
  }

  private getPositionStatus(currentPosition: any): string {
    if (currentPosition.inSupportZone) return '位于支撑区域 📉';
    if (currentPosition.inResistanceZone) return '位于阻力区域 📈';
    if (currentPosition.betweenLevels) return '位于关键位之间 📊';
    return '位置待定 ❓';
  }
} 