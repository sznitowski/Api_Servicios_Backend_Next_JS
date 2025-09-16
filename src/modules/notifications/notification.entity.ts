// src/modules/notifications/notification.entity.ts
import {
  Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn,
  Column, Index
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
}

@Entity('notifications')
@Index(['user', 'seenAt', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  // OJO: nullable true + SET NULL para evitar FK conflict si se borra el request
  @ManyToOne(() => ServiceRequest, { nullable: true, onDelete: 'SET NULL' })
  request!: ServiceRequest | null;

  // OJO: nullable true + SET NULL
  @ManyToOne(() => RequestTransition, { nullable: true, onDelete: 'SET NULL' })
  transition!: RequestTransition | null;

  // ✅ Usamos varchar para ser compatible con SQLite en E2E y MySQL en prod
  @Column({ type: 'varchar', length: 32 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 280, nullable: true })
  message!: string | null;

  @Column({ type: 'datetime', nullable: true })
  seenAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
