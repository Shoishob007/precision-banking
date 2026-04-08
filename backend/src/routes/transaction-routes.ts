import { Router } from "express";
import type { RealtimePublisher } from "../realtime.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  createTransactionForUser,
  getTransactionByReferenceForUser,
  listTransactionsForUser,
} from "../services/transaction-service.js";
import { HttpError } from "../utils/http-error.js";

export function createTransactionRouter(realtime: RealtimePublisher) {
  const router = Router();

  router.use(requireAuth);

  router.get("/", async (request: AuthenticatedRequest, response, next) => {
    try {
      const page = Number(request.query.page ?? 1);
      const limit = Number(request.query.limit ?? 10);
      const type = request.query.type as
        | "deposit"
        | "withdraw"
        | "transfer"
        | undefined;
      const accountId = request.query.accountId as string | undefined;

      const transactions = await listTransactionsForUser(request.auth!.userId, {
        page,
        limit,
        type,
        accountId,
      });

      response.json(transactions);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/:transactionRef",
    async (request: AuthenticatedRequest, response, next) => {
      try {
        const transaction = await getTransactionByReferenceForUser(
          request.auth!.userId,
          request.params.transactionRef,
        );
        response.json({ transaction });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/", async (request: AuthenticatedRequest, response, next) => {
    try {
      const {
        type,
        amount,
        accountId,
        sourceAccountId,
        destinationAccountId,
        metadata,
      } = request.body ?? {};

      if (!type) {
        throw new HttpError(400, "type is required.");
      }

      const result = await createTransactionForUser(
        request.auth!.userId,
        {
          type,
          amount: Number(amount),
          accountId,
          sourceAccountId,
          destinationAccountId,
          metadata,
        },
        realtime,
      );

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/deposit",
    async (request: AuthenticatedRequest, response, next) => {
      try {
        const { accountId, amount, metadata } = request.body ?? {};
        const result = await createTransactionForUser(
          request.auth!.userId,
          {
            type: "deposit",
            accountId,
            amount: Number(amount),
            metadata,
          },
          realtime,
        );
        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/withdraw",
    async (request: AuthenticatedRequest, response, next) => {
      try {
        const { accountId, amount, metadata } = request.body ?? {};
        const result = await createTransactionForUser(
          request.auth!.userId,
          {
            type: "withdraw",
            accountId,
            amount: Number(amount),
            metadata,
          },
          realtime,
        );
        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/transfer",
    async (request: AuthenticatedRequest, response, next) => {
      try {
        const { sourceAccountId, destinationAccountId, amount, metadata } =
          request.body ?? {};
        const result = await createTransactionForUser(
          request.auth!.userId,
          {
            type: "transfer",
            sourceAccountId,
            destinationAccountId,
            amount: Number(amount),
            metadata,
          },
          realtime,
        );
        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
