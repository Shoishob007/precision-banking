import type { Server as SocketIOServer } from "socket.io";

export interface RealtimePublisher {
  emitTransactionCreated(userId: string, payload: unknown): void;
  emitBalanceUpdated(userId: string, payload: unknown): void;
  emitTransactionFailed(userId: string, payload: unknown): void;
}

export function createRealtimePublisher(io: SocketIOServer): RealtimePublisher {
  return {
    emitTransactionCreated(userId, payload) {
      io.to(`user:${userId}`).emit("transaction:created", payload);
    },
    emitBalanceUpdated(userId, payload) {
      io.to(`user:${userId}`).emit("balance:updated", payload);
    },
    emitTransactionFailed(userId, payload) {
      io.to(`user:${userId}`).emit("transaction:failed", payload);
    },
  };
}
