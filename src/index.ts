import { createServer } from 'http';

import { config } from './config';
import { logger } from './utils/logger';
import { initApp } from './app';
import { initWebsockets } from './websocket';
import { zipExtractionQueue } from './jobs/zip-extraction-queue';
import { traceAnalysisQueue } from './jobs/trace-analysis-queue';
import { redisManager } from './utils/redis';

const { port, host } = config.server;
const app = initApp();
const httpServer = createServer(app);
initWebsockets(httpServer);
zipExtractionQueue.initWorker();
traceAnalysisQueue.initWorker();
redisManager.getSharedRedisClient();

httpServer.listen(port, host, () => {
  logger.info(`Server running at http://${host}:${port}`);
});

async function shutDown() {
  logger.info('Shutting down server gracefully...');
  await Promise.all([
    zipExtractionQueue.cleanup(),
    traceAnalysisQueue.cleanup(),
  ]);
  await redisManager.closeConnection();
}

process.on('SIGTERM', async () => {
  await shutDown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutDown();
  process.exit(0);
});

