import { Router } from 'express';
import { create, index, remove } from '../controllers/datasetController.js';
import { validateBody } from '../middleware/validate.js';
import { uploadDatasetSchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(index));
router.post('/', validateBody(uploadDatasetSchema), asyncHandler(create));
router.delete('/:id', asyncHandler(remove));

export default router;
