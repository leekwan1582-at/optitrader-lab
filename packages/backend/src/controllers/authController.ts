import type { Request, Response } from 'express';
import { currentUser, getConfig } from '../utils/authContext.js';
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateAccountInput } from '@optitrader/shared';
import {
  changePassword,
  getCurrentUser,
  issueSession,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
  updateAccount,
} from '../services/authService.js';
import { REFRESH_COOKIE } from '../services/tokenService.js';
import { clearAuthCookies, setAuthCookies } from '../utils/authCookies.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { SessionMetadata } from '../services/tokenService.js';
import { toUserDTO } from '../serializers/index.js';
import { logger } from '../logger.js';

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
  logger.info({ userId: user.id, event: 'register_success' }, 'User registered');
  response.status(201).json({ user: toUserDTO(user) });
}

export async function login(request: Request, response: Response): Promise<void> {
  const { user } = await loginUser(request.body as LoginInput);
  const tokens = await issueSession(user, getConfig(request), sessionMetadata(request));
  setAuthCookies(response, tokens, getConfig(request));
  logger.info({ userId: user.id, event: 'login_success' }, 'User logged in');
  response.json({ user: toUserDTO(user) });
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
  response.json({ user: toUserDTO(user) });
}

export async function logout(request: Request, response: Response): Promise<void> {
  const rawRefreshToken = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  if (rawRefreshToken) {
    await logoutUser(rawRefreshToken, getConfig(request));
  }
  clearAuthCookies(response, getConfig(request));
  logger.info({ event: 'logout_success' }, 'User logged out');
  response.status(204).end();
}

export async function me(request: Request, response: Response): Promise<void> {
  const user = await getCurrentUser(currentUser(request).id);
  response.json({ user: toUserDTO(user) });
}

export async function updatePassword(request: Request, response: Response): Promise<void> {
  const userContext = currentUser(request);
  const { currentPassword, newPassword } = request.body as ChangePasswordInput;
  const { user, tokens } = await changePassword(
    userContext.id,
    currentPassword,
    newPassword,
    getConfig(request),
    sessionMetadata(request)
  );
  setAuthCookies(response, tokens, getConfig(request));
  logger.info({ userId: user.id, event: 'password_change_success' }, 'User password updated and sessions refreshed');
  response.json({ user: toUserDTO(user) });
}

export async function updateMe(request: Request, response: Response): Promise<void> {
  const userContext = currentUser(request);
  const updates = request.body as UpdateAccountInput;
  const user = await updateAccount(userContext.id, updates);
  logger.info({ userId: user.id, event: 'account_update_success' }, 'User account metadata updated');
  response.json({ user: toUserDTO(user) });
}


