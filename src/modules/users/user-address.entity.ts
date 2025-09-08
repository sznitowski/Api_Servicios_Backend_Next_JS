import {
  Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: User;

  // ⬇️ Tipo explícito para evitar "Object"
  @Column({ type: 'varchar', length: 64, nullable: true })
  label?: string | null; // p.ej. Casa, Trabajo

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  lat?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  lng?: string | null;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
