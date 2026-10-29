import multer from 'multer';
import { Router } from 'express';
import { create, index, preview, remove } from '../controllers/datasetController.js';
import { validateBody } from '../middleware/validate.js';
import { uploadDatasetSchema } from '@optitrader/shared';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // 50MB default limit, or read from env if available
    fileSize: (Number(process.env.MAX_UPLOAD_MB) || 50) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    // Check if filename ends with .csv or mimetype is csv/plain
    if (file.originalname.toLowerCase().endsWith('.csv') || file.mimetype.includes('csv') || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new AppError('Only .csv files are supported.', 400, 'INVALID_FILE_TYPE'));
    }
  },
});

const router = Router();

router.get('/', asyncHandler(index));
router.get('/:id/preview', asyncHandler(preview));
router.post(
  '/',
  upload.single('file'),
  validateBody(uploadDatasetSchema),
  asyncHandler(create)
);
router.delete('/:id', asyncHandler(remove));

export default router;
