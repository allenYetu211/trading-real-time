import { PrismaClient } from '@prisma/client';

/**
 * 清理CoinConfig表，每个symbol只保留一条记录
 */
async function cleanupCoinConfig() {
  console.log('🧹 开始清理CoinConfig表...\n');

  const prisma = new PrismaClient();
  const DEFAULT_INTERVAL = 'default';

  try {
    console.log('📊 1. 当前配置统计:');
    const totalCount = await prisma.coinConfig.count();
    console.log(`   总配置数: ${totalCount}`);

    const groupedConfigs = await prisma.coinConfig.groupBy({
      by: ['symbol'],
      _count: { symbol: true }
    });
    
    console.log(`   不同交易对数: ${groupedConfigs.length}`);
    const duplicateSymbols = groupedConfigs.filter(g => g._count.symbol > 1);
    console.log(`   有重复配置的交易对: ${duplicateSymbols.length}`);

    if (duplicateSymbols.length > 0) {
      console.log('\n🔄 2. 清理重复配置:');
      for (const group of duplicateSymbols) {
        const symbol = group.symbol;
        console.log(`   处理 ${symbol}...`);

        // 获取该symbol的所有配置
        const configs = await prisma.coinConfig.findMany({
          where: { symbol },
          orderBy: { createdAt: 'asc' }
        });

        // 删除除第一个之外的所有配置
        const toDelete = configs.slice(1);
        if (toDelete.length > 0) {
          await prisma.coinConfig.deleteMany({
            where: {
              id: { in: toDelete.map(c => c.id) }
            }
          });
          console.log(`     删除了 ${toDelete.length} 个重复配置`);
        }

        // 更新保留的配置为默认interval
        const remaining = configs[0];
        if (remaining.interval !== DEFAULT_INTERVAL) {
          await prisma.coinConfig.update({
            where: { id: remaining.id },
            data: { interval: DEFAULT_INTERVAL }
          });
          console.log(`     更新interval为 ${DEFAULT_INTERVAL}`);
        }
      }
    }

    console.log('\n📊 3. 处理无重复的配置:');
    const singleConfigs = groupedConfigs.filter(g => g._count.symbol === 1);
    for (const group of singleConfigs) {
      const symbol = group.symbol;
      const config = await prisma.coinConfig.findFirst({
        where: { symbol }
      });

      if (config && config.interval !== DEFAULT_INTERVAL) {
        await prisma.coinConfig.update({
          where: { id: config.id },
          data: { interval: DEFAULT_INTERVAL }
        });
        console.log(`   更新 ${symbol} 的interval为 ${DEFAULT_INTERVAL}`);
      }
    }

    console.log('\n📊 4. 清理后统计:');
    const finalCount = await prisma.coinConfig.count();
    const finalConfigs = await prisma.coinConfig.findMany({
      orderBy: { symbol: 'asc' }
    });

    console.log(`   总配置数: ${finalCount}`);
    console.log(`   配置列表:`);
    finalConfigs.forEach(config => {
      console.log(`     - ${config.symbol} (${config.interval}) ${config.isActive ? '✅' : '❌'}`);
    });

    console.log('\n✅ 清理完成！每个交易对现在只有一条配置记录');

  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行清理
cleanupCoinConfig().catch(console.error);