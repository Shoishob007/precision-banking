import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { listRecentActivity } from "../services/activity-service.js";
import { listAccountsForUser } from "../services/account-service.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/summary",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const [accounts, activity] = await Promise.all([
        listAccountsForUser(request.auth!.userId),
        listRecentActivity(request.auth!.userId, 5),
      ]);

      response.json({ accounts, activity });
    } catch (error) {
      next(error);
    }
  },
);

dashboardRouter.get(
  "/activity-feed",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const limit = Number(request.query.limit ?? 10);
      const activity = await listRecentActivity(request.auth!.userId, limit);
      response.json({ activity });
    } catch (error) {
      next(error);
    }
  },
);
