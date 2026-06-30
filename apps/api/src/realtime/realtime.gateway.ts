import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '../common/logger/logger.service';
import { SOCKET_EVENTS } from '../common/constants';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly logger: LoggerService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`, 'RealtimeGateway');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`, 'RealtimeGateway');
  }

  @SubscribeMessage('join_restaurant')
  handleJoinRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: number },
  ) {
    const room = `restaurant_${data.restaurantId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`, 'RealtimeGateway');
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave_restaurant')
  handleLeaveRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: number },
  ) {
    const room = `restaurant_${data.restaurantId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`, 'RealtimeGateway');
    return { event: 'left', room };
  }

  @SubscribeMessage('join_branch')
  handleJoinBranch(@ConnectedSocket() client: Socket, @MessageBody() data: { branchId: number }) {
    const room = `branch_${data.branchId}`;
    client.join(room);
    return { event: 'joined', room };
  }

  emitNewOrder(restaurantId: number, data: Record<string, unknown>) {
    this.server.to(`restaurant_${restaurantId}`).emit(SOCKET_EVENTS.NEW_ORDER, data);
  }

  emitOrderStatusChange(restaurantId: number, event: string, data: Record<string, unknown>) {
    this.server.to(`restaurant_${restaurantId}`).emit(event, data);
  }

  emitPaymentRequested(restaurantId: number, data: Record<string, unknown>) {
    this.server.to(`restaurant_${restaurantId}`).emit(SOCKET_EVENTS.PAYMENT_REQUESTED, data);
  }

  emitPaymentCompleted(restaurantId: number, data: Record<string, unknown>) {
    this.server.to(`restaurant_${restaurantId}`).emit(SOCKET_EVENTS.PAYMENT_COMPLETED, data);
  }

  emitReviewAdded(restaurantId: number, data: Record<string, unknown>) {
    this.server.to(`restaurant_${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_ADDED, data);
  }

  emitNotification(restaurantId: number, data: Record<string, unknown>) {
    this.server.to(`restaurant_${restaurantId}`).emit(SOCKET_EVENTS.NOTIFICATION, data);
  }
}
