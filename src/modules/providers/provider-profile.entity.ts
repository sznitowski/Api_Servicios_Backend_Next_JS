import {
  Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn,
  Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('provider_profiles')
export class ProviderProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // 👇 TIPOS EXPLÍCITOS
  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAvg: string; // MySQL devuelve decimal como string

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'tinyint', width: 1, default: false })
  verified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
