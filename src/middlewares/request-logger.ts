import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export function requestLoggerMiddleware (req: Request, _res: Response, next: NextFunction) {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
    });
    return next();
}