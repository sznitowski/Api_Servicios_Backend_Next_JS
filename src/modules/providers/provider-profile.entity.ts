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

  @Column({ length: 120, nullable: true })
  displayName?: string | null;

  @Column({ length: 32, nullable: true })
  phone?: string | null;

  @Column({ length: 512, nullable: true })
  photoUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAvg: string; // devuelve string desde MySQL

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
