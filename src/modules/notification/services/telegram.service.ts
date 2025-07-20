import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { NotificationData, AnalysisNotification } from '../notification.service';
import { CoinConfigService } from '../../coin-config/coin-config.service';
import { AnalysisService } from '../../analysis/analysis.service';
import { IntervalType } from 'src/shared/enums';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  parseMode: 'HTML' | 'Markdown';
  disableWebPagePreview: boolean;
  disableNotification: boolean;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private config: TelegramConfig;
  private commandsInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CoinConfigService))
    private readonly coinConfigService: CoinConfigService,
    @Inject(forwardRef(() => AnalysisService))
    private readonly analysisService: AnalysisService,
  ) {
    this.config = this.configService.get<TelegramConfig>('telegram')!;
    this.initializeBot();
  }

  /**
   * 初始化 Telegram Bot
   */
  private initializeBot(): void {
    if (!this.config.enabled) {
      this.logger.log('Telegram 通知已禁用');
      return;
    }

    if (!this.config.botToken) {
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
      this.initializeMenus();
      this.logger.log('Telegram Bot 初始化成功');
    } catch (error) {
      this.logger.error('Telegram Bot 初始化失败:', error);
      this.bot = null;
    }
  }

  /**
   * 发送通知到 Telegram
   */
  async sendNotification(data: NotificationData): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const message = this.formatMessage(data);
      
      await this.bot!.sendMessage(this.config.chatId, message, {
        parse_mode: this.config.parseMode,
        disable_web_page_preview: this.config.disableWebPagePreview,
        disable_notification: this.config.disableNotification,
      });

      this.logger.log('Telegram 通知发送成功');
      return true;
    } catch (error) {
      this.logger.error('Telegram 通知发送失败:', error);
      return false;
    }
  }

  /**
   * 发送分析通知到 Telegram
   */
  async sendAnalysisNotification(data: AnalysisNotification): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const message = this.formatAnalysisMessage(data);
      
      await this.bot!.sendMessage(this.config.chatId, message, {
        parse_mode: this.config.parseMode,
        disable_web_page_preview: this.config.disableWebPagePreview,
        disable_notification: this.config.disableNotification,
      });

      this.logger.log('Telegram 分析通知发送成功');
      return true;
    } catch (error) {
      this.logger.error('Telegram 分析通知发送失败:', error);
      return false;
    }
  }

  /**
   * 发送多时间周期分析通知到 Telegram
   */
  async sendMultiTimeframeAnalysisNotification(
    symbol: string,
    analysisData: Array<{
      interval: string;
      signal: string;
      confidence: number;
      trend: number;
      momentum: number;
      patterns: any[];
      keyLevels: any[];
    }>,
    summary: {
      avgConfidence: number;
      strongSignalsCount: number;
      consistentSignals: string[];
      timestamp: string;
    }
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const message = this.formatMultiTimeframeAnalysisMessage(symbol, analysisData, summary);
      
      await this.bot!.sendMessage(this.config.chatId, message, {
        parse_mode: this.config.parseMode,
        disable_web_page_preview: this.config.disableWebPagePreview,
        disable_notification: this.config.disableNotification,
      });

      this.logger.log('Telegram 多时间周期分析通知发送成功');
      return true;
    } catch (error) {
      this.logger.error('Telegram 多时间周期分析通知发送失败:', error);
      return false;
    }
  }

  /**
   * 检查 Telegram 服务是否可用
   */
  isEnabled(): boolean {
    return (
      this.config.enabled &&
      this.bot !== null &&
      !!this.config.botToken &&
      !!this.config.chatId
    );
  }

  /**
   * 格式化普通通知消息
   */
  private formatMessage(data: NotificationData): string {
    const typeEmoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const timestamp = new Date(data.timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai'
    });

    return `
${typeEmoji[data.type]} <b>${this.escapeHtml(data.title)}</b>

📝 ${this.escapeHtml(data.message)}

🕐 时间: <code>${timestamp}</code>
`.trim();
  }

  /**
   * 格式化分析通知消息
   */
  private formatAnalysisMessage(data: AnalysisNotification): string {
    const signalEmoji = {
      'BUY': '🚀',
      'SELL': '📉',
      'NEUTRAL': '⚖️'
    };

    const typeEmoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const confidenceLevel = data.confidence >= 80 ? '高' :
                           data.confidence >= 60 ? '中' : '低';

    const timestamp = new Date(data.timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai'
    });

    let message = `
${typeEmoji[data.type]} <b>交易信号提醒</b>

${signalEmoji[data.signal]} <b>${this.escapeHtml(data.symbol)}(${this.escapeHtml(data.interval)})</b>
📊 信号: <b>${this.escapeHtml(data.signal)}</b>
🎯 置信度: <b>${data.confidence}%</b> (${confidenceLevel})

📝 总结: ${this.escapeHtml(data.summary)}
`.trim();

    if (data.patterns) {
      message += `\n🔍 形态: <code>${this.escapeHtml(data.patterns)}</code>`;
    }

    if (data.supportResistance) {
      message += `\n📈 关键位: <code>${this.escapeHtml(data.supportResistance)}</code>`;
    }

    message += `\n\n🕐 时间: <code>${timestamp}</code>`;

    return message;
  }

  /**
   * 格式化多时间周期分析通知消息
   */
  private formatMultiTimeframeAnalysisMessage(
    symbol: string,
    analysisData: Array<{
      interval: string;
      signal: string;
      confidence: number;
      trend: number;
      momentum: number;
      patterns: any[];
      keyLevels: any[];
    }>,
    summary: {
      avgConfidence: number;
      strongSignalsCount: number;
      consistentSignals: string[];
      timestamp: string;
    }
  ): string {
    const signalEmoji = {
      'BUY': '🚀',
      'SELL': '📉',
      'NEUTRAL': '⚖️'
    };

    const typeEmoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const timestamp = new Date(summary.timestamp).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai'
    });

    // 计算综合信号
    const dominantSignal = this.calculateDominantSignal(analysisData);
    const avgTrend = analysisData.reduce((sum, item) => sum + item.trend, 0) / analysisData.length;
    const avgMomentum = analysisData.reduce((sum, item) => sum + item.momentum, 0) / analysisData.length;

    let message = `
${typeEmoji[summary.avgConfidence >= 80 ? 'success' : summary.avgConfidence >= 60 ? 'warning' : 'info']} <b>多时间周期综合分析</b>

${signalEmoji[dominantSignal]} <b>${this.escapeHtml(symbol)}</b>
💰 当前价格: <b>$${this.formatPrice(this.getLatestPrice(analysisData))}</b>
📊 综合信号: <b>${dominantSignal}</b>
🎯 平均置信度: <b>${summary.avgConfidence}%</b>
📈 趋势强度: <b>${this.formatPercentage(avgTrend)}</b>
⚡ 动量指标: <b>${this.formatPercentage(avgMomentum)}</b>
🔥 强信号数量: <b>${summary.strongSignalsCount}/4</b>
`.trim();

    // 添加一致性信号
    if (summary.consistentSignals.length > 0) {
      message += `\n🎯 一致信号: <b>${this.escapeHtml(summary.consistentSignals.join(', '))}</b>`;
    }

    // 添加关键价位分析
    const keyLevels = this.analyzeKeyLevels(analysisData);
    if (keyLevels) {
      message += `\n\n📍 <b>关键价位分析</b>`;
      message += `\n🔴 压力位: <b>$${keyLevels.resistance}</b>`;
      message += `\n🟢 支撑位: <b>$${keyLevels.support}</b>`;
      if (keyLevels.breakoutLevel) {
        message += `\n⚡ 突破位: <b>$${keyLevels.breakoutLevel}</b>`;
      }
    }

    // 添加市场结构分析
    const marketStructure = this.analyzeMarketStructure(analysisData);
    if (marketStructure) {
      message += `\n\n🏗 <b>市场结构</b>`;
      message += `\n📦 箱体状态: <b>${marketStructure.boxStructure}</b>`;
      if (marketStructure.boxTop && marketStructure.boxBottom) {
        message += `\n📏 箱体范围: $${marketStructure.boxBottom} - $${marketStructure.boxTop}`;
      }
      message += `\n📊 结构类型: <b>${marketStructure.structureType}</b>`;
      
      if (marketStructure.breakoutAnalysis) {
        message += `\n\n💥 <b>突破分析</b>`;
        message += `\n${marketStructure.breakoutAnalysis.direction === 'UP' ? '🚀' : '📉'} 方向: <b>${marketStructure.breakoutAnalysis.direction === 'UP' ? '向上突破' : '向下跌破'}</b>`;
        message += `\n📊 成交量: <b>${marketStructure.breakoutAnalysis.volumeStatus}</b>`;
        message += `\n🎯 强度: <b>${marketStructure.breakoutAnalysis.strength}</b>`;
      }
    }

    // 详细周期分析
    message += `\n\n🔄 <b>各周期详细分析</b>`;
    analysisData.forEach((item, index) => {
      const structureInfo = this.getTimeframeStructure(item);
      message += `\n\n${signalEmoji[item.signal]} <b>${this.escapeHtml(item.interval)}周期</b>`;
      message += `\n📊 信号: <b>${this.escapeHtml(item.signal)}</b> (${item.confidence}%)`;
      message += `\n📈 趋势: ${this.getTrendEmoji(item.trend)} <b>${this.formatPercentage(item.trend)}</b>`;
      message += `\n⚡ 动量: ${this.getMomentumEmoji(item.momentum)} <b>${this.formatPercentage(item.momentum)}</b>`;
      
      if (structureInfo.patterns.length > 0) {
        message += `\n🔍 形态: <code>${this.escapeHtml(structureInfo.patterns.join(', '))}</code>`;
      }
      
      if (structureInfo.structure) {
        message += `\n🏗 结构: <code>${this.escapeHtml(structureInfo.structure)}</code>`;
      }
    });

    // 交易建议
    const tradingAdvice = this.generateTradingAdvice(dominantSignal, summary.avgConfidence, keyLevels, marketStructure);
    if (tradingAdvice) {
      message += `\n\n💡 <b>交易建议</b>`;
      message += `\n${tradingAdvice}`;
    }

    message += `\n\n🕐 分析时间: <code>${timestamp}</code>`;

    return message;
  }

  /**
   * 计算主导信号
   */
  private calculateDominantSignal(analysisData: any[]): string {
    const signalCounts = { BUY: 0, SELL: 0, NEUTRAL: 0 };
    analysisData.forEach(item => {
      if (item.confidence >= 60) {
        signalCounts[item.signal] = (signalCounts[item.signal] || 0) + 1;
      }
    });

    return Object.entries(signalCounts).reduce((a, b) => signalCounts[a[0]] > signalCounts[b[0]] ? a : b)[0];
  }

  /**
   * 获取最新价格
   */
  private getLatestPrice(analysisData: any[]): number {
    // 从5分钟周期获取最新价格，如果没有则使用其他周期
    const fiveMinData = analysisData.find(item => item.interval === '5m');
    if (fiveMinData && fiveMinData.keyLevels && fiveMinData.keyLevels.length > 0) {
      return fiveMinData.keyLevels[0].price || 0;
    }
    return 0;
  }

  /**
   * 分析关键价位
   */
  private analyzeKeyLevels(analysisData: any[]): any {
    const allLevels = analysisData.flatMap(item => item.keyLevels || []);
    if (allLevels.length === 0) return null;

    // 简化处理，实际应该根据具体的keyLevels结构来分析
    const prices = allLevels.map(level => level.price || 0).filter(p => p > 0);
    if (prices.length === 0) return null;

    const sortedPrices = prices.sort((a, b) => b - a);
    const currentPrice = this.getLatestPrice(analysisData);
    
    return {
      resistance: this.formatPrice(sortedPrices[0]),
      support: this.formatPrice(sortedPrices[sortedPrices.length - 1]),
      breakoutLevel: currentPrice > 0 ? this.formatPrice(currentPrice * 1.02) : null
    };
  }

  /**
   * 分析市场结构
   */
  private analyzeMarketStructure(analysisData: any[]): any {
    // 基于patterns分析市场结构
    const allPatterns = analysisData.flatMap(item => item.patterns || []);
    const patternTypes = allPatterns.map(p => p.type || p.name || '').filter(t => t);

    let boxStructure = '未形成';
    let structureType = '震荡';
    let boxTop = null;
    let boxBottom = null;
    let breakoutAnalysis = null;

    // 检查箱体结构
    if (patternTypes.includes('BOX') || patternTypes.includes('RECTANGLE')) {
      boxStructure = '已形成';
      structureType = '箱体整理';
      // 这里可以根据实际的pattern数据获取箱体上下边界
    } else if (patternTypes.includes('BREAKOUT_UP')) {
      boxStructure = '向上突破';
      structureType = '上升趋势';
      breakoutAnalysis = {
        direction: 'UP',
        volumeStatus: '充足',
        strength: '强劲'
      };
    } else if (patternTypes.includes('BREAKOUT_DOWN')) {
      boxStructure = '向下跌破';
      structureType = '下降趋势';
      breakoutAnalysis = {
        direction: 'DOWN',
        volumeStatus: '充足',
        strength: '强劲'
      };
    }

    // 检查趋势结构
    const avgTrend = analysisData.reduce((sum, item) => sum + item.trend, 0) / analysisData.length;
    if (avgTrend > 0.7) {
      structureType = '强上升趋势';
    } else if (avgTrend < -0.7) {
      structureType = '强下降趋势';
    } else if (Math.abs(avgTrend) < 0.3) {
      structureType = '横盘整理';
    }

    return {
      boxStructure,
      structureType,
      boxTop,
      boxBottom,
      breakoutAnalysis
    };
  }

  /**
   * 获取时间周期结构信息
   */
  private getTimeframeStructure(item: any): any {
    const patterns = (item.patterns || []).map(p => p.description || p.type || p.name || '').filter(p => p);
    
    let structure = '';
    if (item.trend > 0.5) {
      structure = '上升结构';
    } else if (item.trend < -0.5) {
      structure = '下降结构';
    } else {
      structure = '震荡结构';
    }

    return {
      patterns,
      structure
    };
  }

  /**
   * 生成交易建议
   */
  private generateTradingAdvice(signal: string, confidence: number, keyLevels: any, marketStructure: any): string {
    let advice = '';
    
    if (signal === 'BUY' && confidence >= 70) {
      advice = '🚀 <b>建议关注买入机会</b>\n';
      if (keyLevels && keyLevels.support) {
        advice += `💚 入场位: 接近支撑位 $${keyLevels.support}\n`;
      }
      if (keyLevels && keyLevels.resistance) {
        advice += `🎯 目标位: $${keyLevels.resistance}\n`;
      }
      if (marketStructure && marketStructure.breakoutAnalysis && marketStructure.breakoutAnalysis.direction === 'UP') {
        advice += '⚡ 突破确认后可加仓';
      }
    } else if (signal === 'SELL' && confidence >= 70) {
      advice = '📉 <b>建议关注卖出时机</b>\n';
      if (keyLevels && keyLevels.resistance) {
        advice += `🔴 减仓位: 接近压力位 $${keyLevels.resistance}\n`;
      }
      if (keyLevels && keyLevels.support) {
        advice += `🎯 目标位: $${keyLevels.support}\n`;
      }
    } else {
      advice = '⚖️ <b>建议观望等待明确信号</b>\n';
      if (keyLevels) {
        advice += `📊 关注区间: $${keyLevels.support} - $${keyLevels.resistance}`;
      }
    }

    return advice;
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
   * 格式化百分比
   */
  private formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  /**
   * 获取趋势表情
   */
  private getTrendEmoji(trend: number): string {
    if (trend > 0.5) return '📈';
    if (trend < -0.5) return '📉';
    return '➡️';
  }

  /**
   * 获取动量表情
   */
  private getMomentumEmoji(momentum: number): string {
    if (momentum > 0.5) return '🚀';
    if (momentum < -0.5) return '🔻';
    return '⚡';
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * 测试 Telegram 连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled()) {
      this.logger.warn('Telegram 服务未启用或配置不完整');
      return false;
    }

    try {
      const me = await this.bot!.getMe();
      this.logger.log(`Telegram Bot 连接测试成功: @${me.username}`);
      
      // 发送测试消息
      await this.sendNotification({
        title: '🧪 连接测试',
        message: 'Telegram Bot 连接正常',
        type: 'info',
        timestamp: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      this.logger.error('Telegram 连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取 Telegram Bot 信息
   */
  async getBotInfo(): Promise<any | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      return await this.bot!.getMe();
    } catch (error) {
      this.logger.error('获取 Bot 信息失败:', error);
      return null;
    }
  }

  /**
   * 发送自定义消息
   */
  async sendCustomMessage(message: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      await this.bot!.sendMessage(this.config.chatId, message, {
        parse_mode: this.config.parseMode,
        disable_web_page_preview: this.config.disableWebPagePreview,
        disable_notification: this.config.disableNotification,
      });

      this.logger.log('自定义 Telegram 消息发送成功');
      return true;
    } catch (error) {
      this.logger.error('自定义 Telegram 消息发送失败:', error);
      return false;
    }
  }

  /**
   * 设置命令处理器
   */
  private setupCommandHandlers(): void {
    if (!this.bot || this.commandsInitialized) {
      return;
    }

    this.logger.log('正在设置 Telegram 命令处理器...');

    // 处理所有消息
    this.bot.on('message', async (msg) => {
      try {
        const chatId = msg.chat.id;
        const text = msg.text;

        // 只处理来自配置的 chat ID 的消息
        if (chatId.toString() !== this.config.chatId) {
          this.logger.warn(`收到来自未授权聊天的消息: ${chatId}`);
          return;
        }

        if (!text || !text.startsWith('/')) {
          return;
        }

        await this.handleCommand(chatId, text, msg);
      } catch (error) {
        this.logger.error('处理 Telegram 消息时出错:', error);
      }
    });

    // 处理内联键盘回调
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        const chatId = callbackQuery.message?.chat.id;
        const data = callbackQuery.data;

        // 只处理来自配置的 chat ID 的回调
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
    this.logger.log('Telegram 命令处理器设置完成');
  }

  /**
   * 处理 Telegram 命令
   */
  private async handleCommand(chatId: number, text: string, msg: any): Promise<void> {
    const [command, ...args] = text.split(' ');

    switch (command.toLowerCase()) {
      case '/help':
        await this.handleHelpCommand(chatId);
        break;

      case '/list':
        await this.handleListCommand(chatId);
        break;

      case '/add':
        await this.handleAddCommand(chatId, args);
        break;

      case '/remove':
        await this.handleRemoveCommand(chatId, args);
        break;

      case '/analyze':
        await this.handleAnalyzeCommand(chatId, args);
        break;

      case '/start':
        await this.handleStartCommand(chatId);
        break;

      case '/menu':
        await this.handleMenuCommand(chatId);
        break;

      default:
        await this.sendCommandMessage(chatId, `❌ 未知命令: ${command}\n\n发送 /help 查看可用命令`);
        break;
    }
  }

  /**
   * 处理帮助命令
   */
  private async handleHelpCommand(chatId: number): Promise<void> {
    const helpMessage = `
🤖 <b>交易系统 Telegram Bot 帮助</b>

📋 <b>可用命令:</b>

/help - 显示此帮助信息
/list - 查看当前监控的交易对
/add &lt;交易对&gt; - 添加监控交易对（全周期）
/remove &lt;交易对&gt; - 删除监控交易对（全周期）
/analyze &lt;交易对&gt; - 立即分析交易对（全周期）

📝 <b>使用示例:</b>

<code>/add BTCUSDT</code> - 添加 BTC 全周期监控
<code>/remove ETHUSDT</code> - 删除 ETH 全周期监控  
<code>/analyze SOLUSDT</code> - 立即分析 SOL 全周期

⏱️ <b>监控周期:</b>
系统将对每个交易对监控以下4个周期：
• 5分钟 (5m)
• 15分钟 (15m)  
• 1小时 (1h)
• 4小时 (4h)

💡 <b>提示:</b>
• 一个命令操作所有4个周期
• 交易对名称不区分大小写
• 系统会自动发送多周期综合分析通知
• 使用 /menu 命令获取快捷操作面板
`.trim();

    // 添加快捷操作按钮
    const buttons = [
      [
        { text: '📊 查看监控', callback_data: 'menu_list' },
        { text: '➕ 添加监控', callback_data: 'menu_add' }
      ],
      [
        { text: '🔍 快速分析', callback_data: 'menu_quick_analyze' },
        { text: '⚙️ 菜单面板', callback_data: 'menu_refresh' }
      ]
    ];

    const replyMarkup = {
      inline_keyboard: buttons
    };

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
  }

    /**
   * 处理查看监控列表命令
   */
  private async handleListCommand(chatId: number): Promise<void> {
    try {
      const activeConfigs = await this.coinConfigService.findActiveConfigs();

      if (activeConfigs.length === 0) {
        await this.sendCommandMessage(chatId, `📝 <b>当前监控列表</b>\n\n暂无监控的交易对\n\n💡 使用 <code>/add BTCUSDT</code> 添加监控`);
        return;
      }

      // 按交易对分组并统计周期数
      const groupedConfigs = activeConfigs.reduce((groups, config) => {
        if (!groups[config.symbol]) {
          groups[config.symbol] = {
            intervals: [],
            count: 0
          };
        }
        groups[config.symbol].intervals.push(config.interval as string);
        groups[config.symbol].count++;
        return groups;
      }, {} as Record<string, { intervals: string[]; count: number }>);

      const totalSymbols = Object.keys(groupedConfigs).length;
      let message = `📝 <b>当前监控列表</b> (${totalSymbols}个交易对)\n\n`;

      for (const [symbol, data] of Object.entries(groupedConfigs)) {
        const configData = data as { intervals: string[]; count: number };
        const isFullCoverage = configData.count === 4; // 4个周期全覆盖
        const statusIcon = isFullCoverage ? '✅' : '⚠️';
        
        message += `${statusIcon} <b>${symbol}</b>`;
        if (!isFullCoverage) {
          message += ` <code>(${configData.count}/4个周期)</code>`;
        }
        message += `\n`;
      }

      message += `\n💡 使用 <code>/add &lt;交易对&gt;</code> 添加全周期监控`;
      message += `\n💡 使用 <code>/remove &lt;交易对&gt;</code> 删除全部监控`;

      await this.sendCommandMessage(chatId, message);
    } catch (error) {
      this.logger.error('处理监控列表命令失败:', error);
      await this.sendCommandMessage(chatId, `❌ 获取监控列表失败: ${error.message}`);
    }
  }

  /**
   * 处理添加监控命令
   */
  private async handleAddCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendCommandMessage(chatId, `❌ 请提供交易对名称\n\n示例: <code>/add BTCUSDT</code>`);
      return;
    }

    const symbol = args[0].toUpperCase();

    // 固定的4个监控周期
    const monitoringIntervals = [
      IntervalType.FIVE_MINUTES,
      IntervalType.FIFTEEN_MINUTES,
      IntervalType.ONE_HOUR,
      IntervalType.FOUR_HOURS,
    ];

    try {
      let addedCount = 0;
      let reactivatedCount = 0;
      let existingCount = 0;

      for (const interval of monitoringIntervals) {
        // 检查是否已存在
        const existing = await this.coinConfigService.findBySymbolAndInterval(symbol, interval);
        
        if (existing) {
          if (existing.isActive) {
            existingCount++;
          } else {
            // 如果存在但未激活，则激活它
            await this.coinConfigService.update(existing.id, { isActive: true });
            reactivatedCount++;
          }
        } else {
          // 创建新的监控配置
          await this.coinConfigService.create({
            symbol,
            interval,
            isActive: true,
          });
          addedCount++;
        }
      }

      // 构建响应消息
      let responseMessage = `🎯 <b>${symbol}</b> 监控配置结果:\n\n`;
      
      if (addedCount > 0) {
        responseMessage += `✅ 新增监控: ${addedCount} 个周期\n`;
      }
      if (reactivatedCount > 0) {
        responseMessage += `🔄 重新启用: ${reactivatedCount} 个周期\n`;
      }
      if (existingCount > 0) {
        responseMessage += `ℹ️ 已存在: ${existingCount} 个周期\n`;
      }

      const totalActive = addedCount + reactivatedCount + existingCount;
      if (totalActive === 4) {
        responseMessage += `\n🎉 <b>${symbol}</b> 已完成全周期监控设置！`;
        responseMessage += `\n\n系统将对以下4个周期进行自动分析:`;
        responseMessage += `\n• 5分钟 • 15分钟 • 1小时 • 4小时`;
      } else {
        responseMessage += `\n⚠️ 当前监控 ${totalActive}/4 个周期`;
      }

      await this.sendCommandMessage(chatId, responseMessage);
    } catch (error) {
      this.logger.error('添加监控配置失败:', error);
      await this.sendCommandMessage(chatId, `❌ 添加 <b>${symbol}</b> 监控失败: ${error.message}`);
    }
  }

  /**
   * 处理删除监控命令
   */
  private async handleRemoveCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendCommandMessage(chatId, `❌ 请提供交易对名称\n\n示例: <code>/remove BTCUSDT</code>`);
      return;
    }

    const symbol = args[0].toUpperCase();

    // 固定的4个监控周期
    const monitoringIntervals = [
      IntervalType.FIVE_MINUTES,
      IntervalType.FIFTEEN_MINUTES,
      IntervalType.ONE_HOUR,
      IntervalType.FOUR_HOURS,
    ];

    try {
      let removedCount = 0;
      let notFoundCount = 0;

      for (const interval of monitoringIntervals) {
        const existing = await this.coinConfigService.findBySymbolAndInterval(symbol, interval);
        
        if (existing && existing.isActive) {
          // 禁用监控配置
          await this.coinConfigService.update(existing.id, { isActive: false });
          removedCount++;
        } else {
          notFoundCount++;
        }
      }

      // 构建响应消息
      let responseMessage = `🎯 <b>${symbol}</b> 删除监控结果:\n\n`;
      
      if (removedCount > 0) {
        responseMessage += `✅ 已删除监控: ${removedCount} 个周期\n`;
      }
      if (notFoundCount > 0) {
        responseMessage += `ℹ️ 未找到监控: ${notFoundCount} 个周期\n`;
      }

      if (removedCount === 4) {
        responseMessage += `\n🎉 <b>${symbol}</b> 已完全停止监控！`;
        responseMessage += `\n系统将不再自动分析此交易对`;
      } else if (removedCount > 0) {
        responseMessage += `\n✅ 已部分删除 <b>${symbol}</b> 的监控配置`;
      } else {
        responseMessage += `\n⚠️ <b>${symbol}</b> 没有活跃的监控配置`;
      }

      await this.sendCommandMessage(chatId, responseMessage);
    } catch (error) {
      this.logger.error('删除监控配置失败:', error);
      await this.sendCommandMessage(chatId, `❌ 删除 <b>${symbol}</b> 监控失败: ${error.message}`);
    }
  }

    /**
   * 处理分析命令
   */
  private async handleAnalyzeCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendCommandMessage(chatId, `❌ 请提供交易对名称\n\n示例: <code>/analyze BTCUSDT</code>`);
      return;
    }

    const symbol = args[0].toUpperCase();

    // 固定的4个分析周期
    const analysisIntervals = [
      IntervalType.FIVE_MINUTES,
      IntervalType.FIFTEEN_MINUTES,
      IntervalType.ONE_HOUR,
      IntervalType.FOUR_HOURS,
    ];

    try {
      await this.sendCommandMessage(chatId, `🔄 正在分析 <b>${symbol}</b> 多周期数据，请稍等...`);

      // 并行执行所有周期的分析
      const analysisPromises = analysisIntervals.map(async (interval) => {
        try {
          const analysis = await this.analysisService.performComprehensiveAnalysis(symbol, interval, 100);
          return {
            interval,
            signal: analysis.score.signal,
            confidence: analysis.score.confidence,
            trend: analysis.score.trend,
            momentum: analysis.score.momentum,
            patterns: analysis.patterns,
            keyLevels: analysis.supportResistance,
            summary: analysis.summary,
            success: true,
          };
        } catch (error) {
          this.logger.error(`${symbol} ${interval} 分析失败:`, error);
          return {
            interval,
            error: error.message,
            success: false,
          };
        }
      });

             const results = await Promise.all(analysisPromises);
       
       // 分离成功和失败的结果
       const successfulAnalyses = results.filter(r => r.success) as Array<{
         interval: IntervalType;
         signal: string;
         confidence: number;
         trend: number;
         momentum: number;
         patterns: any[];
         keyLevels: any[];
         summary: string;
         success: true;
       }>;
       const failedAnalyses = results.filter(r => !r.success);

       if (successfulAnalyses.length > 0) {
         // 计算综合信息
         const avgConfidence = successfulAnalyses.reduce((sum, r) => sum + r.confidence, 0) / successfulAnalyses.length;
         const strongSignalsCount = successfulAnalyses.filter(r => r.confidence >= 70 && r.signal !== 'NEUTRAL').length;
         
         // 找出一致的信号
         const signals = successfulAnalyses.map(r => r.signal);
         const consistentSignals = [...new Set(signals)].filter(signal => 
           signals.filter(s => s === signal).length >= 2 && signal !== 'NEUTRAL'
         );

         const summary = {
           avgConfidence: Math.round(avgConfidence),
           strongSignalsCount,
           consistentSignals,
           timestamp: new Date().toISOString(),
         };

         // 转换数据格式以匹配 sendMultiTimeframeAnalysisNotification 的期望
         const formattedAnalyses = successfulAnalyses.map(analysis => ({
           interval: analysis.interval as string,
           signal: analysis.signal,
           confidence: analysis.confidence,
           trend: analysis.trend,
           momentum: analysis.momentum,
           patterns: analysis.patterns,
           keyLevels: analysis.keyLevels,
         }));

         // 发送多周期分析通知
         await this.sendMultiTimeframeAnalysisNotification(symbol, formattedAnalyses, summary);

        // 如果有分析失败的周期，发送额外的错误通知
        if (failedAnalyses.length > 0) {
          const failedIntervals = failedAnalyses.map(f => f.interval).join(', ');
          await this.sendCommandMessage(chatId, `⚠️ 部分周期分析失败: ${failedIntervals}`);
        }
      } else {
        // 所有分析都失败了
        await this.sendCommandMessage(chatId, `❌ <b>${symbol}</b> 所有周期分析都失败了\n\n请检查交易对名称是否正确，或稍后重试`);
      }

    } catch (error) {
      this.logger.error('多周期分析失败:', error);
      await this.sendCommandMessage(chatId, `❌ <b>${symbol}</b> 多周期分析失败: ${error.message}`);
    }
  }

  /**
   * 处理开始命令
   */
  private async handleStartCommand(chatId: number): Promise<void> {
    const welcomeMessage = `
🚀 <b>欢迎使用交易系统 Telegram Bot!</b>

我可以帮您:
• 📊 全周期监控交易对 (5m/15m/1h/4h)
• 🔔 自动发送多周期综合分析
• ⚡ 立即分析任意交易对的4个周期

🎯 <b>简化操作:</b>
• 一个命令管理所有4个周期
• 无需指定具体时间周期
• 获得全面的技术分析视角

发送 <code>/help</code> 查看所有命令
发送 <code>/menu</code> 获取快捷操作面板

让我们开始吧! 🎯
`.trim();

    await this.sendCommandMessage(chatId, welcomeMessage);
  }

  /**
   * 初始化所有菜单
   */
  private async initializeMenus(): Promise<void> {
    if (!this.bot) return;

    try {
      // 1. 设置命令菜单
      await this.setupBotCommands();
      
      // 2. 设置菜单按钮
      await this.setupMenuButton();
      
      this.logger.log('✅ 所有菜单初始化完成');
    } catch (error) {
      this.logger.error('❌ 菜单初始化失败:', error);
    }
  }

  /**
   * 设置 Bot 命令菜单
   */
  private async setupBotCommands(): Promise<void> {
    if (!this.bot) return;

    const commands = [
      { command: 'start', description: '欢迎消息和简介' },
      { command: 'help', description: '显示帮助信息' },
      { command: 'menu', description: '显示快捷操作菜单' },
      { command: 'list', description: '查看当前监控的交易对' },
      { command: 'add', description: '添加全周期监控交易对' },
      { command: 'remove', description: '删除全周期监控交易对' },
      { command: 'analyze', description: '立即分析指定交易对(全周期)' },
    ];

    try {
      await this.bot.setMyCommands(commands);
      this.logger.log('✅ Bot 命令菜单设置成功');
    } catch (error) {
      this.logger.error('❌ 设置 Bot 命令失败:', error);
    }
  }

  /**
   * 设置菜单按钮
   */
  private async setupMenuButton(): Promise<void> {
    if (!this.bot) return;

    try {
      // 设置菜单按钮显示命令列表
      await this.bot.setChatMenuButton({
        menu_button: { type: 'commands' }
      });
      this.logger.log('✅ 菜单按钮设置成功');
    } catch (error) {
      this.logger.error('❌ 设置菜单按钮失败:', error);
    }
  }

  /**
   * 获取 Bot 命令列表
   */
  async getBotCommands(): Promise<any[] | null> {
    if (!this.bot) return null;

    try {
      const commands = await this.bot.getMyCommands();
      return commands;
    } catch (error) {
      this.logger.error('获取 Bot 命令失败:', error);
      return null;
    }
  }

  /**
   * 处理菜单命令
   */
  private async handleMenuCommand(chatId: number): Promise<void> {
    try {
      const activeConfigs = await this.coinConfigService.findActiveConfigs();
      const symbolCount = [...new Set(activeConfigs.map(c => c.symbol))].length;

      const menuMessage = `
📱 <b>交易监控快捷面板</b>

📊 当前监控: ${symbolCount} 个交易对
🔄 总配置: ${activeConfigs.length} 个周期

选择操作：
`;

      // 构建内联键盘
      const buttons = [];

      // 基础操作按钮
      buttons.push([
        { text: '📊 查看监控', callback_data: 'menu_list' },
        { text: '➕ 添加监控', callback_data: 'menu_add' }
      ]);

      // 如果有监控配置，显示快速分析选项
      if (activeConfigs.length > 0) {
        buttons.push([
          { text: '🔍 快速分析', callback_data: 'menu_quick_analyze' },
          { text: '❌ 删除监控', callback_data: 'menu_remove' }
        ]);

        // 显示前6个交易对的快速分析按钮
        const symbols = [...new Set(activeConfigs.map(c => c.symbol))].slice(0, 6);
        const symbolButtons = symbols.map(symbol => ({
          text: `📈 ${symbol}`,
          callback_data: `menu_analyze_${symbol}`
        }));

        // 每行2个按钮
        for (let i = 0; i < symbolButtons.length; i += 2) {
          buttons.push(symbolButtons.slice(i, i + 2));
        }
      }

      buttons.push([
        { text: '❓ 帮助', callback_data: 'menu_help' },
        { text: '🔄 刷新', callback_data: 'menu_refresh' }
      ]);

      const replyMarkup = {
        inline_keyboard: buttons
      };

      await this.bot.sendMessage(chatId, menuMessage, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });

    } catch (error) {
      this.logger.error('显示菜单失败:', error);
      await this.sendCommandMessage(chatId, '❌ 显示菜单失败，请稍后重试');
    }
  }

  /**
   * 处理内联键盘回调
   */
  private async handleInlineCallback(chatId: number, data: string, callbackQuery: any): Promise<void> {
    try {
      // 必须先响应回调查询
      await this.bot.answerCallbackQuery(callbackQuery.id);

      // 根据回调数据处理不同操作
      switch (data) {
        case 'menu_list':
          await this.handleListCommand(chatId);
          break;

        case 'menu_add':
          await this.sendCommandMessage(
            chatId, 
            '请输入要添加的交易对名称（如：BTCUSDT）：\n\n💡 提示：也可以直接使用命令 <code>/add BTCUSDT</code>'
          );
          break;

        case 'menu_remove':
          await this.showRemoveMenu(chatId);
          break;

        case 'menu_help':
          await this.handleHelpCommand(chatId);
          break;

        case 'menu_refresh':
        case 'menu_quick_analyze':
          await this.handleMenuCommand(chatId);
          break;

        default:
          // 处理动态回调（如分析特定交易对）
          if (data.startsWith('menu_analyze_')) {
            const symbol = data.replace('menu_analyze_', '');
            await this.handleAnalyzeCommand(chatId, [symbol]);
          } else if (data.startsWith('remove_')) {
            const symbol = data.replace('remove_', '');
            await this.handleRemoveCommand(chatId, [symbol]);
          } else {
            this.logger.warn(`未知的回调数据: ${data}`);
          }
          break;
      }
    } catch (error) {
      this.logger.error('处理内联回调失败:', error);
      try {
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: '操作失败，请重试',
          show_alert: false
        });
      } catch (answerError) {
        this.logger.error('响应回调查询失败:', answerError);
      }
    }
  }

  /**
   * 显示删除菜单
   */
  private async showRemoveMenu(chatId: number): Promise<void> {
    try {
      const activeConfigs = await this.coinConfigService.findActiveConfigs();
      
      if (activeConfigs.length === 0) {
        await this.sendCommandMessage(chatId, '暂无监控配置可删除');
        return;
      }

      // 按交易对分组
      const symbols = [...new Set(activeConfigs.map(config => config.symbol))];
      
      const buttons = symbols.map(symbol => [
        { text: `❌ ${symbol}`, callback_data: `remove_${symbol}` }
      ]);
      
      buttons.push([
        { text: '« 返回主菜单', callback_data: 'menu_refresh' }
      ]);

      const replyMarkup = {
        inline_keyboard: buttons
      };

      await this.bot.sendMessage(chatId, '选择要删除的交易对：', {
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });
    } catch (error) {
      this.logger.error('显示删除菜单失败:', error);
      await this.sendCommandMessage(chatId, '❌ 显示删除菜单失败，请稍后重试');
    }
  }

  /**
   * 发送命令响应消息
   */
  private async sendCommandMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot!.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    } catch (error) {
      this.logger.error('发送命令响应消息失败:', error);
    }
  }

  /**
   * 转换时间周期字符串为枚举
   */
  private convertToIntervalEnum(interval: string): IntervalType | null {
    const intervalMap: Record<string, IntervalType> = {
      '5m': IntervalType.FIVE_MINUTES,
      '15m': IntervalType.FIFTEEN_MINUTES,
      '1h': IntervalType.ONE_HOUR,
      '4h': IntervalType.FOUR_HOURS,
      '1d': IntervalType.ONE_DAY,
    };

    return intervalMap[interval] || null;
  }
}