import { Router } from 'express';
import { cancel, compare, create, index, logs, remove, retry, show } from '../controllers/runController.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { compareQuerySchema, runConfigSchema, runFilterQuerySchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', validateQuery(runFilterQuerySchema), asyncHandler(index));
router.post('/', validateBody(runConfigSchema), asyncHandler(create));
router.get('/compare', validateQuery(compareQuerySchema), asyncHandler(compare));
router.get('/:id', asyncHandler(show));
router.get('/:id/logs', asyncHandler(logs));
router.post('/:id/cancel', asyncHandler(cancel));
router.post('/:id/retry', asyncHandler(retry));
router.delete('/:id', asyncHandler(remove));

export default router;
