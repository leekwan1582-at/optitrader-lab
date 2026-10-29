import { Router } from 'express';
import {
  login,
  logout,
  me,
  refresh,
  register,
  updateMe,
  updatePassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateAccountSchema,
} from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(register));
router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(login));
router.post('/refresh', authLimiter, asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.get('/me', requireAuth, asyncHandler(me));
router.patch('/me', requireAuth, validateBody(updateAccountSchema), asyncHandler(updateMe));
router.post('/password', requireAuth, authLimiter, validateBody(changePasswordSchema), asyncHandler(updatePassword));

export default router;

