import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { IntervalType } from 'src/shared/enums';

@Entity('coin_configs')
@Index(['symbol', 'interval'], { unique: true })
export class CoinConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ 
    type: 'enum', 
    enum: IntervalType,
    default: IntervalType.ONE_HOUR
  })
  interval: IntervalType;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 