import express from 'express';
import { treeRouter } from './routes/tree.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestTimeout } from './middleware/requestTimeout.js';
import { logger } from './logger.js';
import { config } from './config.js';
import { dbMetrics } from './metrics/index.js';

const app = express();

app.use(express.json());
app.use(requestTimeout(config.requestTimeoutMs));
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/metrics', (_req, res) => {
  res.json(dbMetrics.getSnapshot());
});

const API_VERSION = 'v1';
app.use(`/api/${API_VERSION}/tree`, treeRouter);

app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});

// Server-level timeout as safety net; keepAliveTimeout/headersTimeout for load balancer compatibility
server.timeout = config.requestTimeoutMs + 5000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function shutdown(): void {
  logger.info('Shutting down gracefully');
  server.close(() => {
    const { closeDb } = require('./db/connection.js');
    closeDb();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
