import { Router } from 'express';
import { create, index, remove } from '../controllers/datasetController.js';
import { validateBody } from '../middleware/validate.js';
import { datasetSchema } from '../schemas/domainSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(index));
router.post('/', validateBody(datasetSchema), asyncHandler(create));
router.delete('/:id', asyncHandler(remove));

export default router;
