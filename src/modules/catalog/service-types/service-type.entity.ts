import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from '../categories/category.entity';

@Entity('service_types')
export class ServiceType {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ default: true }) active: boolean;

  @ManyToOne(() => Category, c => c.serviceTypes, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
