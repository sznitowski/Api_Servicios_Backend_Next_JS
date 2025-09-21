import {
  Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn,
  Column, Index, JoinColumn
} from 'typeorm';
import { User } from '../users/user.entity';
import { ServiceRequest } from '../request/request.entity';
import { RequestTransition } from '../request/request-transition.entity';

export enum NotificationType {
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  ADMIN_CANCEL = 'ADMIN_CANCEL',
  MESSAGE = 'MESSAGE',
}

@Entity('notifications')
@Index(['user', 'seenAt', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => ServiceRequest, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest | null;

  @ManyToOne(() => RequestTransition, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transition_id' })
  transition!: RequestTransition | null;

  @Column({ type: 'varchar', length: 32 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 280, nullable: true })
  message!: string | null;


  @Column({ type: 'datetime', nullable: true, default: null })
  seenAt!: Date | null;


  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt!: Date;
}
