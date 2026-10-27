import { Router } from 'express';
import { assistant } from '../controllers/assistantController.js';
import { assistantLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { assistantSchema } from '../schemas/domainSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/', assistantLimiter, validateBody(assistantSchema), asyncHandler(assistant));

export default router;
