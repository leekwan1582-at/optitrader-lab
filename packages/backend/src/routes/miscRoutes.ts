import { Router } from 'express';
import { errorLogs, health, workspace } from '../controllers/miscController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/health', asyncHandler(health));
router.get('/workspace', requireAuth, asyncHandler(workspace));
router.get('/error-logs', requireAuth, asyncHandler(errorLogs));

export default router;
