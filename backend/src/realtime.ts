import type { Server as SocketIOServer } from "socket.io";

export interface RealtimePublisher {
  emitTransactionCreated(payload: unknown): void;
  emitBalanceUpdated(payload: unknown): void;
  emitTransactionFailed(payload: unknown): void;
}

export function createRealtimePublisher(io: SocketIOServer): RealtimePublisher {
  return {
    emitTransactionCreated(payload) {
      io.emit("transaction:created", payload);
    },
    emitBalanceUpdated(payload) {
      io.emit("balance:updated", payload);
    },
    emitTransactionFailed(payload) {
      io.emit("transaction:failed", payload);
    },
  };
}
