import { EmojiUtil } from '../emoji';
import { FormatUtil } from './format.util';

/**
 * 趋势分析消息格式化器
 * 负责格式化趋势分析的消息内容
 */
export class TrendAnalysisFormatter {
  /**
   * 格式化趋势分析消息
   */
  static formatMessage(symbol: string, analysis: any): string {
    const { overallTrend, overallConfidence, timeframes, trendAlignment, tradingSuggestion } = analysis;

    const trendEmoji = EmojiUtil.getTrendEmoji(overallTrend);
    const confidenceLevel = FormatUtil.getConfidenceLevel(overallConfidence);

    let message = `
📊 <b>${symbol} 多时间周期趋势分析</b>

${trendEmoji} <b>整体趋势:</b> ${FormatUtil.getTrendDescription(overallTrend)}
🎯 <b>整体置信度:</b> ${overallConfidence}% (${confidenceLevel})

📈 <b>各时间周期分析:</b>
`;

    // 添加各时间周期的详细信息
    Object.entries(timeframes).forEach(([tf, data]: [string, any]) => {
      const tfEmoji = EmojiUtil.getTimeframeEmoji(tf);
      const tfTrendEmoji = EmojiUtil.getTrendEmoji(data.trend);
      message += `${tfEmoji} <b>${tf}:</b> ${tfTrendEmoji} ${FormatUtil.getTrendDescription(data.trend)} (${data.confidence}%)\n`;
    });

    message += `
🔗 <b>趋势一致性:</b> ${trendAlignment.isAligned ? '✅ 一致' : '❌ 冲突'} (${trendAlignment.alignmentScore}%)
`;

    if (trendAlignment.conflictingTimeframes.length > 0) {
      message += `⚠️ <b>冲突周期:</b> ${trendAlignment.conflictingTimeframes.join(', ')}\n`;
    }

    message += `
💡 <b>交易建议:</b>
${EmojiUtil.getActionEmoji(tradingSuggestion.action)} <b>${FormatUtil.getActionDescription(tradingSuggestion.action)}</b>
📝 ${tradingSuggestion.reason}
⚠️ 风险级别: ${tradingSuggestion.riskLevel}

⏰ <b>分析时间:</b> ${FormatUtil.formatTime()}
`.trim();

    return message;
  }
} 