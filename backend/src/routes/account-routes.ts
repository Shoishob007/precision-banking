import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  getAccountForUser,
  listAccountsForUser,
} from "../services/account-service.js";
import {
  listAccountMembers,
  addAccountMember,
  removeAccountMember,
  updateMemberRole,
} from "../services/account-member-service.js";
import { HttpError } from "../utils/http-error.js";

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

accountRouter.get(
  "/:accountId/members",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const members = await listAccountMembers(
        request.auth!.userId,
        request.params.accountId,
      );
      response.json({ members });
    } catch (error) {
      next(error);
    }
  },
);

accountRouter.post(
  "/:accountId/members",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const { email, role } = request.body ?? {};

      if (!email) {
        throw new HttpError(400, "email is required.");
      }

      if (!role || !["editor", "viewer"].includes(role)) {
        throw new HttpError(400, "role must be 'editor' or 'viewer'.");
      }

      const member = await addAccountMember(
        request.auth!.userId,
        request.params.accountId,
        email,
        role,
      );

      response.status(201).json({ member });
    } catch (error) {
      next(error);
    }
  },
);

accountRouter.patch(
  "/:accountId/members/:userId",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const { role } = request.body ?? {};

      if (!role || !["editor", "viewer"].includes(role)) {
        throw new HttpError(400, "role must be 'editor' or 'viewer'.");
      }

      const member = await updateMemberRole(
        request.auth!.userId,
        request.params.accountId,
        request.params.userId,
        role,
      );

      response.json({ member });
    } catch (error) {
      next(error);
    }
  },
);

accountRouter.delete(
  "/:accountId/members/:userId",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      await removeAccountMember(
        request.auth!.userId,
        request.params.accountId,
        request.params.userId,
      );

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
