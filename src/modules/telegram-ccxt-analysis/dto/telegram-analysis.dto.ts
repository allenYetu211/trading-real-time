import { IsString, IsOptional, IsIn, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Telegram 分析请求 DTO
 */
export class TelegramAnalysisRequestDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;

  @ApiPropertyOptional({
    description: '时间周期',
    example: '1d',
    enum: ['1m', '5m', '15m', '1h', '4h', '1d', '1w'],
    default: '1d',
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d', '1w'], {
    message: '时间周期必须是支持的值',
  })
  timeframe?: string;

  @ApiPropertyOptional({
    description: '分析类型',
    example: 'ema',
    enum: ['ema', 'trend', 'support_resistance', 'comprehensive', 'quick'],
    default: 'ema',
  })
  @IsOptional()
  @IsIn(['ema', 'trend', 'support_resistance', 'comprehensive', 'quick'], {
    message: '分析类型必须是支持的值',
  })
  analysisType?: string;
}

/**
 * Telegram 快速分析 DTO
 */
export class TelegramQuickAnalysisDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;

  @ApiPropertyOptional({
    description: '时间周期',
    example: '1d',
    enum: ['1m', '5m', '15m', '1h', '4h', '1d', '1w'],
    default: '1d',
  })
  @IsOptional()
  @IsIn(['1m', '5m', '15m', '1h', '4h', '1d', '1w'], {
    message: '时间周期必须是支持的值',
  })
  timeframe?: string;
}

/**
 * Telegram 菜单操作 DTO
 */
export class TelegramMenuActionDto {
  @ApiProperty({
    description: '操作类型',
    example: 'analyze',
    enum: ['analyze', 'list', 'help', 'settings'],
  })
  @IsString({ message: '操作类型必须是字符串' })
  @IsIn(['analyze', 'list', 'help', 'settings'], {
    message: '操作类型必须是支持的值',
  })
  action: string;

  @ApiPropertyOptional({
    description: '操作参数',
    example: { symbol: 'SOLUSDT', timeframe: '1d' },
  })
  @IsOptional()
  parameters?: Record<string, any>;
}

/**
 * Telegram 消息发送 DTO
 */
export class TelegramSendMessageDto {
  @ApiProperty({
    description: '消息内容',
    example: '🧪 这是一条测试消息',
  })
  @IsString({ message: '消息内容必须是字符串' })
  message: string;

  @ApiPropertyOptional({
    description: '消息类型',
    example: 'info',
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info',
  })
  @IsOptional()
  @IsIn(['info', 'success', 'warning', 'error'], {
    message: '消息类型必须是支持的值',
  })
  type?: string;
}

/**
 * Telegram 技术分析请求 DTO
 */
export class TelegramTechnicalAnalysisDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;

  @ApiPropertyOptional({
    description: '分析类型',
    example: 'comprehensive',
    enum: ['trend', 'support_resistance', 'comprehensive'],
    default: 'comprehensive',
  })
  @IsOptional()
  @IsIn(['trend', 'support_resistance', 'comprehensive'], {
    message: '分析类型必须是支持的值',
  })
  analysisType?: string;
}

/**
 * Telegram 多时间周期趋势分析 DTO
 */
export class TelegramTrendAnalysisDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;
}

/**
 * Telegram 支撑阻力位分析 DTO
 */
export class TelegramSupportResistanceDto {
  @ApiProperty({
    description: '交易对符号',
    example: 'SOLUSDT',
  })
  @IsString({ message: '交易对符号必须是字符串' })
  symbol: string;
} 