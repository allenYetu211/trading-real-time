import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { IntervalType } from 'src/shared/enums';

@Entity('kline_data')
@Index(['symbol', 'interval', 'openTime'], { unique: true })
export class KlineDataEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ 
    type: 'enum', 
    enum: IntervalType 
  })
  interval: IntervalType;

  @Column({ type: 'bigint' })
  openTime: number;

  @Column({ type: 'bigint' })
  closeTime: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  openPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  highPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  lowPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  closePrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  volume: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  quoteAssetVolume: number;

  @Column({ type: 'integer' })
  numberOfTrades: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  takerBuyBaseAssetVolume: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  takerBuyQuoteAssetVolume: number;

  @CreateDateColumn()
  createdAt: Date;
} 