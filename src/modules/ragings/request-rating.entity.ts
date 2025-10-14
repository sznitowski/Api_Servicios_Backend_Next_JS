// request-rating.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ServiceRequest } from '../request/request.entity';
import { User } from '../users/user.entity';

@Entity('request_ratings')
@Index('UQ_rr_request_rater', ['request', 'rater'], { unique: true })  // refleja el índice de la BD
export class RequestRating {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => ServiceRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rater_id' })
  rater: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ratee_id' })
  ratee: User | null;

  @Column({ type: 'int' }) score: number;
  @Column({ type: 'text', nullable: true }) comment?: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
