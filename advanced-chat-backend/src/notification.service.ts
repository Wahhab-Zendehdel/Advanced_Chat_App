// src/notification.service.ts
import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';

@Injectable()
export class NotificationService {
  sendNotification(client: WebSocket, title: string, body: string) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        event: 'notification',
        data: { title, body },
      }));
    }
  }
}
