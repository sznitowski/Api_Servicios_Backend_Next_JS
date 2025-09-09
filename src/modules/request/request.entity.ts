import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index
} from 'typeorm';
import { User } from '../users/user.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';

export type RequestStatus =
  | 'PENDING'       // creado por el cliente
  | 'OFFERED'       // proveedor “lo reclama”
  | 'ACCEPTED'      // cliente acepta al proveedor
  | 'IN_PROGRESS'   // proveedor inicia
  | 'DONE'          // completado
  | 'CANCELLED';    // cancelado

@Entity('service_requests')
@Index(['status'])
@Index(['client'])
@Index(['provider'])
@Index(['scheduledAt'])
export class ServiceRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider?: User | null;

  @ManyToOne(() => ServiceType, { eager: true })
  @JoinColumn({ name: 'service_type_id' })
  serviceType: ServiceType;

  @Column({  type: 'simple-enum', enum: ['PENDING','OFFERED','ACCEPTED','IN_PROGRESS','DONE','CANCELLED'], default: 'PENDING' })
  status: RequestStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ type: 'double', nullable: true })
  lat?: number;

  @Column({ type: 'double', nullable: true })
  lng?: number;

  @Column({ type: 'datetime', nullable: true })
  scheduledAt?: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOffered?: string | null; // texto decimal (TypeORM)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceAgreed?: string | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
