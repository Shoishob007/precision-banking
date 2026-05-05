import { Router } from "express";
import {
  requireAdmin,
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import {
  getAdminSummary,
  listAdminAccounts,
  listAdminUsers,
  updateAccountStatusAsAdmin,
  updateUserRoleAsAdmin,
} from "../services/admin-service.js";
import { HttpError } from "../utils/http-error.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get(
  "/summary",
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const summary = await getAdminSummary();
      response.json(summary);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/accounts",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const page = Number(request.query.page ?? 1);
      const limit = Number(request.query.limit ?? 12);
      const query = request.query.query as string | undefined;
      const sortBy = request.query.sortBy as
        | "updated"
        | "balance"
        | "owner"
        | "account"
        | undefined;
      const sortDirection = request.query.sortDirection as
        | "asc"
        | "desc"
        | undefined;

      const accounts = await listAdminAccounts({
        page,
        limit,
        query,
        sortBy,
        sortDirection,
      });

      response.json(accounts);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/users",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const page = Number(request.query.page ?? 1);
      const limit = Number(request.query.limit ?? 8);
      const query = request.query.query as string | undefined;

      const users = await listAdminUsers({ page, limit, query });
      response.json(users);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/accounts/:accountId/status",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const { status } = request.body ?? {};

      if (!status) {
        throw new HttpError(400, "status is required.");
      }

      const account = await updateAccountStatusAsAdmin(
        request.params.accountId,
        status,
      );
      response.json({ account });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/users/:userId/role",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const { role } = request.body ?? {};

      if (!role) {
        throw new HttpError(400, "role is required.");
      }

      const user = await updateUserRoleAsAdmin(request.params.userId, role);
      response.json({ user });
    } catch (error) {
      next(error);
    }
  },
);
