/**
 * 交易机会状态枚举
 * 描述交易机会的生命周期状态
 */
export enum OpportunityStatus {
  /** 监控中 - 机会已识别，正在等待入场信号 */
  WATCHING = 'WATCHING',
  
  /** 已触发 - 检测到入场信号，生成可执行交易计划 */
  TRIGGERED = 'TRIGGERED',
  
  /** 已过期 - 机会失效，不再监控 */
  EXPIRED = 'EXPIRED',
} 