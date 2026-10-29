import { Router } from 'express';
import { errorLogs, health, workspace } from '../controllers/miscController.js';
import { getOpenApiSpec } from '../controllers/docsController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { errorLogQuerySchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/health', asyncHandler(health));
router.get('/docs', asyncHandler(getOpenApiSpec));
router.get('/workspace', requireAuth, asyncHandler(workspace));
router.get('/error-logs', requireAuth, validateQuery(errorLogQuerySchema), asyncHandler(errorLogs));

export default router;
