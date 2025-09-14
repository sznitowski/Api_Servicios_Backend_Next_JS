// src/modules/users/user-address.entity.ts
import {
  Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, ValueTransformer,
} from 'typeorm';
import { User } from './user.entity';

const decimalToNumber: ValueTransformer = {
  to: (v?: number | null) => v,
  from: (v: string | null) => (v == null ? null : Number(v)),
};

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  // ⬇️ Conservamos el nombre EXACTO del índice que ya existe en la DB
  @Index('IDX_7a5100ce0548ef27a6f1533a5c')
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 60, nullable: true })
  label?: string | null;

  @Column({ type: 'varchar', length: 200 })
  address!: string;

  @Column({ name: 'lat', type: 'decimal', precision: 10, scale: 6, nullable: true, transformer: decimalToNumber })
  latitude?: number | null;

  @Column({ name: 'lng', type: 'decimal', precision: 10, scale: 6, nullable: true, transformer: decimalToNumber })
  longitude?: number | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
