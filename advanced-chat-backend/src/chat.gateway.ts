import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';

interface User {
  id: string;
  name: string;
  ws: WebSocket;
  status: 'online' | 'busy';
}

@WebSocketGateway({ cors: '*' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private users = new Map<string, User>();

  handleConnection(client: WebSocket) {
    this.logger.log(`Client connected`);
  }

  handleDisconnect(client: WebSocket) {
    const disconnectedUser = this.findUserByWs(client);
    if (disconnectedUser) {
      this.users.delete(disconnectedUser.id);
      this.logger.log(`Client disconnected: ${disconnectedUser.name}`);
      this.broadcastUserList();
    }
  }

  private findUserByWs(ws: WebSocket): User | undefined {
    for (const user of this.users.values()) {
      if (user.ws === ws) return user;
    }
    return undefined;
  }

  private generateUniqueId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private broadcastUserList() {
    const userList = Array.from(this.users.values()).map(u => ({ id: u.id, name: u.name, status: u.status }));
    const message = JSON.stringify({ event: 'user_list_update', data: { users: userList } });
    this.users.forEach(user => user.ws.send(message));
  }

  @SubscribeMessage('login')
  handleLogin(client: WebSocket, payload: { name: string }): void {
    const clientId = this.generateUniqueId();
    const newUser: User = { id: clientId, name: payload.name, ws: client, status: 'online' };
    this.users.set(clientId, newUser);
    
    this.logger.log(`User logged in: ${payload.name} (${clientId})`);
    
    const loginSuccessMsg = JSON.stringify({
        event: 'login_success',
        data: { user: { id: newUser.id, name: newUser.name, status: 'online' } }
    });
    client.send(loginSuccessMsg);

    this.broadcastUserList();
  }

  // Handler for text messages
  private handleEncryptedMessage(client: WebSocket, payload: { targetId?: string; payload: string }, eventType: string, targetType: 'general' | 'private') {
    const sender = this.findUserByWs(client);
    if (!sender) return;

    const message = {
        event: eventType,
        data: {
            sender: { id: sender.id, name: sender.name },
            target: targetType === 'general' ? 'general' : sender.id,
            payload: payload.payload, // Forward the encrypted payload
        }
    };

    if (targetType === 'general') {
        this.users.forEach(user => {
            if (user.id !== sender.id) user.ws.send(JSON.stringify(message));
        });
    } else {
        // FIX: Add a check to ensure targetId exists before using it.
        if (payload.targetId) {
            const target = this.users.get(payload.targetId);
            if (target) {
                target.ws.send(JSON.stringify(message));
            }
        }
    }
  }

  @SubscribeMessage('general_message')
  handleGeneralMessage(client: WebSocket, payload: { payload: string }): void {
    this.handleEncryptedMessage(client, payload, 'new_message', 'general');
  }

  @SubscribeMessage('private_message')
  handlePrivateMessage(client: WebSocket, payload: { targetId: string; payload: string }): void {
    this.handleEncryptedMessage(client, payload, 'new_message', 'private');
  }

  @SubscribeMessage('file_message_general')
  handleFileMessageGeneral(client: WebSocket, payload: { payload: string }): void {
    this.handleEncryptedMessage(client, payload, 'new_file_message', 'general');
  }

  @SubscribeMessage('file_message_private')
  handleFileMessagePrivate(client: WebSocket, payload: { targetId: string; payload: string }): void {
    this.handleEncryptedMessage(client, payload, 'new_file_message', 'private');
  }
  
  @SubscribeMessage('webrtc_signal')
  handleWebRtcSignal(client: WebSocket, payload: any): void {
    const sender = this.findUserByWs(client);
    const target = this.users.get(payload.targetId);

    if (!sender || !target) return;

    if (payload.type === 'offer' && target.status === 'busy') {
        sender.ws.send(JSON.stringify({ event: 'target_busy', data: { name: target.name } }));
        return;
    }
    
    if (payload.type === 'offer' || payload.type === 'answer') {
        sender.status = 'busy';
        target.status = 'busy';
        this.broadcastUserList();
    }

    const signalPayload = {
        event: 'webrtc_signal',
        data: { ...payload, sender: { id: sender.id, name: sender.name, status: sender.status } }
    };
    target.ws.send(JSON.stringify(signalPayload));
  }

  @SubscribeMessage('end_call')
  handleEndCall(client: WebSocket, payload: { targetId?: string }): void {
    const sender = this.findUserByWs(client);
    if (!sender) return;

    sender.status = 'online';

    if (payload.targetId) {
        const target = this.users.get(payload.targetId);
        if (target) {
            target.status = 'online';
            target.ws.send(JSON.stringify({ event: 'call_ended' }));
        }
    }
    
    this.broadcastUserList();
  }
}
