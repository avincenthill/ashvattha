import { z } from "zod";

export const getTreesQuerySchema = z.object({
  maxDepth: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional(),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional(),
});

export type GetTreesQuery = z.infer<typeof getTreesQuerySchema>;
