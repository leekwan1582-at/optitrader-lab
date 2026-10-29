import { z } from 'zod';
import { workspaceSchema } from './domain.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  password: z.string().min(8).max(128),
  workspaceName: z.string().trim().min(2).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.email().max(160),
  password: z.string().min(1).max(128),
});

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  workspaceName: z.string().optional(),
  workspace: workspaceSchema.optional(),
});

export const sessionSchema = z.object({
  user: userSchema,
});

export const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  workspaceName: z.string(),
  sid: z.string().min(1),
  type: z.literal('access'),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(128),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password.'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match.',
  path: ['confirmNewPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password.',
  path: ['newPassword'],
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  workspaceName: z.string().trim().min(2).max(80).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

