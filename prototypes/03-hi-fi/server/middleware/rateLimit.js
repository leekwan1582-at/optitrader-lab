import rateLimit from 'express-rate-limit';

export const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message: 'Too many assistant requests. Try again in a few minutes.',
    code: 'RATE_LIMITED',
  },
});
