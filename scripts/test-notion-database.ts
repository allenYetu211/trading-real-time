import { Client } from '@notionhq/client';

async function testNotionDatabase() {
  console.log('🔍 检查 Notion 数据库结构...\n');

  // const apiToken = process.env.NOTION_API_TOKEN;
  // const databaseId = process.env.NOTION_DATABASE_ID;
  // const enabled = process.env.NOTION_ENABLED;

  const apiToken = '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';
  const databaseId = '23ad4977-5a71-80bd-8ace-cbd97b45137c';
  const enabled = 'true';

  console.log('📋 环境变量检查:');
  console.log(`• NOTION_API_TOKEN: ${apiToken ? '✅ 已设置' : '❌ 未设置'}`);
  console.log(`• NOTION_DATABASE_ID: ${databaseId ? '✅ 已设置' : '❌ 未设置'}`);
  console.log(`• NOTION_ENABLED: ${enabled || '❌ 未设置'}`);
  console.log('');

  if (!apiToken || !databaseId || enabled !== 'true') {
    console.log('❌ 环境变量配置不完整，请检查 .env 文件');
    return;
  }

  try {
    const notion = new Client({
      auth: apiToken,
    });

    console.log('🔗 连接 Notion...');
    
    // 获取数据库信息
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    console.log('✅ 成功连接到 Notion 数据库\n');

    // 显示数据库信息
    const title = (database as any).title?.[0]?.plain_text || 'Unknown';
    console.log(`📊 数据库标题: ${title}`);
    console.log(`🆔 数据库 ID: ${databaseId}\n`);

    // 分析现有字段
    const properties = (database as any).properties || {};
    const fieldNames = Object.keys(properties);
    
    console.log(`📋 当前数据库字段 (${fieldNames.length} 个):`);
    fieldNames.forEach((fieldName, index) => {
      const field = properties[fieldName];
      const type = field.type;
      console.log(`${index + 1}. "${fieldName}" - ${type}`);
      
      // 显示 Select 字段的选项
      if (type === 'select' && field.select?.options) {
        const options = field.select.options.map((opt: any) => opt.name).join(', ');
        console.log(`   选项: ${options}`);
      }
    });

    console.log('');

    // 检查必需字段
    const requiredFields = [
      '交易ID',
      '交易对', 
      '方向',
      '状态',
      '杠杆',
      '开仓价格',
      '平仓价格', 
      '仓位大小',
      '盈亏',
      '手续费',
      '净盈亏',
      '收益率',
      '持仓时长',
      '止盈价格',
      '止损价格',
      '开仓时间',
      '平仓时间',
      '备注'
    ];

    console.log('🔍 字段匹配检查:');
    const missingFields = [];
    const existingFields = [];

    requiredFields.forEach(requiredField => {
      if (fieldNames.includes(requiredField)) {
        existingFields.push(requiredField);
        console.log(`✅ "${requiredField}"`);
      } else {
        missingFields.push(requiredField);
        console.log(`❌ "${requiredField}" - 缺失`);
      }
    });

    console.log('');
    console.log('📊 统计结果:');
    console.log(`• 已存在字段: ${existingFields.length}/${requiredFields.length}`);
    console.log(`• 缺失字段: ${missingFields.length}`);

    if (missingFields.length > 0) {
      console.log('\n📝 需要创建的字段:');
      const fieldTypes: Record<string, string> = {
        '交易ID': 'Title',
        '交易对': 'Text',
        '方向': 'Select (做多, 做空)',
        '状态': 'Select (持仓中, 已平仓)',
        '杠杆': 'Number',
        '开仓价格': 'Number',
        '平仓价格': 'Number',
        '仓位大小': 'Number',
        '盈亏': 'Number',
        '手续费': 'Number',
        '净盈亏': 'Number',
        '收益率': 'Number',
        '持仓时长': 'Number',
        '止盈价格': 'Number',
        '止损价格': 'Number',
        '开仓时间': 'Date',
        '平仓时间': 'Date',
        '备注': 'Text'
      };

      missingFields.forEach((field, index) => {
        console.log(`${index + 1}. "${field}" - ${fieldTypes[field]}`);
      });

      console.log('\n💡 创建指南:');
      console.log('1. 在 Notion 数据库中点击 "+" 添加新列');
      console.log('2. 设置字段名称（必须完全匹配，包括空格）');
      console.log('3. 选择对应的字段类型');
      console.log('4. 对于 Select 字段，添加指定的选项');
    } else {
      console.log('\n🎉 所有必需字段都已存在！可以开始同步了。');
    }

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
    
    if (error.message.includes('Could not find database')) {
      console.log('\n💡 可能的解决方案:');
      console.log('• 检查数据库 ID 是否正确');
      console.log('• 确认集成已添加到数据库权限中');
    } else if (error.message.includes('Unauthorized')) {
      console.log('\n💡 可能的解决方案:');
      console.log('• 检查 API 令牌是否正确');
      console.log('• 确认集成权限设置');
    }
  }
}

// 运行测试
if (require.main === module) {
  testNotionDatabase().catch(console.error);
} 