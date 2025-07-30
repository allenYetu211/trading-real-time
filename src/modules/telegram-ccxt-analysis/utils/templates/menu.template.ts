import { SymbolOption } from '../interfaces';

/**
 * 菜单模板类
 * 管理所有Telegram Bot的菜单模板
 */
export class MenuTemplate {
  // 注意：预设交易对已移除，现在使用数据库动态配置

  // 时间周期选项
  static readonly TIMEFRAMES = [
    { key: '1m', label: '1分钟' },
    { key: '5m', label: '5分钟' },
    { key: '15m', label: '15分钟' },
    { key: '1h', label: '1小时' },
    { key: '4h', label: '4小时' },
    { key: '1d', label: '1天' },
    { key: '1w', label: '1周' }
  ];

  /**
   * 获取主菜单模板
   */
  static getMainMenu(): string {
    return `
🤖 <b>CCXT 市场分析机器人</b>

<b>📊 技术分析功能:</b>
🔍 <b>完整技术分析</b> - EMA + 趋势 + 支撑阻力位全套分析
📈 <b>趋势分析</b> - 15分钟到1日多时间周期趋势分析  
🎯 <b>支撑阻力位分析</b> - 基于成交量和EMA的支撑阻力位识别
📊 <b>EMA分析</b> - 20、60、120周期EMA技术分析
📉 <b>RSI分析</b> - 相对强弱指标分析和交易信号
💰 <b>持仓量分析</b> - 期货市场持仓量数据和趋势分析

<b>💡 使用方法:</b>
• 点击下方按钮选择分析类型和交易对
• 或发送 /technical SYMBOL 进行快速分析
• 支持的交易对: BTCUSDT, ETHUSDT, SOLUSDT 等

<b>📝 命令列表:</b>
/help - 显示帮助信息
/technical - 完整技术分析
/list - 查看关注列表
/add &lt;symbol&gt; - 添加交易对
/remove &lt;symbol&gt; - 移除交易对
/status - 查看机器人状态
`.trim();
  }

  /**
   * 获取帮助菜单模板
   */
  static getHelpMenu(): string {
    return `
📖 <b>CCXT 分析机器人使用指南</b>

<b>🎯 主要功能:</b>
• 实时市场数据获取
• 多时间周期技术分析
• 支撑阻力位识别
• EMA趋势分析
• 精确交易区间建议
• 动态关注列表管理

<b>⌨️ 基础命令:</b>
/start - 启动机器人并显示主菜单
/help - 显示此帮助信息
/technical &lt;symbol&gt; [type] - 完整技术分析
/status - 查看机器人运行状态

<b>📋 关注列表管理:</b>
/list 或 /watch_list - 查看当前关注的交易对列表
/add &lt;symbol&gt; - 添加交易对到关注列表
/remove &lt;symbol&gt; - 从关注列表移除交易对

<b>📊 分析类型:</b>
• comprehensive - 完整技术分析（默认）
• trend - 多时间周期趋势分析
• support_resistance - 支撑阻力位分析
• ema - EMA技术分析

<b>💡 使用示例:</b>
/technical BTCUSDT - 比特币完整技术分析
/add ETHUSDT - 添加以太坊到关注列表
/remove SOLUSDT - 从关注列表移除SOL
/list - 查看所有关注的交易对

<b>🔄 交互操作:</b>
• 使用下方按钮快速选择交易对
• 支持自定义交易对输入
• 所有分析结果实时生成
• 关注列表动态更新选择菜单
`.trim();
  }

