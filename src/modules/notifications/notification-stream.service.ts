// src/modules/notifications/notification-stream.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class NotificationStreamService {
  private readonly log = new Logger(NotificationStreamService.name);
  private channels = new Map<number, Subject<any>>();

  getChannel(userId: number): Observable<any> {
    let ch = this.channels.get(userId);
    if (!ch) {
      ch = new Subject<any>();
      this.channels.set(userId, ch);
      this.log.debug(`SSE channel created for user ${userId}`);
    }
    return ch.asObservable();
  }

  publish(userId: number, payload: any): void {
    let ch = this.channels.get(userId);
    if (!ch) {
      ch = new Subject<any>();
      this.channels.set(userId, ch);
      this.log.debug(`SSE channel lazily created for user ${userId}`);
    }
    this.log.debug(`publish -> user ${userId}: ${JSON.stringify(payload)}`);
    ch.next(payload);
  }
}
