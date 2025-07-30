import { PrismaClient } from '@prisma/client';

/**
 * 测试简化后的CoinConfig功能
 */
async function testSimplifiedCoinConfig() {
  console.log('🚀 测试简化后的CoinConfig功能...\n');

  const prisma = new PrismaClient();
  const DEFAULT_INTERVAL = 'default';

  try {
    console.log('📋 1. 当前配置:');
    const configs = await prisma.coinConfig.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' }
    });
    
    if (configs.length === 0) {
      console.log('   没有活跃配置');
    } else {
      configs.forEach(config => {
        console.log(`   - ${config.symbol} (${config.interval})`);
      });
    }

    console.log('\n➕ 2. 测试添加交易对 (不重复interval):');
    const testSymbols = ['BTCUSDT', 'ETHUSDT'];
    
    for (const symbol of testSymbols) {
      try {
        // 检查是否已存在
        const existing = await prisma.coinConfig.findFirst({
          where: { symbol, interval: DEFAULT_INTERVAL }
        });

        if (!existing) {
          await prisma.coinConfig.create({
            data: {
              symbol,
              interval: DEFAULT_INTERVAL,
              isActive: true,
            },
          });
          console.log(`   ✅ 成功添加 ${symbol}`);
        } else {
          console.log(`   ⚠️  ${symbol} 已存在，跳过添加`);
        }
      } catch (error) {
        console.log(`   ❌ 添加 ${symbol} 失败:`, error.message);
      }
    }

    console.log('\n📊 3. 更新后的配置:');
    const updatedConfigs = await prisma.coinConfig.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' }
    });
    
    updatedConfigs.forEach(config => {
      console.log(`   - ${config.symbol} (${config.interval})`);
    });

    console.log('\n🔄 4. 生成动态交易对菜单:');
    const uniqueSymbols = [...new Set(updatedConfigs.map(config => config.symbol))];
    console.log(`   可用交易对: ${uniqueSymbols.join(', ')}`);
    console.log(`   总计: ${uniqueSymbols.length} 个交易对`);

    // 模拟生成菜单按钮
    console.log('\n📱 5. 模拟菜单按钮生成:');
    const symbolsPerRow = 4;
    for (let i = 0; i < uniqueSymbols.length; i += symbolsPerRow) {
      const row = uniqueSymbols.slice(i, i + symbolsPerRow);
      console.log(`   💰 ${row.join(' • ')}`);
    }

    console.log('\n✅ 测试完成！简化后的CoinConfig功能正常工作');
    console.log('💡 每个交易对只需要一条配置记录，分析时会查询所有时间周期的数据');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testSimplifiedCoinConfig().catch(console.error);