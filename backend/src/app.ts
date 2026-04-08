import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import type { RealtimePublisher } from "./realtime.js";
import { accountRouter } from "./routes/account-routes.js";
import { authRouter } from "./routes/auth-routes.js";
import { dashboardRouter } from "./routes/dashboard-routes.js";
import { createTransactionRouter } from "./routes/transaction-routes.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp(realtime: RealtimePublisher) {
  const app = express();

  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/accounts", accountRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/transactions", createTransactionRouter(realtime));

  app.use(errorHandler);

  return app;
}
