import {
  Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn,
  Column, Index, JoinColumn
} from 'typeorm';
import { ServiceRequest } from './request.entity';
import { User } from '../users/user.entity';

@Entity('request_messages')
@Index('idx_req_created', ['request', 'createdAt', 'id'])
export class RequestMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ServiceRequest, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender!: User;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt!: Date;
}
