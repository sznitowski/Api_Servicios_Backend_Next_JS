import {
  Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column,
  Unique
} from 'typeorm';
import { ProviderProfile } from './provider-profile.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';

@Entity('provider_service_types')
@Unique(['provider', 'serviceType'])
export class ProviderServiceType {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProviderProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: ProviderProfile;

  @ManyToOne(() => ServiceType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType: ServiceType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePrice?: string | null;

  @Column({ default: true })
  active: boolean;
}
