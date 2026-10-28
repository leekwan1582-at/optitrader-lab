import { z } from 'zod';
import { runStatusSchema } from './schemas/domain.js';

export const WS_EVENTS = {
  runQueued: 'run:queued',
  runProgress: 'run:progress',
  runCompleted: 'run:completed',
  runFailed: 'run:failed',
} as const;

export const runProgressEventSchema = z.object({
  event: z.literal(WS_EVENTS.runProgress),
  runId: z.string().min(1),
  completedTrials: z.number().int().nonnegative(),
  totalTrials: z.number().int().positive(),
});

export const runStatusEventSchema = z.object({
  event: z.enum([WS_EVENTS.runQueued, WS_EVENTS.runCompleted, WS_EVENTS.runFailed]),
  runId: z.string().min(1),
  status: runStatusSchema,
});

export type WsEventName = typeof WS_EVENTS[keyof typeof WS_EVENTS];
export type RunProgressEvent = z.infer<typeof runProgressEventSchema>;
export type RunStatusEvent = z.infer<typeof runStatusEventSchema>;
export type WsEvent = RunProgressEvent | RunStatusEvent;
