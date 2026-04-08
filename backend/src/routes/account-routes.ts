import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  getAccountForUser,
  listAccountsForUser,
} from "../services/account-service.js";

export const accountRouter = Router();

accountRouter.use(requireAuth);

accountRouter.get(
  "/",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const accounts = await listAccountsForUser(request.auth!.userId);
      response.json({ accounts });
    } catch (error) {
      next(error);
    }
  },
);

accountRouter.get(
  "/:accountId",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const account = await getAccountForUser(
        request.auth!.userId,
        request.params.accountId,
      );
      response.json({ account });
    } catch (error) {
      next(error);
    }
  },
);
