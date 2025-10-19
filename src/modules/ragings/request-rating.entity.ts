// src/modules/request/request-rating.entity.ts
import {
  Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique,
  Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { ServiceRequest } from '../request/request.entity';
import { User } from '../users/user.entity';

@Entity('request_ratings')
@Unique('UQ_rr_request_rater', ['request', 'rater']) // 1 rating por request+rater
export class RequestRating {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ServiceRequest, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rater_id' })
  rater: User | null;

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
