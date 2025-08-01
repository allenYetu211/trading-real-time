import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN ,
  chatId: process.env.TELEGRAM_CHAT_ID || '1837336369',
  enabled: process.env.TELEGRAM_ENABLED === 'true' || !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  parseMode: 'HTML' as const, // HTML 或 Markdown
  disableWebPagePreview: true,
  disableNotification: false,
})); 


