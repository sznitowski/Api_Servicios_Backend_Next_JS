import {
  Entity, PrimaryGeneratedColumn, ManyToOne, Column,
  CreateDateColumn, JoinColumn
} from 'typeorm';
import { ServiceRequest } from './request.entity';
import { User } from '../users/user.entity';

export type RequestStatus =
  | 'PENDING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED';

@Entity('request_transitions')
export class RequestTransition {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ServiceRequest, r => r.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor?: User | null;

  @Column({ type: 'varchar', length: 32 })
  fromStatus: RequestStatus;

  @Column({ type: 'varchar', length: 32 })
  toStatus: RequestStatus;

  // snapshots útiles
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOffered?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceAgreed?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
