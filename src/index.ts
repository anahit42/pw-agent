import { config } from './config';
import { initApp } from './app';
import { logger } from './utils/logger';
import { cleanupExtractionQueue } from './utils/queue/zip-extraction-queue';
import { redisManager } from './utils/redis';

const { port, host } = config.server;
const app = initApp();

app.listen(port, host, () => {
  logger.info(`Server running at http://${host}:${port}`);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server gracefully...');
  await cleanupExtractionQueue();
  await redisManager.closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down server gracefully...');
  await cleanupExtractionQueue();
  await redisManager.closeConnection();
  process.exit(0);
});

