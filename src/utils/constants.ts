// 系统常量定义

// 时间周期常量
export const TIMEFRAMES = {
  FIFTEEN_MINUTES: '15m',
  ONE_HOUR: '1h',
  FOUR_HOURS: '4h',
  ONE_DAY: '1d',
  ONE_WEEK: '1w'
} as const;

// 支持的时间周期数组
export const SUPPORTED_TIMEFRAMES = Object.values(TIMEFRAMES);

// 趋势状态常量
export const TREND_STATES = {
  UPTREND: 'UPTREND',
  DOWNTREND: 'DOWNTREND',
  RANGING: 'RANGING'
} as const;

// 交易方向常量
export const TRADE_DIRECTIONS = {
  LONG: 'LONG',
  SHORT: 'SHORT'
} as const;

// 信号类型常量
export const SIGNAL_TYPES = {
  STRUCTURE_BREAKOUT: 'STRUCTURE_BREAKOUT',
  PULLBACK_CONFIRMATION: 'PULLBACK_CONFIRMATION',
  PATTERN_BREAKOUT: 'PATTERN_BREAKOUT'
} as const;

// 机会状态常量
export const OPPORTUNITY_STATUS = {
  WATCHLIST: 'WATCHLIST',
  SIGNAL_TRIGGERED: 'SIGNAL_TRIGGERED'
} as const;

// 关键位类型常量
export const KEY_LEVEL_TYPES = {
  SUPPORT: 'SUPPORT',
  RESISTANCE: 'RESISTANCE'
} as const;

// 触发源常量
export const TRIGGER_SOURCES = {
  SCHEDULED: 'SCHEDULED',
  MANUAL_WEB: 'MANUAL_WEB',
  MANUAL_TELEGRAM: 'MANUAL_TELEGRAM'
} as const;

// 默认配置常量
export const DEFAULT_CONFIG = {
  // EMA周期
  EMA_PERIODS: {
    EMA21: 21,
    EMA55: 55
  },
  
  // 风险回报比阈值
  RISK_REWARD: {
    MIN_RATIO: 2.0,
    CONSERVATIVE_MULTIPLIER: 1.0,
    AGGRESSIVE_MULTIPLIER: 1.5
  },
  
  // 分析参数
  ANALYSIS: {
    SCHEDULE_INTERVAL_MINUTES: 15,
    MAX_TRADING_PAIRS: 20,
    KLINE_LIMIT: {
      EMA_CALCULATION: 200,  // EMA计算需要的K线数量
      SWING_DETECTION: 50,   // 摆动点检测需要的K线数量
      PATTERN_ANALYSIS: 100  // 形态分析需要的K线数量
    }
  },
  
  // API限制
  API_LIMITS: {
    BINANCE_WEIGHT_LIMIT: 1200,
    BINANCE_WEIGHT_BUFFER: 200, // 保留缓冲
    REQUEST_TIMEOUT: 5000,
    MAX_RETRIES: 3
  },
  
  // 关键位分析参数
  KEY_LEVELS: {
    MIN_STRENGTH: 5,           // 最小强度阈值
    PRICE_TOLERANCE: 0.005,    // 价格容差 (0.5%)
    VOLUME_WEIGHT: 0.3,        // 成交量权重
    TOUCH_COUNT_WEIGHT: 0.4,   // 触及次数权重
    TIME_DECAY_FACTOR: 0.1     // 时间衰减因子
  },
  
  // 信号检测参数
  SIGNAL_DETECTION: {
    BREAKOUT_VOLUME_MULTIPLIER: 1.5,  // 突破成交量倍数
    ENGULFING_BODY_RATIO: 0.7,        // 吞没形态实体比例
    PATTERN_MIN_BARS: 5,              // 形态最小K线数量
    PATTERN_MAX_BARS: 20              // 形态最大K线数量
  }
} as const;

// 数据库表名常量
export const DB_TABLES = {
  MARKET_STATES: 'market_states',
  TRADING_OPPORTUNITIES: 'trading_opportunities',
  TRADING_SIGNALS: 'trading_signals',
  KEY_LEVELS: 'key_levels',
  ANALYSIS_EXECUTIONS: 'analysis_executions',
  TELEGRAM_USERS: 'telegram_users',
  SYSTEM_CONFIG: 'system_config'
} as const;

// 币安API端点
export const BINANCE_ENDPOINTS = {
  BASE_URL: 'https://api.binance.com',
  KLINES: '/api/v3/klines',
  TICKER_PRICE: '/api/v3/ticker/price',
  EXCHANGE_INFO: '/api/v3/exchangeInfo'
} as const;

// 错误代码常量
export const ERROR_CODES = {
  API_ERROR: 'API_ERROR',
  DATA_ERROR: 'DATA_ERROR',
  ANALYSIS_ERROR: 'ANALYSIS_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TELEGRAM_ERROR: 'TELEGRAM_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR'
} as const;

// 日志上下文常量
export const LOG_CONTEXTS = {
  DATA_MANAGER: 'DataManager',
  TREND_ANALYZER: 'TrendAnalyzer',
  KEY_LEVEL_ANALYZER: 'KeyLevelAnalyzer',
  RISK_REWARD_CALCULATOR: 'RiskRewardCalculator',
  SIGNAL_GENERATOR: 'SignalGenerator',
  TRADING_ENGINE: 'TradingEngine',
  SCHEDULE_MANAGER: 'ScheduleManager',
  TELEGRAM_BOT: 'TelegramBot',
  CONFIG_MANAGER: 'ConfigManager'
} as const;

// 性能监控阈值
export const PERFORMANCE_THRESHOLDS = {
  API_CALL_TIMEOUT: 5000,        // API调用超时 (5秒)
  ANALYSIS_TIMEOUT: 30000,       // 分析超时 (30秒)
  DATABASE_QUERY_TIMEOUT: 3000,  // 数据库查询超时 (3秒)
  SIGNAL_GENERATION_TIMEOUT: 10000 // 信号生成超时 (10秒)
} as const;

// 缓存TTL常量 (毫秒)
export const CACHE_TTL = {
  MARKET_DATA: 60000,      // 市场数据缓存1分钟
  ANALYSIS_RESULT: 300000, // 分析结果缓存5分钟
  CONFIG_DATA: 600000,     // 配置数据缓存10分钟
  API_STATUS: 30000        // API状态缓存30秒
} as const;

// Telegram命令常量
export const TELEGRAM_COMMANDS = {
  START: '/start',
  ANALYZE: '/analyze',
  STATUS: '/status',
  SIGNALS: '/signals',
  CONFIG: '/config',
  HELP: '/help',
  WATCHLIST: '/watchlist',
  HISTORY: '/history'
} as const;

// 消息模板常量
export const MESSAGE_TEMPLATES = {
  ANALYSIS_START: '🔄 开始执行分析...',
  ANALYSIS_COMPLETE: '✅ 分析完成',
  ANALYSIS_FAILED: '❌ 分析执行失败',
  NO_SIGNALS: '📊 当前没有符合条件的交易信号',
  UNAUTHORIZED: '🚫 您没有权限执行此操作',
  INVALID_COMMAND: '❓ 无效的命令，请使用 /help 查看帮助'
} as const;