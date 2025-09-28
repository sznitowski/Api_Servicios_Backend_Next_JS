// src/modules/ai/ai-usage.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('ai_usage')
export class AIUsage {
  @PrimaryGeneratedColumn()
  id: number;

  // opcional: enlazamos el uso con el usuario (si hay sesión)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'varchar', length: 120 })
  model: string;

  @Column({ type: 'int', default: 0 })
  inputTokens: number;

  @Column({ type: 'int', default: 0 })
  outputTokens: number;

  // decimal -> TypeORM lo devuelve como string (bien para $)
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  costUsd: string;

  @CreateDateColumn()
  createdAt: Date;
}
