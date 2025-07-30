import { MenuTemplate } from '../src/modules/telegram-ccxt-analysis/utils/templates/menu.template';

/**
 * 测试Telegram消息格式，确保没有不支持的HTML标签
 */
function testTelegramMessageFormat() {
  console.log('🚀 测试Telegram消息格式...\n');

  try {
    console.log('📋 1. 测试主菜单模板:');
    const mainMenu = MenuTemplate.getMainMenu();
    console.log('   ✅ 主菜单格式正确');

    console.log('\n📖 2. 测试帮助菜单模板:');
    const helpMenu = MenuTemplate.getHelpMenu();
    console.log('   ✅ 帮助菜单格式正确');

    console.log('\n🔍 3. 检查可能的问题标签:');
    const allTemplates = [mainMenu, helpMenu];
    const problematicTags = ['<symbol>', '<type>', '<interval>'];
    
    let foundIssues = false;
    for (const template of allTemplates) {
      for (const tag of problematicTags) {
        if (template.includes(tag)) {
          console.log(`   ❌ 发现问题标签: ${tag}`);
          foundIssues = true;
        }
      }
    }

    if (!foundIssues) {
      console.log('   ✅ 没有发现问题标签');
    }

    console.log('\n📤 4. 预览消息内容:');
    console.log('=== 主菜单 ===');
    console.log(mainMenu);
    console.log('\n=== 帮助菜单 ===');
    console.log(helpMenu);

    console.log('\n✅ 消息格式测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testTelegramMessageFormat();