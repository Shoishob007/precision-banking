import http from "node:http";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { createRealtimePublisher } from "./realtime.js";
import type { AuthTokenPayload } from "./types/domain.js";

async function main() {
  await pool.query("SELECT 1");

  const server = http.createServer();
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      next(new Error("Authentication required."));
      return;
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid or expired token."));
    }
  });

  const app = createApp(createRealtimePublisher(io));
  server.on("request", app);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    socket.emit("server:ready", { message: "Realtime channel connected." });
  });

  server.listen(env.port, () => {
    console.log(`Backend API listening on http://localhost:${env.port}`);
  });
}

main().catch((error) => {
  console.error("Failed to start backend.", error);
  process.exitCode = 1;
});
