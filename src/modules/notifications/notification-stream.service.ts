// src/modules/notifications/notification-stream.service.ts
import { Injectable } from '@nestjs/common';
import { ReplaySubject } from 'rxjs';

@Injectable()
export class NotificationStreamService {
  private channels = new Map<number, ReplaySubject<any>>();

  getChannel(userId: number): ReplaySubject<any> {
    let ch = this.channels.get(userId);
    if (!ch) {
      ch = new ReplaySubject<any>(1); // cachea el último evento
      this.channels.set(userId, ch);
    }
    return ch;
  }

  publish(userId: number, payload: any) {
    this.getChannel(userId).next(payload);
  }
}
