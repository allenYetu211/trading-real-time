/**
 * 入场信号类型枚举
 * 定义不同的入场信号类型，基于右侧交易原则
 */
export enum EntrySignalType {
  /** 结构突破 - 价格放量突破关键结构位 */
  STRUCTURE_BREAKOUT = 'STRUCTURE_BREAKOUT',
  
  /** 回调确认 - 价格回落到关键支撑并出现确认信号 */
  PULLBACK_CONFIRMATION = 'PULLBACK_CONFIRMATION',
  
  /** 形态突破 - 价格突破整理形态（如旗形、三角形等） */
  PATTERN_BREAKOUT = 'PATTERN_BREAKOUT',
} 