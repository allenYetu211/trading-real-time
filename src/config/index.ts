// 配置管理

import dotenv from 'dotenv';
import { DEFAULT_CONFIG } from '../utils/constants';

// 加载环境变量
dotenv.config();

export interface AppConfig {
  // 数据库配置
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  
  // 币安API配置
  binance: {
    apiKey: string;
    secretKey: string;
    baseUrl: string;
    weightLimit: number;
    weightBuffer: number;
    requestTimeout: number;
  };
  
  // Telegram配置
  telegram: {
    botToken: string;
    authorizedUsers: number[];
  };
  
  // 服务器配置
  server: {
    port: number;
    wsPort: number;
    nodeEnv: string;
  };
  
  // 分析配置
  analysis: {
    intervalMinutes: number;
    maxTradingPairs: number;
    riskRewardThreshold: number;
    defaultSymbols: string[];
  };
  
  // 日志配置
  logging: {
    level: string;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  const parsed = parseInt(value || defaultValue!.toString(), 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

function getEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function getEnvNumberArray(key: string, defaultValue: number[] = []): number[] {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.split(',')
    .map(item => parseInt(item.trim(), 10))
    .filter(num => !isNaN(num));
}

// 创建配置对象
export const config: AppConfig = {
  database: {
    url: getEnvVar('DATABASE_URL'),
    host: getEnvVar('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    name: getEnvVar('DB_NAME', 'trading_engine'),
    user: getEnvVar('DB_USER', 'postgres'),
    password: getEnvVar('DB_PASSWORD', 'password')
  },
  
  binance: {
    apiKey: getEnvVar('BINANCE_API_KEY'),
    secretKey: getEnvVar('BINANCE_SECRET_KEY'),
    baseUrl: getEnvVar('BINANCE_BASE_URL', 'https://api.binance.com'),
    weightLimit: getEnvNumber('API_WEIGHT_LIMIT', DEFAULT_CONFIG.API_LIMITS.BINANCE_WEIGHT_LIMIT),
    weightBuffer: getEnvNumber('API_WEIGHT_BUFFER', DEFAULT_CONFIG.API_LIMITS.BINANCE_WEIGHT_BUFFER),
    requestTimeout: getEnvNumber('API_REQUEST_TIMEOUT', DEFAULT_CONFIG.API_LIMITS.REQUEST_TIMEOUT)
  },
  
  telegram: {
    botToken: getEnvVar('TELEGRAM_BOT_TOKEN'),
    authorizedUsers: getEnvNumberArray('TELEGRAM_AUTHORIZED_USERS')
  },
  
  server: {
    port: getEnvNumber('PORT', 3000),
    wsPort: getEnvNumber('WS_PORT', 3001),
    nodeEnv: getEnvVar('NODE_ENV', 'development')
  },
  
  analysis: {
    intervalMinutes: getEnvNumber('ANALYSIS_INTERVAL_MINUTES', DEFAULT_CONFIG.ANALYSIS.SCHEDULE_INTERVAL_MINUTES),
    maxTradingPairs: getEnvNumber('MAX_TRADING_PAIRS', DEFAULT_CONFIG.ANALYSIS.MAX_TRADING_PAIRS),
    riskRewardThreshold: parseFloat(getEnvVar('RISK_REWARD_THRESHOLD', DEFAULT_CONFIG.RISK_REWARD.MIN_RATIO.toString())),
    defaultSymbols: getEnvArray('DEFAULT_SYMBOLS', ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'])
  },
  
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info')
  }
};

// 配置验证
export function validateConfig(): void {
  const errors: string[] = [];
  
  // 验证数据库配置
  if (!config.database.url && (!config.database.host || !config.database.name)) {
    errors.push('Database configuration is incomplete');
  }
  
  // 验证币安API配置
  if (!config.binance.apiKey || !config.binance.secretKey) {
    errors.push('Binance API credentials are required');
  }
  
  // 验证Telegram配置
  if (!config.telegram.botToken) {
    errors.push('Telegram bot token is required');
  }
  
  // 验证分析配置
  if (config.analysis.riskRewardThreshold <= 0) {
    errors.push('Risk reward threshold must be positive');
  }
  
  if (config.analysis.maxTradingPairs <= 0 || config.analysis.maxTradingPairs > 100) {
    errors.push('Max trading pairs must be between 1 and 100');
  }
  
  if (config.analysis.intervalMinutes <= 0) {
    errors.push('Analysis interval must be positive');
  }
  
  // 验证交易对格式
  const symbolPattern = /^[A-Z]{2,10}USDT$/;
  const invalidSymbols = config.analysis.defaultSymbols.filter(symbol => !symbolPattern.test(symbol));
  if (invalidSymbols.length > 0) {
    errors.push(`Invalid trading symbols: ${invalidSymbols.join(', ')}`);
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// 获取运行时配置
export function getRuntimeConfig() {
  return {
    isDevelopment: config.server.nodeEnv === 'development',
    isProduction: config.server.nodeEnv === 'production',
    isTest: config.server.nodeEnv === 'test',
    
    // 计算的配置值
    binanceUsableWeight: config.binance.weightLimit - config.binance.weightBuffer,
    maxConcurrentRequests: Math.floor((config.binance.weightLimit - config.binance.weightBuffer) / 10),
    
    // 数据库连接字符串
    getDatabaseUrl(): string {
      if (config.database.url) {
        return config.database.url;
      }
      return `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`;
    }
  };
}

// 导出默认配置
export default config;