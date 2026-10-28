import { Router } from 'express';
import { login, logout, me, refresh, register } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(register));
router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(login));
router.post('/refresh', authLimiter, asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.get('/me', requireAuth, asyncHandler(me));

export default router;
