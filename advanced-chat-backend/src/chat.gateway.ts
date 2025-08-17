// src/chat.gateway.ts

import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
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
  
  // Keep track of which users are in the group call
  private groupCallUsers = new Set<string>();

  handleConnection(client: WebSocket) {
    this.logger.log('Client connected');
  }

  handleDisconnect(client: WebSocket) {
    const user = this.findUserByWs(client);
    if (user) {
      this.logger.log(`Client disconnected: ${user.name}`);
      this.users.delete(user.id);
      this.groupCallUsers.delete(user.id); // Remove from group call on disconnect
      this.broadcastUserList();
      this.broadcastGroupCallUpdate();
    }
  }

  private findUserByWs(ws: WebSocket): User | undefined {
    return Array.from(this.users.values()).find(u => u.ws === ws);
  }

  private broadcastUserList() {
    const userList = Array.from(this.users.values()).map(u => ({ id: u.id, name: u.name, status: u.status }));
    const message = JSON.stringify({ event: 'user_list_update', data: { users: userList } });
    this.users.forEach(user => user.ws.send(message));
  }
  
  private broadcastGroupCallUpdate() {
      const groupCallUserList = Array.from(this.groupCallUsers);
      const message = JSON.stringify({ event: 'group_call_update', data: { users: groupCallUserList }});
      this.users.forEach(user => user.ws.send(message));
  }

  @SubscribeMessage('login')
  handleLogin(@ConnectedSocket() client: WebSocket, @MessageBody() payload: { name: string }): void {
    const clientId = Math.random().toString(36).substring(2, 15);
    const newUser: User = { id: clientId, name: payload.name, ws: client, status: 'online' };
    this.users.set(clientId, newUser);
    
    client.send(JSON.stringify({ event: 'login_success', data: { user: newUser } }));
    this.broadcastUserList();
    this.broadcastGroupCallUpdate();
  }

  @SubscribeMessage('webrtc_signal')
  handleWebrtcSignal(@ConnectedSocket() client: WebSocket, @MessageBody() payload: { targetId: string; type: string; [key: string]: any }): void {
    const sender = this.findUserByWs(client);
    if (!sender) return;

    const target = this.users.get(payload.targetId);
    if (!target) return;

    if (payload.type === 'offer' && target.status === 'busy') {
      client.send(JSON.stringify({ event: 'target_busy', data: { name: target.name } }));
      return;
    }
    
    const message = JSON.stringify({
      event: 'webrtc_signal',
      data: { ...payload, sender: { id: sender.id, name: sender.name, status: sender.status } },
    });
    target.ws.send(message);

    if (payload.type === 'offer') {
      sender.status = 'busy';
      this.broadcastUserList();
    } else if (payload.type === 'answer') {
      sender.status = 'busy';
      target.status = 'busy';
      this.broadcastUserList();
    }
  }
  
  @SubscribeMessage('end_call')
  handleEndCall(@ConnectedSocket() client: WebSocket, @MessageBody() payload: { targetId: string }): void {
      const sender = this.findUserByWs(client);
      if (sender) sender.status = 'online';

      const target = this.users.get(payload.targetId);
      if (target) {
          target.status = 'online';
          target.ws.send(JSON.stringify({ event: 'call_ended' }));
      }
      this.broadcastUserList();
  }
  
  // --- New Group Call Logic ---

  @SubscribeMessage('join_group_call')
  handleJoinGroupCall(@ConnectedSocket() client: WebSocket): void {
      const user = this.findUserByWs(client);
      if (user && !this.groupCallUsers.has(user.id)) {
          this.groupCallUsers.add(user.id);
          this.broadcastGroupCallUpdate();
      }
  }

  @SubscribeMessage('leave_group_call')
  handleLeaveGroupCall(@ConnectedSocket() client: WebSocket): void {
      const user = this.findUserByWs(client);
      if (user && this.groupCallUsers.has(user.id)) {
          this.groupCallUsers.delete(user.id);
          this.broadcastGroupCallUpdate();
      }
  }

  @SubscribeMessage('group_call_signal')
  handleGroupCallSignal(@ConnectedSocket() client: WebSocket, @MessageBody() payload: { targetId: string, [key: string]: any }): void {
      const sender = this.findUserByWs(client);
      if (!sender) return;
      
      const target = this.users.get(payload.targetId);
      if (target) {
          target.ws.send(JSON.stringify({
              event: 'group_call_signal',
              data: { ...payload, senderId: sender.id }
          }));
      }
  }
}
