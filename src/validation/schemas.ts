import { z } from 'zod';

/**
 * Accepts both camelCase (parentId) and snake_case (parent_id) for API flexibility.
 * Omitted or null = root node.
 */
export const createNodeSchema = z
  .object({
    label: z.string().min(1, 'Label is required').max(500),
    parentId: z.number().int().positive().nullable().optional(),
    parent_id: z.number().int().positive().nullable().optional(),
  })
  .transform((data) => ({
    label: data.label,
    parentId: data.parentId ?? data.parent_id ?? null,
  }));

export type CreateNodeInput = z.infer<typeof createNodeSchema>;
