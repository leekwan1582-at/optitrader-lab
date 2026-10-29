import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'FORBIDDEN_ORIGIN',
  'NOT_FOUND',
  'EMAIL_IN_USE',
  'INVALID_CREDENTIALS',
  'TOKEN_EXPIRED',
  'REFRESH_INVALID',
  'REFRESH_REUSED',
  'RATE_LIMITED',
  'DATABASE_UNAVAILABLE',
  'DATABASE_VALIDATION_ERROR',
  'DUPLICATE_KEY',
  'INVALID_IDENTIFIER',
  'INVALID_CSV',
  'FILE_TOO_LARGE',
  'INVALID_CSV_HEADERS',
  'INVALID_PRICE_VALUES',
  'TIMESTAMPS_NOT_ORDERED',
  'DATASET_IN_USE',
  'DUPLICATE_TIMESTAMP',
  'DATASET_METADATA_REQUIRED',

  'NO_DATASETS',
  'NO_VALID_COMBINATIONS',
  'COMBINATION_CAP',
  'RUN_IN_PROGRESS',
  'RUN_NOT_CANCELLABLE',
  'RUN_CANCELLED',
  'TIMEOUT',
  'ENGINE_ERROR',
  'ENGINE_NOT_FOUND',
  'ENGINE_START_FAILED',
  'ENGINE_INVALID_OUTPUT',
  'PYTHON_NOT_FOUND',
  'INTERNAL_ERROR',
]);

export const errorResponseSchema = z.object({
  message: z.string(),
  code: errorCodeSchema.or(z.string()),
  details: z.unknown().optional(),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
