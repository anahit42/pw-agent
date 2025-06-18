import express, { Request, Response } from 'express';
require('express-async-errors');
import cors from 'cors';

import { rateLimiterMiddleware } from './middlewares/rate-limiter';
import { requestLoggerMiddleware } from './middlewares/request-logger';
import { finalErrorHandlerMiddleware } from './middlewares/error-handler';
import { tracesRouter } from './api/traces/routes';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiterMiddleware);
app.use(requestLoggerMiddleware);

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount traces router
app.use('/api/traces', tracesRouter);

app.use(finalErrorHandlerMiddleware);