  /**
   * 获取分析类型选择菜单
   */
  static getAnalysisTypeMenu(): any {
    return {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📈 趋势分析', callback_data: 'symbols_list:trend' },
            { text: '🎯 支撑阻力位', callback_data: 'symbols_list:support_resistance' },
          ],
          [
            { text: '📊 EMA分析', callback_data: 'symbols_list:ema' },
            { text: '📉 RSI分析', callback_data: 'symbols_list:rsi' },
          ],
          // [
          //   { text: '💰 持仓量分析', callback_data: 'symbols_list:open_interest' },
          // ],
          [
            { text: '🔍 完整技术分析', callback_data: 'symbols_list:comprehensive' },
            { text: '🏠 返回主菜单', callback_data: 'main_menu' },
          ]
        ]
      }
    };
  }

  /**
   * 获取交易对选择菜单（已废弃 - 现在使用动态数据库配置）
   * @deprecated 此方法已被主服务中的showSymbolSelection替代
   */
  static getSymbolSelectionMenu(analysisType: string): any {
    // 该方法已废弃，实际的交易对选择现在在TelegramCCXTAnalysisService.showSymbolSelection中处理
    // 这里返回一个基本的菜单作为兼容性支持
    return {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '❌ 请使用新的动态菜单', callback_data: 'analysis_menu' }
          ],
          [
            { text: '🔙 返回分析选择', callback_data: 'analysis_menu' },
            { text: '🏠 主菜单', callback_data: 'main_menu' }
          ]
        ]
      }
    };
  }

  /**
   * 获取状态显示模板
   */
  static getStatusTemplate(status: any): string {
    return `
🤖 <b>机器人状态信息</b>

📊 <b>基本信息:</b>
• 状态: ${status.isRunning ? '🟢 运行中' : '🔴 已停止'}
• 机器人ID: ${status.botInfo?.id || 'N/A'}
• 用户名: @${status.botInfo?.username || 'N/A'}
• 名称: ${status.botInfo?.first_name || 'N/A'}

⚙️ <b>配置信息:</b>
• 已启用: ${status.config?.enabled ? '✅ 是' : '❌ 否'}
• 聊天ID: ${status.config?.chatId || 'N/A'}
• 解析模式: ${status.config?.parseMode || 'N/A'}

📈 <b>功能状态:</b>
• CCXT数据源: 🟢 正常
• 技术分析: 🟢 正常
• 消息推送: 🟢 正常

⏰ <b>检查时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();
  }

  /**
   * 获取错误消息模板
   */
  static getErrorTemplate(error: string, symbol?: string): string {
    return `
❌ <b>分析失败</b>

${symbol ? `📊 <b>交易对:</b> ${symbol}` : ''}
🚫 <b>错误信息:</b> ${error}

💡 <b>建议:</b>
• 检查交易对是否正确
• 稍后重试
• 如问题持续，请联系管理员

⏰ <b>时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();
  }

  /**
   * 获取RSI分析结果模板
   */
  static getRSIAnalysisTemplate(analysis: any): string {
    const { symbol, currentRSI, signal, trend, recommendation, riskLevel } = analysis;
    
    const riskEmoji = {
      'low': '🟢',
      'medium': '🟡', 
      'high': '🔴'
    }[riskLevel] || '🟡';

    const signalEmoji = {
      'strong_buy': '🚀',
      'buy': '📈',
      'hold': '⏸️',
      'sell': '📉',
      'strong_sell': '💥'
    }[signal] || '⏸️';

    return `
📉 <b>RSI 技术指标分析</b>

📊 <b>交易对:</b> ${symbol}
📈 <b>当前RSI:</b> ${currentRSI.rsi.toFixed(2)}
🎯 <b>信号状态:</b> ${currentRSI.signal}
📋 <b>信号强度:</b> ${currentRSI.strength}

${signalEmoji} <b>交易信号:</b> ${this.getSignalText(signal)}
🔄 <b>趋势方向:</b> ${this.getTrendText(trend)}
${riskEmoji} <b>风险等级:</b> ${riskLevel.toUpperCase()}

💡 <b>分析建议:</b>
${recommendation}

📚 <b>RSI 指标说明:</b>
• RSI < 30: 超卖区域，可能反弹
• RSI > 70: 超买区域，可能回调
• RSI 30-70: 中性区域

⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();
  }

  /**
   * 获取持仓量分析结果模板
   */
  static getOpenInterestTemplate(data: any): string {
    return `
💰 <b>持仓量数据分析</b>

📊 <b>合约:</b> ${data.symbol}
💵 <b>持仓量:</b> ${data.openInterest?.toLocaleString() || 'N/A'}
📅 <b>更新时间:</b> ${data.datetime || 'N/A'}

📈 <b>市场意义:</b>
• 持仓量增加 + 价格上涨 = 看涨信号
• 持仓量增加 + 价格下跌 = 看跌信号
• 持仓量减少 = 趋势可能反转

💡 <b>交易提示:</b>
• 高持仓量表示市场关注度高
• 持仓量变化反映资金流向
• 结合价格走势判断市场情绪

⏰ <b>数据时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();
  }

  /**
   * 获取持仓量排行模板
   */
  static getOpenInterestRankingTemplate(rankings: any[]): string {
    const rankingText = rankings.map((item, index) => 
      `${index + 1}. ${item.symbol}: ${item.openInterest?.toLocaleString() || 'N/A'}`
    ).join('\n');

    return `
🏆 <b>热门合约持仓量排行</b>

📊 <b>TOP ${rankings.length} 合约:</b>
${rankingText}

💡 <b>排行说明:</b>
• 按持仓量大小排序
• 反映市场关注度和流动性
• 持仓量高的合约通常波动性较大

⏰ <b>更新时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();
  }

  /**
   * 获取多时间周期RSI模板
   */
  static getMultiTimeframeRSITemplate(results: any): string {
    const timeframeData = Object.entries(results).map(([timeframe, analysis]: [string, any]) => {
      const signalEmoji = {
        'strong_buy': '🚀',
        'buy': '📈', 
        'hold': '⏸️',
        'sell': '📉',
        'strong_sell': '💥'
      }[analysis.signal] || '⏸️';

      return `${timeframe}: ${analysis.currentRSI.rsi.toFixed(2)} ${signalEmoji}`;
    }).join('\n');

    return `
📉 <b>多时间周期 RSI 分析</b>

📊 <b>交易对:</b> ${(Object.values(results)[0] as any).symbol}

🕐 <b>各时间周期 RSI:</b>
${timeframeData}

💡 <b>综合判断:</b>
• 多个时间周期信号一致时，信号更可靠
• 短期RSI用于入场时机，长期RSI确定趋势
• 建议结合其他指标进行综合分析

⏰ <b>分析时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();
  }

  // 辅助方法
  private static getSignalText(signal: string): string {
    const signalTexts = {
      'strong_buy': '强烈买入',
      'buy': '买入',
      'hold': '持有观望', 
      'sell': '卖出',
      'strong_sell': '强烈卖出'
    };
    return signalTexts[signal] || '未知';
  }

  private static getTrendText(trend: string): string {
    const trendTexts = {
      'bullish': '看涨',
      'bearish': '看跌',
      'neutral': '中性'
    };
    return trendTexts[trend] || '未知';
  }
} 