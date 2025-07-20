import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { IntervalType, PatternType } from 'src/shared/enums';

@Entity('analysis_results')
@Index(['symbol', 'interval', 'analysisTime'])
export class AnalysisResultEntity {
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
    enum: PatternType 
  })
  patternType: PatternType;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  upperLevel: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  lowerLevel: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  supportLevel: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  resistanceLevel: number;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'bigint' })
  analysisTime: number;

  @CreateDateColumn()
  createdAt: Date;
} 