import { Router } from "express";
import { pool } from "../db/pool.js";
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

      const totalsResult = await pool.query<{
        outgoing_total: string;
        incoming_total: string;
        failed_total: string;
      }>(
        `
          SELECT
            COALESCE(SUM(CASE WHEN status = 'success' AND type = 'deposit' THEN amount ELSE 0 END), 0)::text AS incoming_total,
            COALESCE(SUM(CASE WHEN status = 'success' AND type IN ('withdraw', 'transfer') THEN amount ELSE 0 END), 0)::text AS outgoing_total,
            COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0)::text AS failed_total
          FROM transactions
          WHERE initiated_by_user_id = $1
        `,
        [request.auth!.userId],
      );

      const totals = totalsResult.rows[0];
      const totalBalance = accounts.reduce(
        (sum, account) => sum + account.balance,
        0,
      );
      const lockedAccounts = accounts.filter(
        (account) => account.status === "locked",
      ).length;
      const sharedAccounts = accounts.filter((account) => account.isShared).length;
      const recommendedActions = [
        lockedAccounts > 0
          ? "Review locked accounts and unlock any that should be active."
          : null,
        sharedAccounts > 0
          ? "Audit shared-account permissions for editor access."
          : null,
        Number(totals.failed_total) > 0
          ? "Inspect failed transactions and resolve preventable issues."
          : null,
      ].filter(Boolean);

      response.json({
        accounts,
        activity,
        metrics: {
          totalBalance,
          lockedAccounts,
          sharedAccounts,
          totalAccounts: accounts.length,
          successfulInflow: Number(totals.incoming_total),
          successfulOutflow: Number(totals.outgoing_total),
          failedAmount: Number(totals.failed_total),
        },
        recommendedActions,
      });
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
