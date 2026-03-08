import { Router, Request, Response } from 'express';
import { getAllTrees, createNode } from '../db/repository.js';
import { createNodeSchema } from '../validation/schemas.js';
import { getTreesQuerySchema } from '../validation/getTreesSchema.js';
import { logger } from '../logger.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';

export const treeRouter = Router();

treeRouter.use(idempotencyMiddleware);

treeRouter.get('/', (req: Request, res: Response) => {
  logger.debug('GET /api/v1/tree');
  const parsed = getTreesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw parsed.error;
  }
  const options = {
    maxDepth: parsed.data.maxDepth,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  };
  const trees = getAllTrees(options);
  res.json(trees);
});

treeRouter.post('/', (req: Request, res: Response) => {
  const parsed = createNodeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw parsed.error;
  }

  const { label, parentId } = parsed.data;
  logger.info('POST /api/v1/tree', { label, parentId });

  const node = createNode(label, parentId ?? null);
  res.status(201).json(node);
});
