import { PrismaClient } from '@prisma/client';
import { IntervalType } from '../src/shared/enums';

/**
 * 简单测试CoinConfig功能（不使用NestJS）
 */
async function testCoinConfig() {
  console.log('🚀 测试CoinConfig功能...\n');

  const prisma = new PrismaClient();

  try {
    console.log('📋 1. 当前配置数量:');
    const count = await prisma.coinConfig.count();
    console.log(`   总计: ${count} 个配置`);

    console.log('\n📊 2. 活跃配置:');
    const activeConfigs = await prisma.coinConfig.findMany({
      where: { isActive: true },
    });
    console.log(`   活跃配置: ${activeConfigs.length} 个`);
    
    if (activeConfigs.length > 0) {
      activeConfigs.forEach(config => {
        console.log(`   - ${config.symbol} (${config.interval})`);
      });
    }

    console.log('\n🔄 3. 可用交易对:');
    const uniqueSymbols = [...new Set(activeConfigs.map(config => config.symbol))];
    console.log(`   交易对: ${uniqueSymbols.join(', ') || '无'}`);
    console.log(`   总计: ${uniqueSymbols.length} 个交易对`);

    if (uniqueSymbols.length === 0) {
      console.log('\n➕ 4. 添加测试数据:');
      const testSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
      
      for (const symbol of testSymbols) {
        try {
          await prisma.coinConfig.create({
            data: {
              symbol,
              interval: IntervalType.ONE_DAY,
              isActive: true,
            },
          });
          console.log(`   ✅ 成功添加 ${symbol}`);
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`   ⚠️  ${symbol} 已存在`);
          } else {
            console.log(`   ❌ 添加 ${symbol} 失败:`, error.message);
          }
        }
      }

      console.log('\n📊 5. 更新后的活跃配置:');
      const updatedConfigs = await prisma.coinConfig.findMany({
        where: { isActive: true },
      });
      const updatedSymbols = [...new Set(updatedConfigs.map(config => config.symbol))];
      console.log(`   交易对: ${updatedSymbols.join(', ')}`);
    }

    console.log('\n✅ 测试完成！CoinConfig功能正常工作');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testCoinConfig().catch(console.error);