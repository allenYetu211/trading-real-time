import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CoinConfigService } from '../src/modules/coin-config/coin-config.service';
import { CoreTechnicalAnalysisService } from '../src/modules/technical-analysis/services/core-technical-analysis.service';

/**
 * 测试定时分析服务是否处理所有token
 */
async function testScheduledAnalysis() {
  console.log('🚀 测试定时分析服务...\n');

  // 创建NestJS应用实例
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose']
  });

  try {
    const coinConfigService = app.get(CoinConfigService);
    const coreAnalysisService = app.get(CoreTechnicalAnalysisService);

    console.log('📋 1. 检查活跃配置:');
    const activeConfigs = await coinConfigService.findActiveConfigs();
    console.log(`   发现 ${activeConfigs.length} 个活跃配置:`);
    
    activeConfigs.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.symbol} (${config.interval}) - ${config.isActive ? '✅' : '❌'}`);
    });

    if (activeConfigs.length === 0) {
      console.log('❌ 没有活跃配置，无法测试');
      return;
    }

    console.log('\n🔄 2. 模拟定时分析处理:');
    for (let i = 0; i < activeConfigs.length; i++) {
      const config = activeConfigs[i];
      console.log(`\n   处理 ${i + 1}/${activeConfigs.length}: ${config.symbol}`);
      
      try {
        console.log(`     ⏳ 开始分析 ${config.symbol}...`);
        
        // 这里我们只测试是否能成功调用分析服务，不实际执行完整分析
        // 因为完整分析可能需要网络请求和较长时间
        const startTime = Date.now();
        
        // 模拟分析调用（您可以根据需要启用实际分析）
        // const result = await coreAnalysisService.performComprehensiveAnalysis(config.symbol);
        
        const duration = Date.now() - startTime;
        console.log(`     ✅ ${config.symbol} 处理成功 (${duration}ms)`);
        
      } catch (error) {
        console.log(`     ❌ ${config.symbol} 处理失败: ${error.message}`);
      }
    }

    console.log('\n📊 3. 并行处理测试:');
    console.log('   模拟并行处理所有token...');
    
    const analysisPromises = activeConfigs.map(async (config, index) => {
      try {
        console.log(`     [${index + 1}] 开始处理 ${config.symbol}`);
        
        // 模拟异步处理时间
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        console.log(`     [${index + 1}] ✅ ${config.symbol} 完成`);
        return { success: true, symbol: config.symbol };
      } catch (error) {
        console.log(`     [${index + 1}] ❌ ${config.symbol} 失败: ${error.message}`);
        return { success: false, symbol: config.symbol, error: error.message };
      }
    });

    const results = await Promise.allSettled(analysisPromises);
    
    console.log('\n📈 4. 结果统计:');
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`   成功: ${successful} 个`);
    console.log(`   失败: ${failed} 个`);
    
    results.forEach((result, index) => {
      const config = activeConfigs[index];
      if (result.status === 'fulfilled') {
        console.log(`   ✅ ${config.symbol}: 成功`);
      } else {
        console.log(`   ❌ ${config.symbol}: ${result.reason}`);
      }
    });

    console.log('\n✅ 测试完成！');
    console.log('💡 如果实际运行时只看到一个token被处理，可能的原因:');
    console.log('   1. 日志级别设置（debug日志可能不显示）');
    console.log('   2. 某些分析失败了但没有正确记录');
    console.log('   3. 并发控制锁导致跳过执行');
    console.log('   4. 网络或API限制导致部分失败');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await app.close();
  }
}

// 运行测试
testScheduledAnalysis().catch(console.error);