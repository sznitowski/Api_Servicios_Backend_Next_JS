import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('ai_usage')
export class AIUsage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: true })
  user?: User | null;

  @Column({ length: 80 })
  model!: string;

  @Column({ type: 'int', default: 0 })
  promptChars!: number;

  @Column({ type: 'int', default: 0 })
  responseChars!: number;

  @Column({ length: 24 })
  status!: 'ok' | 'error';

  @Column({ type: 'int', default: 0 })
  latencyMs!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
