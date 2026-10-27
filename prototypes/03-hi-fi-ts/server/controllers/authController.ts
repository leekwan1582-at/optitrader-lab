import type { Request, Response } from 'express';
import { getCurrentUser, loginUser, registerUser, type LoginInput, type RegisterInput } from '../services/authService.js';

export async function register(request: Request, response: Response): Promise<void> {
  const result = await registerUser(request.body as RegisterInput, request.app.locals.config);
  response.status(201).json(result);
}

export async function login(request: Request, response: Response): Promise<void> {
  const result = await loginUser(request.body as LoginInput, request.app.locals.config);
  response.json(result);
}

export async function me(request: Request, response: Response): Promise<void> {
  const user = await getCurrentUser(request.user!.id);
  response.json({ user });
}
