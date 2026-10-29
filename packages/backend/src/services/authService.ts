import bcrypt from 'bcryptjs';
import type { LoginInput, RegisterInput, User, Workspace } from '@optitrader/shared';
import UserModel from '../models/User.js';
import WorkspaceModel from '../models/Workspace.js';
import type { AppConfig, WorkspaceData } from '../types/domain.js';
import { AppError } from '../utils/errors.js';
import { createId } from '../utils/ids.js';
import {
  createSession,
  findRefreshSession,
  revokeAllUserSessions,
  revokeRefreshSession,
  type SessionMetadata,
  type SessionTokens,
} from './tokenService.js';

const SALT_ROUNDS = 12;

export interface AuthResult {
  user: User;
}

export interface AuthSessionResult extends AuthResult {
  tokens: SessionTokens;
}

function workspaceToDto(workspace: WorkspaceData | null): Workspace | undefined {
  if (!workspace) return undefined;
  return {
    workspace_id: workspace._id,
    name: workspace.name,
    owner: workspace.owner,
    user: workspace.user,
  };
}

function workspaceNameFor(name: string, requested?: string): string {
  if (requested) return requested;
  return `${name.trim().replace(/\s+/g, '_')}_Research`;
}

async function userWithWorkspace(userId: string): Promise<User> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }
  const workspace = await WorkspaceModel.findOne({ user: user._id.toString() });
  return {
    ...user.toPublic(),
    workspace: workspaceToDto(workspace?.toObject() ?? null),
  };
}

export async function registerUser(
  { name, email, password, workspaceName }: RegisterInput
): Promise<AuthResult> {
  const normalizedEmail = email.toLowerCase();
  const existing = await UserModel.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError('An account with that email already exists.', 409, 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await UserModel.create({
    name,
    email: normalizedEmail,
    passwordHash,
    workspaceName: workspaceNameFor(name, workspaceName),
  });

  const workspace = await WorkspaceModel.create({
    _id: createId('ws'),
    user: user._id.toString(),
    name: user.workspaceName,
    owner: user.name,
  });

  return {
    user: {
      ...user.toPublic(),
      workspace: workspaceToDto(workspace.toObject()),
    },
  };
}

export async function loginUser({ email, password }: LoginInput): Promise<AuthResult> {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  return { user: await userWithWorkspace(user._id.toString()) };
}

export async function issueSession(
  user: User,
  config: AppConfig,
  metadata: SessionMetadata = {}
): Promise<SessionTokens> {
  return createSession(user, config, metadata);
}

export async function getCurrentUser(userId: string): Promise<User> {
  return userWithWorkspace(userId);
}

export async function refreshUserSession(
  rawRefreshToken: string,
  config: AppConfig,
  metadata: SessionMetadata = {}
): Promise<AuthSessionResult> {
  const record = await findRefreshSession(rawRefreshToken, config);
  if (!record) {
    throw new AppError('Refresh session is invalid.', 401, 'REFRESH_INVALID');
  }

  if (record.revokedAt) {
    await revokeAllUserSessions(record.userId);
    throw new AppError('Refresh token reuse detected; all sessions were revoked.', 401, 'REFRESH_REUSED');
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AppError('Refresh session has expired.', 401, 'REFRESH_INVALID');
  }

  const user = await userWithWorkspace(record.userId);
  const tokens = await createSession(user, config, metadata);
  await revokeRefreshSession(rawRefreshToken, config, tokens.sid);

  return { user, tokens };
}

export async function logoutUser(rawRefreshToken: string, config: AppConfig): Promise<void> {
  await revokeRefreshSession(rawRefreshToken, config);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await revokeAllUserSessions(userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  config: AppConfig,
  metadata: SessionMetadata = {}
): Promise<AuthSessionResult> {
  const userRecord = await UserModel.findById(userId);
  if (!userRecord) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  const matches = await bcrypt.compare(currentPassword, userRecord.passwordHash);
  if (!matches) {
    throw new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  userRecord.passwordHash = passwordHash;
  await userRecord.save();

  // Invalidate all prior sessions/devices
  await revokeAllUserSessions(userId);

  // Issue a fresh session for the current client
  const user = await userWithWorkspace(userId);
  const tokens = await createSession(user, config, metadata);

  return { user, tokens };
}

export async function updateAccount(
  userId: string,
  updates: { name?: string; workspaceName?: string }
): Promise<User> {
  const userRecord = await UserModel.findById(userId);
  if (!userRecord) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  if (updates.name) {
    userRecord.name = updates.name.trim();
  }
  if (updates.workspaceName) {
    userRecord.workspaceName = updates.workspaceName.trim();
  }
  await userRecord.save();

  if (updates.name || updates.workspaceName) {
    await WorkspaceModel.findOneAndUpdate(
      { user: userId },
      {
        ...(updates.name ? { owner: updates.name.trim() } : {}),
        ...(updates.workspaceName ? { name: updates.workspaceName.trim() } : {}),
      }
    );
  }

  return userWithWorkspace(userId);
}

