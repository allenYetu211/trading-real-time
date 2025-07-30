import { SymbolOption } from '../interfaces';

/**
 * 菜单模板类
 * 管理所有Telegram Bot的菜单模板
 */
export class MenuTemplate {
  // 预设交易对列表
  static readonly POPULAR_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'TRXUSDT', 'SUIUSDT', 'HYPEUSDT'
  ];

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

<b>📊 可用功能:</b>
🔍 <b>完整技术分析</b> - EMA + 趋势 + 支撑阻力位全套分析
📈 <b>趋势分析</b> - 15分钟到1日多时间周期趋势分析  
🎯 <b>支撑阻力位分析</b> - 基于成交量和EMA的支撑阻力位识别
📊 <b>EMA分析</b> - 20、60、120周期EMA技术分析

<b>💡 使用方法:</b>
• 点击下方按钮选择分析类型和交易对
• 或发送 /technical SYMBOL 进行快速分析
• 支持的交易对: BTCUSDT, ETHUSDT, SOLUSDT 等

<b>📝 命令列表:</b>
/help - 显示帮助信息
/technical - 完整技术分析
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

<b>⌨️ 命令说明:</b>
/start - 启动机器人并显示主菜单
/help - 显示此帮助信息
/technical <symbol> [type] - 完整技术分析
/status - 查看机器人运行状态

<b>📊 分析类型:</b>
• comprehensive - 完整技术分析（默认）
• trend - 多时间周期趋势分析
• support_resistance - 支撑阻力位分析
• ema - EMA技术分析

<b>💡 使用示例:</b>
/technical BTCUSDT - 比特币完整技术分析
/technical ETHUSDT trend - 以太坊趋势分析
/technical SOLUSDT support_resistance - SOL支撑阻力位分析

<b>🔄 交互操作:</b>
• 使用下方按钮快速选择交易对
• 支持自定义交易对输入
• 所有分析结果实时生成
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
            { text: '🔍 完整技术分析', callback_data: 'symbols_list:comprehensive' },
          ],
          [
            { text: '📈 趋势分析', callback_data: 'symbols_list:trend' },
            { text: '🎯 支撑阻力位', callback_data: 'symbols_list:support_resistance' },
            { text: '📊 EMA分析', callback_data: 'symbols_list:ema' },
          ],
          [
            { text: '🏠 返回主菜单', callback_data: 'main_menu' },
          ]
        ]
      }
    };
  }

  /**
   * 获取交易对选择菜单
   */
  static getSymbolSelectionMenu(analysisType: string): any {
    const symbolButtons = this.POPULAR_SYMBOLS.map(symbol => ({
      text: symbol.replace('USDT', ''),
      callback_data: `analyze:${symbol}:${analysisType}`
    }));

    // 将按钮按3个一排排列
    const rows = [];
    for (let i = 0; i < symbolButtons.length; i += 3) {
      rows.push(symbolButtons.slice(i, i + 3));
    }

    // 添加返回按钮
    rows.push([
      { text: '🔙 返回分析选择', callback_data: 'analysis_menu' },
      { text: '🏠 主菜单', callback_data: 'main_menu' }
    ]);

    return {
      reply_markup: {
        inline_keyboard: rows
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
} 