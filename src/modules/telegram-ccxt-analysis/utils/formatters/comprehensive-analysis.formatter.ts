import { EmojiUtil } from '../emoji';
import { FormatUtil } from './format.util';

/**
 * 完整技术分析消息格式化器
 * 负责格式化完整技术分析的消息内容
 */
export class ComprehensiveAnalysisFormatter {
  /**
   * 格式化完整技术分析消息
   */
  static formatMessage(
    symbol: string,
    emaAnalysis: any,
    emaDetailedData: any,
    trendAnalysis: any,
    srAnalysis: any
  ): string {
    const { overallTrend, overallConfidence, tradingSuggestion, timeframes, trendAlignment } = trendAnalysis;
    const { currentPrice, keyLevels, currentPosition, allLevels } = srAnalysis;

    const trendEmoji = EmojiUtil.getTrendEmoji(overallTrend);
    const confidenceLevel = FormatUtil.getConfidenceLevel(overallConfidence);

    // 计算基于100天数据的价格范围
    const priceRange = FormatUtil.calculateRecentPriceRange(emaDetailedData, 100);

    let message = `
🔍 <b>${symbol} 完整技术分析报告</b>

💰 <b>价格信息:</b>
• 当前价格: $${FormatUtil.formatPrice(currentPrice)}
• 100天最高: $${FormatUtil.formatPrice(priceRange.max)}
• 100天最低: $${FormatUtil.formatPrice(priceRange.min)}
• 价格区间: ${((currentPrice - priceRange.min) / (priceRange.max - priceRange.min) * 100).toFixed(1)}%位置

📊 <b>EMA 技术指标:</b>
• EMA20: $${FormatUtil.formatPrice(emaAnalysis.ema20)}
• EMA60: $${FormatUtil.formatPrice(emaAnalysis.ema60)}
• EMA120: $${FormatUtil.formatPrice(emaAnalysis.ema120)}

📈 <b>多时间周期趋势:</b>
${trendEmoji} 整体趋势: ${FormatUtil.getTrendDescription(overallTrend)}
🎯 整体置信度: ${overallConfidence}% (${confidenceLevel})
🔗 趋势一致性: ${trendAlignment.isAligned ? '✅ 一致' : '❌ 冲突'} (${trendAlignment.alignmentScore}%)

📊 <b>各时间周期:</b>
`;

    // 添加各时间周期的详细信息
    Object.entries(timeframes).forEach(([tf, data]: [string, any]) => {
      const tfEmoji = EmojiUtil.getTimeframeEmoji(tf);
      const tfTrendEmoji = EmojiUtil.getTrendEmoji(data.trend);
      message += `${tfEmoji} ${tf}: ${tfTrendEmoji} ${FormatUtil.getTrendDescription(data.trend)} (${data.confidence}%)\n`;
    });

    message += `
🎯 <b>支撑阻力位:</b>
`;

    if (keyLevels.nearestSupport) {
      const support = keyLevels.nearestSupport;
      const distance = ((currentPrice - support.priceRange.center) / currentPrice * 100).toFixed(2);
      message += `📉 最近支撑: $${FormatUtil.formatPrice(support.priceRange.center)} (-${distance}%) [${support.strength}]\n`;
    }

    if (keyLevels.nearestResistance) {
      const resistance = keyLevels.nearestResistance;
      const distance = ((resistance.priceRange.center - currentPrice) / currentPrice * 100).toFixed(2);
      message += `📈 最近阻力: $${FormatUtil.formatPrice(resistance.priceRange.center)} (+${distance}%) [${resistance.strength}]\n`;
    }

    message += `• 识别支撑位: ${allLevels.supports.length}个，阻力位: ${allLevels.resistances.length}个\n`;

    message += `
📍 <b>位置状态:</b> ${FormatUtil.getPositionStatus(currentPosition)}
`;

    // 生成精确交易区间建议
    const preciseTradingZones = this.generatePreciseTradingZones(srAnalysis, currentPrice);
    
    if (preciseTradingZones.buyZones.length > 0) {
      message += `\n💚 <b>精确买入区间:</b>\n`;
      preciseTradingZones.buyZones.forEach((zone: any) => {
        message += `• $${FormatUtil.formatPrice(zone.entry)} (±$${FormatUtil.formatPrice(zone.tolerance)}) [${zone.confidence}%]\n`;
      });
    }

    if (preciseTradingZones.sellZones.length > 0) {
      message += `\n🔴 <b>精确卖出区间:</b>\n`;
      preciseTradingZones.sellZones.forEach((zone: any) => {
        message += `• $${FormatUtil.formatPrice(zone.entry)} (±$${FormatUtil.formatPrice(zone.tolerance)}) [${zone.confidence}%]\n`;
      });
    }

    message += `
💡 <b>综合交易建议:</b>
${EmojiUtil.getActionEmoji(tradingSuggestion.action)} <b>${FormatUtil.getActionDescription(tradingSuggestion.action)}</b>
📝 理由: ${tradingSuggestion.reason}
⚠️ 风险级别: ${tradingSuggestion.riskLevel}

📋 <b>数据统计:</b>
• 数据点数: ${emaDetailedData.totalCount}
• 数据源: ${emaDetailedData.exchange}
• EMA 趋势: ${emaAnalysis.trend} (置信度: ${emaAnalysis.trendConfidence}%)

⏰ <b>分析时间:</b> ${FormatUtil.formatTime()}
`.trim();

    return message;
  }

  /**
   * 生成精确交易区间
   */
  private static generatePreciseTradingZones(srAnalysis: any, currentPrice: number): any {
    const { keyLevels, allLevels } = srAnalysis;
    
    // 计算合适的容错范围（基于当前价格的0.5%）
    const baseTolerancePercent = 0.005;
    const baseTolerance = currentPrice * baseTolerancePercent;

    const buyZones: any[] = [];
    const sellZones: any[] = [];

    // 处理支撑位 - 优先使用最近的强支撑位
    const strongSupports = allLevels.supports
      .filter((s: any) => s.confidence >= 70 && s.strength !== 'WEAK')
      .slice(0, 3);

    strongSupports.forEach((support: any) => {
      const entry = support.priceRange.center;
      const tolerance = Math.min(baseTolerance, Math.abs(support.priceRange.max - support.priceRange.min) / 4);
      
      buyZones.push({
        entry,
        tolerance,
        confidence: support.confidence,
        reason: `${support.timeframe}级别${support.strength}支撑位`,
        stopLoss: entry - tolerance * 2,
        target: currentPrice + (currentPrice - entry) * 0.618
      });
    });

    // 处理阻力位 - 优先使用最近的强阻力位
    const strongResistances = allLevels.resistances
      .filter((r: any) => r.confidence >= 70 && r.strength !== 'WEAK')
      .slice(0, 3);

    strongResistances.forEach((resistance: any) => {
      const entry = resistance.priceRange.center;
      const tolerance = Math.min(baseTolerance, Math.abs(resistance.priceRange.max - resistance.priceRange.min) / 4);
      
      sellZones.push({
        entry,
        tolerance,
        confidence: resistance.confidence,
        reason: `${resistance.timeframe}级别${resistance.strength}阻力位`,
        stopLoss: entry + tolerance * 2,
        target: currentPrice - (entry - currentPrice) * 0.618
      });
    });

    return { buyZones, sellZones };
  }
} 