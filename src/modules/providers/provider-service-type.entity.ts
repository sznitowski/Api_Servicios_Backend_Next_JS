// src/modules/providers/provider-service-type.entity.ts
import {
  Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn,
  Column, CreateDateColumn, UpdateDateColumn, Unique
} from 'typeorm';
import { ProviderProfile } from './provider-profile.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';

@Entity('provider_service_types')
@Unique(['provider', 'serviceType'])
export class ProviderServiceType {
  @PrimaryGeneratedColumn()
  id!: number;

  // 🔹 Relación correcta: ProviderProfile (no User)
  @ManyToOne(() => ProviderProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: ProviderProfile;

  @ManyToOne(() => ServiceType, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType!: ServiceType;

  // 🔹 Campo que usa tu service
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePrice!: string | null;

  @Column({ type: 'tinyint', width: 1, default: true })
  active!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
