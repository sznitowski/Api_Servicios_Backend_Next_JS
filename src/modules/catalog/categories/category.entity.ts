import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ServiceType } from '../service-types/service-type.entity';

// + import Column ya está
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn() id: number;

  @Column({ unique: true, length: 255 })
  name: string;

  // NUEVA columna opcional
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => ServiceType, s => s.category)
  serviceTypes: ServiceType[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}