import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import type { RealtimePublisher } from "./realtime.js";
import { accountRouter } from "./routes/account-routes.js";
import { authRouter } from "./routes/auth-routes.js";
import { dashboardRouter } from "./routes/dashboard-routes.js";
import { createTransactionRouter } from "./routes/transaction-routes.js";
import { errorHandler } from "./middleware/error-handler.js";

const noopRealtimePublisher: RealtimePublisher = {
  emitTransactionCreated() {},
  emitBalanceUpdated() {},
  emitTransactionFailed() {},
};

export function createApp(realtime: RealtimePublisher) {
  const app = express();

  const allowedOrigins = new Set(env.frontendUrls);

  const corsOrigin: cors.CorsOptions["origin"] = (origin, callback) => {
    // Allow non-browser and same-origin requests with no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  };

  const corsOptions: cors.CorsOptions = {
    origin: corsOrigin,
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
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

// Serverless entrypoint for environments like Vercel that expect a default handler export.
const app = createApp(noopRealtimePublisher);

export default app;
