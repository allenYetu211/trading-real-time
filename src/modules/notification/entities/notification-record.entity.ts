export interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  symbol?: string;
  interval?: string;
  signal?: string;
  confidence?: number;
  summary?: string;
  patterns?: string;
  supportResistance?: string;
  data?: string;
  timestamp: Date;
  createdAt: Date;
} 