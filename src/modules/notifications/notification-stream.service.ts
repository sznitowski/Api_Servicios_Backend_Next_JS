// src/modules/notifications/notification-stream.service.ts
import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class NotificationStreamService {
  private channels = new Map<number, Subject<any>>();

  // Obtiene (o crea) el canal del usuario
  getChannel(userId: number): Observable<any> {
    if (!this.channels.has(userId)) {
      this.channels.set(userId, new Subject<any>());
    }
    return this.channels.get(userId)!.asObservable();
  }

  // Publica un payload en el canal del usuario
  publish(userId: number, payload: any) {
    if (!this.channels.has(userId)) {
      this.channels.set(userId, new Subject<any>());
    }
    this.channels.get(userId)!.next(payload);
  }
}
