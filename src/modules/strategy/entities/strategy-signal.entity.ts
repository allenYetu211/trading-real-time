import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { IntervalType, SignalType, StrategyType } from 'src/shared/enums';

@Entity('strategy_signals')
@Index(['symbol', 'strategyType', 'createdAt'])
export class StrategySignalEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ 
    type: 'enum', 
    enum: IntervalType 
  })
  interval: IntervalType;

  @Column({ 
    type: 'enum', 
    enum: StrategyType 
  })
  strategyType: StrategyType;

  @Column({ 
    type: 'enum', 
    enum: SignalType 
  })
  signalType: SignalType;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  price: number;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence: number;

  @Column({ type: 'text' })
  recommendation: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  upperLevel: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  lowerLevel: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  stopLoss: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  takeProfit: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'bigint' })
  timestamp: number;

  @CreateDateColumn()
  createdAt: Date;
} 