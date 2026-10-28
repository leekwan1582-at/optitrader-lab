import { Router } from 'express';
import { create, index, remove, update } from '../controllers/profileController.js';
import { validateBody } from '../middleware/validate.js';
import { createProfileSchema, updateProfileSchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(index));
router.post('/', validateBody(createProfileSchema), asyncHandler(create));
router.put('/:id', validateBody(updateProfileSchema), asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

export default router;
