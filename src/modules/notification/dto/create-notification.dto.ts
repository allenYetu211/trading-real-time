import { IsString, IsEnum, IsOptional, IsNumber, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: '通知标题', example: '🚀 BTCUSDT(1h) 图像结构分析' })
  @IsString({ message: '标题必须是字符串' })
  title: string;

  @ApiProperty({ description: '通知消息', example: 'BUY 信号 (高置信度)' })
  @IsString({ message: '消息必须是字符串' })
  message: string;

  @ApiProperty({ 
    description: '通知类型', 
    enum: ['info', 'success', 'warning', 'error'],
    example: 'success' 
  })
  @IsEnum(['info', 'success', 'warning', 'error'], { message: '不支持的通知类型' })
  type: 'info' | 'success' | 'warning' | 'error';

  @ApiPropertyOptional({ description: '交易对', example: 'BTCUSDT' })
  @IsOptional()
  @IsString({ message: '交易对必须是字符串' })
  symbol?: string;

  @ApiPropertyOptional({ description: '时间周期', example: '1h' })
  @IsOptional()
  @IsString({ message: '时间周期必须是字符串' })
  interval?: string;

  @ApiPropertyOptional({ description: '信号类型', example: 'BUY' })
  @IsOptional()
  @IsString({ message: '信号类型必须是字符串' })
  signal?: string;

  @ApiPropertyOptional({ description: '置信度', example: 85.5 })
  @IsOptional()
  @IsNumber({}, { message: '置信度必须是数字' })
  confidence?: number;

  @ApiPropertyOptional({ description: '总结', example: '技术指标显示强烈上涨信号' })
  @IsOptional()
  @IsString({ message: '总结必须是字符串' })
  summary?: string;

  @ApiPropertyOptional({ description: '识别的形态', example: '金叉形态, 上升楔形' })
  @IsOptional()
  @IsString({ message: '形态必须是字符串' })
  patterns?: string;

  @ApiPropertyOptional({ description: '支撑阻力位', example: '3个关键位' })
  @IsOptional()
  @IsString({ message: '支撑阻力位必须是字符串' })
  supportResistance?: string;

  @ApiPropertyOptional({ description: '额外数据(JSON格式)', example: '{}' })
  @IsOptional()
  @IsString({ message: '额外数据必须是字符串' })
  data?: string;

  @ApiProperty({ description: '时间戳', example: '2025-01-20T10:30:00.000Z' })
  @IsISO8601({}, { message: '时间戳格式不正确' })
  timestamp: string;
} 