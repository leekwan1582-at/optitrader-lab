import { Router } from 'express';
import { assistant } from '../controllers/assistantController.js';
import { assistantLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { assistantPromptSchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/', assistantLimiter, validateBody(assistantPromptSchema), asyncHandler(assistant));

export default router;
