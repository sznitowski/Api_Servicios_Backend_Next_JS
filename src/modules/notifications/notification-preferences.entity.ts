// src/modules/notifications/notification-preferences.entity.ts
import {
  Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, Unique
} from 'typeorm';
import { User } from '../users/user.entity';
import { NotificationType } from './notification.entity';

// Guarda preferencias por usuario: qué tipos NO quiere recibir
@Entity('notification_preferences')
@Unique(['user'])
export class NotificationPreferences {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // Lista de tipos silenciados (guardado como JSON en MySQL/SQLite)
  @Column({ type: 'text', nullable: true })
  disabledTypesJson!: string | null;

  // Helpers para mapear a array tipado
  get disabledTypes(): NotificationType[] {
    try {
      return this.disabledTypesJson ? JSON.parse(this.disabledTypesJson) : [];
    } catch {
      return [];
    }
  }
  set disabledTypes(v: NotificationType[]) {
    this.disabledTypesJson = (v && v.length) ? JSON.stringify(v) : null;
  }
}
