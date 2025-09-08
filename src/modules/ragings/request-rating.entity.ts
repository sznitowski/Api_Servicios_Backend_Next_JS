import {
  Entity, PrimaryGeneratedColumn, OneToOne, ManyToOne, JoinColumn,
  Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { ServiceRequest } from '../request/request.entity';
import { User } from '../users/user.entity';

@Entity('request_ratings')
export class RequestRating {
  @PrimaryGeneratedColumn()
  id: number;

  // 1 rating por request
  @OneToOne(() => ServiceRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  

  // quién califica (cliente)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rater_id' })
  rater: User | null;

  // quién recibe la calificación (proveedor)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ratee_id' })
  ratee: User | null;

  @Column({ type: 'int' })
  score: number; // 1..5

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
