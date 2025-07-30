import { EmojiUtil } from '../emoji';
import { FormatUtil } from './format.util';
import { ComprehensiveAnalysisFormatter } from './comprehensive-analysis.formatter';

/**
 * 支撑阻力位分析消息格式化器
 * 负责格式化支撑阻力位分析的消息内容
 */
export class SupportResistanceFormatter {
  /**
   * 格式化支撑阻力位分析消息
   */
  static formatMessage(symbol: string, analysis: any): string {
    const { currentPrice, keyLevels, allLevels, currentPosition } = analysis;

    let message = `
🎯 <b>${symbol} 支撑阻力位分析</b>

💰 <b>当前价格:</b> $${FormatUtil.formatPrice(currentPrice)}

🔑 <b>关键位置:</b>
`;

    if (keyLevels.nearestSupport) {
      const support = keyLevels.nearestSupport;
      message += `📉 <b>最近支撑:</b> $${FormatUtil.formatPrice(support.priceRange.center)} (${support.strength}, ${support.confidence}%)\n`;
    }

    if (keyLevels.nearestResistance) {
      const resistance = keyLevels.nearestResistance;
      message += `📈 <b>最近阻力:</b> $${FormatUtil.formatPrice(resistance.priceRange.center)} (${resistance.strength}, ${resistance.confidence}%)\n`;
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

    message += `• 价格行为: ${FormatUtil.getPriceActionDescription(currentPosition.priceAction)}\n`;

    // 生成精确交易区间建议（与完整技术分析保持一致）
    const preciseTradingZones = this.generatePreciseTradingZones(analysis, currentPrice);
    
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

    message += `\n⏰ <b>分析时间:</b> ${FormatUtil.formatTime()}`;

    return message.trim();
  }

  /**
   * 生成精确交易区间（复用完整分析的逻辑）
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