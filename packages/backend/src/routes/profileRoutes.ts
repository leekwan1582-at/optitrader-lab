import { Router } from 'express';
import { clone, create, index, remove, show, update } from '../controllers/profileController.js';
import { validateBody } from '../middleware/validate.js';
import { createProfileSchema, updateProfileSchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(index));
router.post('/', validateBody(createProfileSchema), asyncHandler(create));
router.get('/:id', asyncHandler(show));
router.put('/:id', validateBody(updateProfileSchema), asyncHandler(update));
router.post('/:id/clone', asyncHandler(clone));
router.delete('/:id', asyncHandler(remove));

export default router;

