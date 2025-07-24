import { registerAs } from '@nestjs/config';

export interface OkxConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  sandbox: boolean;
  baseUrl: string;
}

export const okxConfig = registerAs('okx', (): OkxConfig => ({
  apiKey: process.env.OKX_API_KEY || '',
  secretKey: process.env.OKX_SECRET_KEY || '',
  passphrase: process.env.OKX_PASSPHRASE || '',
  sandbox: process.env.OKX_SANDBOX === 'true',
  baseUrl: process.env.OKX_SANDBOX === 'true' 
    ? 'https://www.okx.com' 
    : 'https://www.okx.com', // 实际环境也是同一个URL
})); 