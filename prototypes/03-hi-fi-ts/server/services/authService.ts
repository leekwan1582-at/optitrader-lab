import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import type { AppConfig, UserPublic, WorkspaceData } from '../types/domain.js';
import { AppError } from '../utils/errors.js';
import { createId } from '../utils/ids.js';
import { signToken } from '../middleware/auth.js';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  workspaceName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: UserPublic & { workspace: WorkspaceData };
}

function workspaceNameFor(name: string, requested?: string): string {
  if (requested) return requested;
  return `${name.trim().replace(/\s+/g, '_')}_Research`;
}

export async function registerUser(
  { name, email, password, workspaceName }: RegisterInput,
  config: AppConfig
): Promise<AuthResult> {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError('An account with that email already exists.', 409, 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    workspaceName: workspaceNameFor(name, workspaceName),
  });

  const workspace = await Workspace.create({
    _id: createId('ws'),
    user: user._id.toString(),
    name: user.workspaceName,
    owner: user.name,
  });

  const publicUser = user.toPublic();
  return {
    token: signToken(publicUser, config),
    user: { ...publicUser, workspace: workspace.toObject() },
  };
}

export async function loginUser(
  { email, password }: LoginInput,
  config: AppConfig
): Promise<AuthResult> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const workspace = await Workspace.findOne({ user: user._id.toString() })
    || await Workspace.findOne({ name: user.workspaceName });

  const publicUser = user.toPublic();
  return {
    token: signToken(publicUser, config),
    user: {
      ...publicUser,
      workspace: workspace
        ? workspace.toObject()
        : { name: user.workspaceName, owner: user.name },
    },
  };
}

export async function getCurrentUser(userId: string): Promise<UserPublic> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }
  return user.toPublic();
}
