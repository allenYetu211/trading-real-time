import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 技术分析请求DTO
 */
export class TechnicalAnalysisRequestDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;

  @ApiPropertyOptional({
    description: '交易所名称',
    example: 'binance',
    default: 'binance',
  })
  @IsOptional()
  @IsString({ message: '交易所名称必须是字符串' })
  exchange?: string;
}

/**
 * 多时间周期趋势分析请求DTO
 */
export class MultiTimeframeTrendRequestDto extends TechnicalAnalysisRequestDto {}

/**
 * 支撑阻力位分析请求DTO
 */
export class SupportResistanceRequestDto extends TechnicalAnalysisRequestDto {}

/**
 * 单时间周期趋势响应DTO
 */
export class TimeframeTrendResponseDto {
  @ApiProperty({ description: '时间周期', example: '1d' })
  timeframe: string;

  @ApiProperty({ description: '趋势类型', example: 'UPTREND' })
  trend: string;

  @ApiProperty({ description: '置信度 (0-100)', example: 85 })
  confidence: number;

  @ApiProperty({ description: '当前价格', example: 192.84 })
  currentPrice: number;

  @ApiProperty({ description: 'EMA20值', example: 178.53 })
  ema20: number;

  @ApiProperty({ description: 'EMA60值', example: 165.08 })
  ema60: number;

  @ApiProperty({ description: 'EMA120值', example: 161.55 })
  ema120: number;

  @ApiProperty({ description: '趋势强度 (0-100)', example: 75 })
  trendStrength: number;

  @ApiProperty({ description: '是否存在背离', example: false })
  divergence: boolean;

  @ApiProperty({ description: '分析描述', example: '日线周期显示强势上涨趋势，趋势强度很强，可信度高' })
  analysis: string;
}

/**
 * 趋势一致性分析响应DTO
 */
export class TrendAlignmentResponseDto {
  @ApiProperty({ description: '各周期是否一致', example: true })
  isAligned: boolean;

  @ApiProperty({ description: '一致性得分 (0-100)', example: 85 })
  alignmentScore: number;

  @ApiProperty({ description: '冲突的时间周期', example: [] })
  conflictingTimeframes: string[];
}

/**
 * 交易建议响应DTO
 */
