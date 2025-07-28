/**
 * 可执行信号状态枚举
 * 描述可执行信号的生命周期状态
 */
export enum ActionableSignalStatus {
  /** 活跃 - 信号已生成，等待执行 */
  ACTIVE = 'ACTIVE',
  
  /** 已执行 - 用户已根据信号执行交易 */
  EXECUTED = 'EXECUTED',
  
  /** 已过期 - 信号失效，不再有效 */
  EXPIRED = 'EXPIRED',
} 