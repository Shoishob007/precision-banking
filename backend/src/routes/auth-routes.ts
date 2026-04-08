import { Router } from "express";
import { loginUser, registerUser } from "../services/auth-service.js";
import { HttpError } from "../utils/http-error.js";

export const authRouter = Router();

authRouter.post("/register", async (request, response, next) => {
  try {
    const { name, email, password } = request.body ?? {};

    if (!name || !email || !password) {
      throw new HttpError(400, "name, email, and password are required.");
    }

    const result = await registerUser({ name, email, password });
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const { email, password } = request.body ?? {};

    if (!email || !password) {
      throw new HttpError(400, "email and password are required.");
    }

    const result = await loginUser({ email, password });
    response.json(result);
  } catch (error) {
    next(error);
  }
});
