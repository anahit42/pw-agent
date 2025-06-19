import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';
import { AppError } from '../utils/custom-errors';

export function finalErrorHandlerMiddleware (err: Error, req: Request, res: Response, next: NextFunction) {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof AppError ? err.message : 'Internal server error';

    return res.status(statusCode).json({
        success: false,
        error: message,
        metadata: {
            timestamp: new Date().toISOString(),
            errorType: err.name,
            message: err.message
        }
    });
}