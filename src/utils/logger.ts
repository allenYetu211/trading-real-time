// 日志记录工具

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private context: string = 'TradingEngine';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setContext(context: string): Logger {
    const newLogger = Object.create(this);
    newLogger.context = context;
    return newLogger;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: any, error?: Error): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    let formatted = `[${timestamp}] [${levelStr}] [${this.context}] ${message}`;
    
    if (data) {
      formatted += ` | Data: ${JSON.stringify(data)}`;
    }
    
    if (error) {
      formatted += ` | Error: ${error.message}`;
      if (error.stack) {
        formatted += `\nStack: ${error.stack}`;
      }
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, data, error);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
    }
  }

  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  // 特定业务场景的日志方法
  apiCall(method: string, url: string, duration: number, success: boolean, data?: any): void {
    const message = `API ${method} ${url} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`;
    if (success) {
      this.info(message, data);
    } else {
      this.error(message, undefined, data);
    }
  }

  analysisStart(symbol: string, source: string): void {
    this.info(`Analysis started for ${symbol}`, { symbol, source });
  }

  analysisComplete(symbol: string, duration: number, signalsFound: number): void {
    this.info(`Analysis completed for ${symbol}`, { 
      symbol, 
      duration, 
      signalsFound 
    });
  }

  signalGenerated(signal: any): void {
    this.info(`Trading signal generated`, {
      symbol: signal.symbol,
      direction: signal.direction,
      signalType: signal.signalType,
      triggerPrice: signal.triggerPrice
    });
  }

  scheduleExecution(nextExecution: number): void {
    this.info(`Next scheduled analysis`, { 
      nextExecution: new Date(nextExecution).toISOString() 
    });
  }

  telegramCommand(command: string, userId: number, success: boolean): void {
    const message = `Telegram command ${command} from user ${userId}`;
    if (success) {
      this.info(message);
    } else {
      this.warn(message + ' - FAILED');
    }
  }
}

// 导出单例实例
export const logger = Logger.getInstance();