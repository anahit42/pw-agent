import { config } from './config';
import { app } from './app';
import { logger } from './utils/logger';

const { port, host } = config.server;

app.listen(port, host, () => {
  logger.info(`🚀 Server running at http://${host}:${port}`);
});