import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN || '8180533418:AAEgwymHRz2VkkZRUeVqg7S5eS9EobdD8QQ',
  chatId: process.env.TELEGRAM_CHAT_ID || '1837336369',
  enabled: process.env.TELEGRAM_ENABLED === 'true',
  parseMode: 'HTML' as const, // HTML 或 Markdown
  disableWebPagePreview: true,
  disableNotification: false,
})); 


