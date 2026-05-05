import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  changeUserPassword,
  getUserProfile,
  updateUserProfile,
} from "../services/user-service.js";
import { HttpError } from "../utils/http-error.js";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/me", async (request: AuthenticatedRequest, response, next) => {
  try {
    const user = await getUserProfile(request.auth!.userId);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

userRouter.patch(
  "/me",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const { name, phoneNumber, jobTitle, twoFactorEnabled } =
        request.body ?? {};
      const user = await updateUserProfile(request.auth!.userId, {
        name,
        phoneNumber,
        jobTitle,
        twoFactorEnabled,
      });
      response.json({ user });
    } catch (error) {
      next(error);
    }
  },
);

userRouter.post(
  "/me/change-password",
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const { currentPassword, newPassword } = request.body ?? {};

      if (!currentPassword || !newPassword) {
        throw new HttpError(400, "currentPassword and newPassword are required.");
      }

      const result = await changeUserPassword(request.auth!.userId, {
        currentPassword,
        newPassword,
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);
