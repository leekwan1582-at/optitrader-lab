import { createHmac, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import RefreshToken, { type RefreshTokenDocument } from '../models/RefreshToken.js';
import type { AppConfig, JwtPayload, User } from '../types/domain.js';
import { createId } from '../utils/ids.js';

export const ACCESS_COOKIE = 'ot_access';
export const REFRESH_COOKIE = 'ot_refresh';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  sid: string;
}

export interface SessionMetadata {
  userAgent?: string;
  ip?: string;
}

export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${value}. Use values such as 15m or 7d.`);
  }
  const amount = Number(match[1] ?? 0);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? 1000);
}

export function hashRefreshToken(token: string, config: AppConfig): string {
  return createHmac('sha256', config.jwtRefreshSecret).update(token).digest('hex');
}

export function signAccessToken(user: User, sid: string, config: AppConfig): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    workspaceName: user.workspaceName ?? '',
    sid,
    type: 'access',
  };
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: config.accessTokenTtl as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwtAccessSecret, options);
}

export async function createRefreshSession(
  userId: string,
  config: AppConfig,
  metadata: SessionMetadata = {}
): Promise<{ sid: string; refreshToken: string; expiresAt: Date }> {
  const sid = createId('sess');
  const refreshToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + parseDurationMs(config.refreshTokenTtl));

  await RefreshToken.create({
    _id: sid,
    userId,
    tokenHash: hashRefreshToken(refreshToken, config),
    expiresAt,
    createdAt: new Date(),
    revokedAt: null,
    replacedBy: null,
    userAgent: metadata.userAgent,
    ip: metadata.ip,
  });

  return { sid, refreshToken, expiresAt };
}

export async function createSession(
  user: User,
  config: AppConfig,
  metadata: SessionMetadata = {}
): Promise<SessionTokens> {
  const session = await createRefreshSession(user.id, config, metadata);
  return {
    accessToken: signAccessToken(user, session.sid, config),
    refreshToken: session.refreshToken,
    sid: session.sid,
  };
}

export async function findRefreshSession(
  rawToken: string,
  config: AppConfig
): Promise<RefreshTokenDocument | null> {
  const tokenHash = hashRefreshToken(rawToken, config);
  return RefreshToken.findOne({ tokenHash });
}

export async function revokeRefreshSession(
  rawToken: string,
  config: AppConfig,
  replacedBy?: string
): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken, config);
  await RefreshToken.updateOne(
    { tokenHash },
    { revokedAt: new Date(), replacedBy: replacedBy ?? null }
  );
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
}
