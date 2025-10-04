import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';

/**
 * Estados del pedido:
 * - PENDING:     creado por el cliente, aún sin proveedor asignado.
 * - OFFERED:     un proveedor “lo reclama” y propone un precio.
 * - ACCEPTED:    el cliente acepta la oferta del proveedor.
 * - IN_PROGRESS: el proveedor marca que empezó el trabajo.
 * - DONE:        el proveedor lo completó (y se puede calificar).
 * - CANCELLED:   cancelado por alguna de las partes.
 */
export type RequestStatus =
  | 'PENDING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED';

/**
 * Tabla principal de pedidos/solicitudes de servicio.
 */
@Entity('service_requests')
@Index(['status'])                        // consultas por estado (feeds)
@Index(['client'])                        // "mis pedidos" (como cliente)
@Index(['provider'])                      // "mis trabajos" (como proveedor)
@Index(['scheduledAt'])                   // agenda / próximos
@Index(['client', 'status', 'createdAt']) // anti-duplicados recientes / listados
export class ServiceRequest {
  @PrimaryGeneratedColumn()
  id: number;

  /** Usuario que crea el pedido (cliente). */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: User;

  /** Proveedor asignado (null hasta que haya oferta/aceptación). */
  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider?: User | null;

  /** Tipo de servicio (rubro / service type). */
  @ManyToOne(() => ServiceType, { eager: true })
  @JoinColumn({ name: 'service_type_id' })
  serviceType: ServiceType;

  /** Estado del pedido (ver enum arriba). */
  @Column({
    type: 'simple-enum',
    enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
    default: 'PENDING',
  })
  status: RequestStatus;

  /** Título corto visible en listados. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  /** Descripción del problema/trabajo. */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Dirección textual (opcional si sólo guardamos lat/lng). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  /** Coordenadas del lugar del trabajo. */
  @Column({ type: 'double', nullable: true })
  lat?: number;

  @Column({ type: 'double', nullable: true })
  lng?: number;

  /** Fecha/hora programada (si el cliente agenda). */
  @Column({ type: 'datetime', nullable: true })
  scheduledAt?: Date | null;

  /**
   * Precio ofrecido por el cliente (opcional).
   * Nota: TypeORM recomienda DECIMAL como string para evitar pérdidas.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOffered?: string | null;

  /** Precio acordado final entre cliente y proveedor. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceAgreed?: string | null;

  /** Timestamps auditables. */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Tabla auxiliar para idempotencia de creación de pedidos.
 * Guarda la "Idempotency-Key" y a qué pedido quedó asociada.
 */
@Entity('request_idempotency_keys')
@Unique('UQ_request_idempotency_key', ['key']) // nombre explícito del índice único
export class RequestIdempotencyKey {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Valor exacto del header 'Idempotency-Key' (o 'X-Idempotency-Key'). */
  // ⚠️ Importante: NO ponemos @Index aquí para evitar choque con el UNIQUE.
  // El índice único ya sirve para búsquedas por `key`.
  @Column({ type: 'varchar', length: 100 })
  key!: string;

  /** Quién envió la solicitud original (para trazabilidad). */
  @ManyToOne(() => User, { eager: false, nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Pedido que resultó de esa clave idempotente. */
  @OneToOne(() => ServiceRequest, { eager: false, nullable: false })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest;

  /** Cuándo se “consumió” la clave. */
  @CreateDateColumn({ type: 'datetime', precision: 6, name: 'created_at' })
  createdAt!: Date;
}
