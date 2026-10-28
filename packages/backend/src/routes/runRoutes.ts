import { Router } from 'express';
import { compare, create, index, remove, show } from '../controllers/runController.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { compareQuerySchema, runConfigSchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(index));
router.post('/', validateBody(runConfigSchema), asyncHandler(create));
router.get('/compare', validateQuery(compareQuerySchema), asyncHandler(compare));
router.get('/:id', asyncHandler(show));
router.delete('/:id', asyncHandler(remove));

export default router;
