import express, { Request, Response } from 'express';
require('express-async-errors');
import cors from 'cors';

import { requestLoggerMiddleware } from './middlewares/request-logger';
import { finalErrorHandlerMiddleware } from './middlewares/error-handler';
import { tracesRouter } from './api/traces/router';

export function initApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLoggerMiddleware);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  app.use('/api/traces', tracesRouter);

  app.use(finalErrorHandlerMiddleware);

  return app;
}
