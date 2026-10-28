import type { CookieOptions, Response } from 'express';
import type { AppConfig } from '../types/domain.js';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  parseDurationMs,
  type SessionTokens,
} from '../services/tokenService.js';

function baseCookieOptions(config: AppConfig, path: string): CookieOptions {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path,
    domain: config.cookieDomain ?? undefined,
  };
}

export function setAuthCookies(
  response: Response,
  tokens: SessionTokens,
  config: AppConfig
): void {
  response.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(config, '/'),
    maxAge: parseDurationMs(config.accessTokenTtl),
  });
  response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(config, '/api/auth'),
    maxAge: parseDurationMs(config.refreshTokenTtl),
  });
}

export function clearAuthCookies(response: Response, config: AppConfig): void {
  response.clearCookie(ACCESS_COOKIE, baseCookieOptions(config, '/'));
  response.clearCookie(REFRESH_COOKIE, baseCookieOptions(config, '/api/auth'));
}
