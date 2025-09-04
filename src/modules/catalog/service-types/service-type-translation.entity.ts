import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column, Unique } from 'typeorm';
import { ServiceType } from './service-type.entity';

@Entity('service_type_translations')
@Unique(['serviceType', 'locale'])
export class ServiceTypeTranslation {
  @PrimaryColumn({ name: 'service_type_id', type: 'int' })
  serviceTypeId: number;

  @PrimaryColumn({ length: 8 })
  locale: string;

  @ManyToOne(() => ServiceType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType: ServiceType;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;
}
