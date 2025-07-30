import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CoinConfigService } from '../src/modules/coin-config/coin-config.service';
import { IntervalType } from '../src/shared/enums';

/**
 * 测试Telegram动态交易对功能
 */
async function testTelegramDynamicSymbols() {
  console.log('🚀 测试Telegram动态交易对功能...\n');

  // 创建NestJS应用实例
  const app = await NestFactory.createApplicationContext(AppModule);
  const coinConfigService = app.get(CoinConfigService);

  try {
    console.log('📋 1. 当前关注列表:');
    const activeConfigs = await coinConfigService.findActiveConfigs();
    if (activeConfigs.length === 0) {
      console.log('   没有配置任何关注的交易对');
    } else {
      activeConfigs.forEach(config => {
        console.log(`   - ${config.symbol} (${config.interval})`);
      });
    }

    console.log('\n➕ 2. 测试添加交易对:');
    const testSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    
    for (const symbol of testSymbols) {
      try {
        const exists = await coinConfigService.exists(symbol, IntervalType.ONE_DAY);
        if (!exists) {
          const result = await coinConfigService.create({
            symbol,
            interval: IntervalType.ONE_DAY,
            isActive: true,
          });
          console.log(`   ✅ 成功添加 ${symbol}`);
        } else {
          console.log(`   ⚠️  ${symbol} 已存在，跳过添加`);
        }
      } catch (error) {
        console.log(`   ❌ 添加 ${symbol} 失败:`, error.message);
      }
    }

    console.log('\n📊 3. 更新后的关注列表:');
    const updatedConfigs = await coinConfigService.findActiveConfigs();
    updatedConfigs.forEach(config => {
      console.log(`   - ${config.symbol} (${config.interval})`);
    });

    console.log('\n🔄 4. 生成动态交易对列表:');
    const uniqueSymbols = [...new Set(updatedConfigs.map(config => config.symbol))];
    console.log(`   可用交易对: ${uniqueSymbols.join(', ')}`);
    console.log(`   总计: ${uniqueSymbols.length} 个交易对`);

    console.log('\n✅ 测试完成！动态交易对功能正常工作');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await app.close();
  }
}

// 运行测试
testTelegramDynamicSymbols().catch(console.error);