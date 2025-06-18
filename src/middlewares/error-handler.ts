import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

export function finalErrorHandlerMiddleware (err: Error, req: Request, res: Response, next: NextFunction) {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    return res.status(500).json({
        success: false,
        error: 'Internal server error',
        metadata: {
            timestamp: new Date().toISOString(),
            errorType: err.name,
            message: err.message
        }
    });
}