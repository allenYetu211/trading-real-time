// 数据库种子数据

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库种子数据...');

  // 创建默认的币种配置
  const defaultSymbols = [
    'BTCUSDT',
    'ETHUSDT', 
    'BNBUSDT',
    'ADAUSDT',
    'SOLUSDT',
    'XRPUSDT',
    'DOTUSDT',
    'LINKUSDT',
    'LTCUSDT',
    'BCHUSDT'
  ];

  const intervals = ['15m', '1h', '4h', '1d'];

  // 创建币种配置
  for (const symbol of defaultSymbols) {
    for (const interval of intervals) {
      await prisma.coinConfig.upsert({
        where: {
          symbol_interval: {
            symbol,
            interval
          }
        },
        update: {},
        create: {
          symbol,
          interval,
          isActive: true
        }
      });
    }
  }

  console.log(`创建了 ${defaultSymbols.length * intervals.length} 个币种配置`);

  // 创建示例策略配置
  const strategyConfigs = [
    {
      name: '趋势跟踪策略',
      type: 'TREND_FOLLOWING',
      status: 'ACTIVE',
      symbol: 'BTCUSDT',
      interval: '1h',
      parameters: JSON.stringify({
        ema_short: 21,
        ema_long: 55,
        rsi_period: 14,
        rsi_overbought: 70,
        rsi_oversold: 30
      }),
      riskManagement: JSON.stringify({
        max_position_size: 0.1,
        stop_loss_pct: 0.02,
        take_profit_pct: 0.04,
        max_drawdown: 0.05
      })
    },
    {
      name: '突破策略',
      type: 'BREAKOUT',
      status: 'ACTIVE',
      symbol: 'ETHUSDT',
      interval: '15m',
      parameters: JSON.stringify({
        lookback_period: 20,
        volume_multiplier: 1.5,
        breakout_threshold: 0.005
      }),
      riskManagement: JSON.stringify({
        max_position_size: 0.08,
        stop_loss_pct: 0.015,
        take_profit_pct: 0.03,
        max_drawdown: 0.04
      })
    },
    {
      name: '均值回归策略',
      type: 'MEAN_REVERSION',
      status: 'INACTIVE',
      symbol: 'BNBUSDT',
      interval: '4h',
      parameters: JSON.stringify({
        bollinger_period: 20,
        bollinger_std: 2,
        rsi_period: 14,
        oversold_threshold: 25,
        overbought_threshold: 75
      }),
      riskManagement: JSON.stringify({
        max_position_size: 0.06,
        stop_loss_pct: 0.025,
        take_profit_pct: 0.02,
        max_drawdown: 0.03
      })
    }
  ];

  for (const config of strategyConfigs) {
    await prisma.strategyConfig.create({
      data: config
    });
  }

  console.log(`创建了 ${strategyConfigs.length} 个策略配置`);

  // 创建示例通知记录
  const notifications = [
    {
      title: '系统启动',
      message: '交易决策引擎已成功启动',
      type: 'success',
      timestamp: new Date()
    },
    {
      title: '数据库初始化',
      message: '数据库种子数据初始化完成',
      type: 'info',
      timestamp: new Date()
    }
  ];

  for (const notification of notifications) {
    await prisma.notificationRecord.create({
      data: notification
    });
  }

  console.log(`创建了 ${notifications.length} 个通知记录`);

  console.log('数据库种子数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });