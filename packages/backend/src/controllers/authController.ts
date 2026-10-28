import type { Request, Response } from 'express';
import { currentUser, getConfig } from '../utils/authContext.js';
import type { LoginInput, RegisterInput } from '@optitrader/shared';
import {
  getCurrentUser,
  issueSession,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
} from '../services/authService.js';
import { REFRESH_COOKIE } from '../services/tokenService.js';
import { clearAuthCookies, setAuthCookies } from '../utils/authCookies.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { SessionMetadata } from '../services/tokenService.js';

function sessionMetadata(request: Request): SessionMetadata {
  return {
    userAgent: request.get('user-agent'),
    ip: request.ip,
  };
}

export async function register(request: Request, response: Response): Promise<void> {
  const { user } = await registerUser(request.body as RegisterInput);
  const tokens = await issueSession(user, getConfig(request), sessionMetadata(request));
  setAuthCookies(response, tokens, getConfig(request));
  response.status(201).json({ user });
}

export async function login(request: Request, response: Response): Promise<void> {
  const { user } = await loginUser(request.body as LoginInput);
  const tokens = await issueSession(user, getConfig(request), sessionMetadata(request));
  setAuthCookies(response, tokens, getConfig(request));
  response.json({ user });
}

export async function refresh(request: Request, response: Response): Promise<void> {
  const rawRefreshToken = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh cookie is missing.');
  }

  const { user, tokens } = await refreshUserSession(
    rawRefreshToken,
    getConfig(request),
    sessionMetadata(request)
  );
  setAuthCookies(response, tokens, getConfig(request));
  response.json({ user });
}

export async function logout(request: Request, response: Response): Promise<void> {
  const rawRefreshToken = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  if (rawRefreshToken) {
    await logoutUser(rawRefreshToken, getConfig(request));
  }
  clearAuthCookies(response, getConfig(request));
  response.status(204).end();
}

export async function me(request: Request, response: Response): Promise<void> {
  const user = await getCurrentUser(currentUser(request).id);
  response.json({ user });
}
