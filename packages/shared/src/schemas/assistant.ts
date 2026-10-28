import { z } from 'zod';

export const assistantPromptSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  datasets: z.array(z.object({
    id: z.string().optional(),
    dataset_id: z.string().optional(),
    name: z.string().optional(),
  })).optional(),
});

export type AssistantPromptInput = z.infer<typeof assistantPromptSchema>;