export class TradingSuggestionResponseDto {
  @ApiProperty({ description: '建议动作', example: 'BUY', enum: ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL', 'WAIT'] })
  action: string;

  @ApiProperty({ description: '建议原因', example: '多时间周期上涨趋势，建议买入' })
  reason: string;

  @ApiProperty({ description: '风险级别', example: 'LOW', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  riskLevel: string;
}

/**
 * 多时间周期趋势分析响应DTO
 */
export class MultiTimeframeTrendResponseDto {
  @ApiProperty({ description: '交易对符号', example: 'SOLUSDT' })
  symbol: string;

  @ApiProperty({ description: '分析时间戳', example: 1640995200000 })
  timestamp: number;

  @ApiProperty({ description: '整体趋势', example: 'UPTREND' })
  overallTrend: string;

  @ApiProperty({ description: '整体置信度 (0-100)', example: 82 })
  overallConfidence: number;

  @ApiProperty({ description: '各时间周期趋势分析' })
  timeframes: {
    '15m': TimeframeTrendResponseDto;
    '1h': TimeframeTrendResponseDto;
    '4h': TimeframeTrendResponseDto;
    '1d': TimeframeTrendResponseDto;
  };

  @ApiProperty({ description: '趋势一致性分析' })
  trendAlignment: TrendAlignmentResponseDto;

  @ApiProperty({ description: '交易建议' })
  tradingSuggestion: TradingSuggestionResponseDto;
}

/**
 * 价格区间响应DTO
 */
export class PriceRangeResponseDto {
  @ApiProperty({ description: '最小价格', example: 191.5 })
  min: number;

  @ApiProperty({ description: '最大价格', example: 193.2 })
  max: number;

  @ApiProperty({ description: '中心价格', example: 192.35 })
  center: number;
}

/**
 * 支撑阻力位响应DTO
 */
export class SupportResistanceLevelResponseDto {
  @ApiProperty({ description: '类型', example: 'RESISTANCE', enum: ['SUPPORT', 'RESISTANCE'] })
  type: string;

  @ApiProperty({ description: '价格区间' })
  priceRange: PriceRangeResponseDto;

  @ApiProperty({ description: '强度', example: 'STRONG', enum: ['WEAK', 'MEDIUM', 'STRONG', 'MAJOR'] })
  strength: string;

  @ApiProperty({ description: '置信度 (0-100)', example: 85 })
  confidence: number;

  @ApiProperty({ description: '触及次数', example: 3 })
  touchCount: number;

  @ApiProperty({ description: '最后触及时间', example: 1640995200000 })
  lastTouch: number;

  @ApiProperty({ description: '与当前价格距离百分比', example: 2.5 })
  distance: number;

  @ApiProperty({ description: '是否仍然有效', example: true })
  isActive: boolean;

  @ApiProperty({ description: '主要识别时间周期', example: '1d' })
  timeframe: string;

  @ApiProperty({ description: '描述', example: '1d级别强阻力位 193.25，已触及3次' })
  description: string;
}

/**
 * 关键位置响应DTO
 */
export class KeyLevelsResponseDto {
  @ApiProperty({ description: '最近支撑位', required: false })
  nearestSupport: SupportResistanceLevelResponseDto | null;

  @ApiProperty({ description: '最近阻力位', required: false })
  nearestResistance: SupportResistanceLevelResponseDto | null;

  @ApiProperty({ description: '最强支撑位', required: false })
  strongestSupport: SupportResistanceLevelResponseDto | null;

  @ApiProperty({ description: '最强阻力位', required: false })
  strongestResistance: SupportResistanceLevelResponseDto | null;
}

/**
 * 当前位置分析响应DTO
 */
export class CurrentPositionResponseDto {
  @ApiProperty({ description: '是否在支撑阻力位之间', example: true })
  betweenLevels: boolean;

  @ApiProperty({ description: '是否在支撑区域', example: false })
  inSupportZone: boolean;

  @ApiProperty({ description: '是否在阻力区域', example: false })
  inResistanceZone: boolean;

  @ApiProperty({ description: '价格行为', example: 'APPROACHING_RESISTANCE', enum: ['APPROACHING_SUPPORT', 'APPROACHING_RESISTANCE', 'BREAKING_OUT', 'CONSOLIDATING'] })
  priceAction: string;
}

/**
 * 交易区间响应DTO
 */
export class TradingZoneResponseDto {
  @ApiProperty({ description: '价格区间' })
  priceRange: { min: number; max: number };

  @ApiProperty({ description: '强度', enum: ['WEAK', 'MEDIUM', 'STRONG', 'MAJOR'] })
  strength: string;

  @ApiProperty({ description: '原因', example: '1d级别强支撑位' })
  reason: string;
}

/**
 * 交易区间集合响应DTO
 */
export class TradingZonesResponseDto {
  @ApiProperty({ description: '买入区间', type: [TradingZoneResponseDto] })
  buyZones: TradingZoneResponseDto[];

  @ApiProperty({ description: '卖出区间', type: [TradingZoneResponseDto] })
  sellZones: TradingZoneResponseDto[];
}

/**
 * 支撑阻力位分析响应DTO
 */
export class SupportResistanceAnalysisResponseDto {
  @ApiProperty({ description: '交易对符号', example: 'SOLUSDT' })
  symbol: string;

  @ApiProperty({ description: '当前价格', example: 192.84 })
  currentPrice: number;

  @ApiProperty({ description: '分析时间戳', example: 1640995200000 })
  timestamp: number;

  @ApiProperty({ description: '关键位置' })
  keyLevels: KeyLevelsResponseDto;

  @ApiProperty({ description: '所有识别的支撑阻力位' })
  allLevels: {
    supports: SupportResistanceLevelResponseDto[];
    resistances: SupportResistanceLevelResponseDto[];
  };

  @ApiProperty({ description: '当前位置分析' })
  currentPosition: CurrentPositionResponseDto;

  @ApiProperty({ description: '交易区间' })
  tradingZones: TradingZonesResponseDto;
}

/**
 * 综合评估响应DTO
 */
export class OverallAssessmentResponseDto {
  @ApiProperty({ description: '市场状况', example: 'BULLISH', enum: ['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE'] })
  marketCondition: string;

  @ApiProperty({ description: '风险级别', example: 'LOW', enum: ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] })
  riskLevel: string;

  @ApiProperty({ description: '机会评级', example: 'GOOD', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'AVOID'] })
  opportunity: string;

  @ApiProperty({ description: '适合时间框架', example: 'MEDIUM_TERM', enum: ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'] })
  timeframe: string;

  @ApiProperty({ description: '综合建议', example: '多时间周期趋势向上，支撑位明确，适合中期持有' })
  recommendation: string;
}

/**
 * 完整技术分析响应DTO
 */
export class TechnicalAnalysisResponseDto {
  @ApiProperty({ description: '交易对符号', example: 'SOLUSDT' })
  symbol: string;

  @ApiProperty({ description: '分析时间戳', example: 1640995200000 })
  timestamp: number;

  @ApiProperty({ description: '趋势分析' })
  trendAnalysis: MultiTimeframeTrendResponseDto;

  @ApiProperty({ description: '支撑阻力位分析' })
  supportResistanceAnalysis: SupportResistanceAnalysisResponseDto;

  @ApiProperty({ description: '综合评估' })
  overallAssessment: OverallAssessmentResponseDto;
} 