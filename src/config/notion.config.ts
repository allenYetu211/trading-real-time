import { registerAs } from '@nestjs/config';

export interface NotionConfig {
  apiToken: string;
  databaseId: string;
  enabled: boolean;
}

export const notionConfig = registerAs('notion', (): NotionConfig => ({
  apiToken: process.env.NOTION_API_TOKEN || '',
  databaseId: process.env.NOTION_DATABASE_ID || '',
  enabled: process.env.NOTION_ENABLED === 'true',
})); 