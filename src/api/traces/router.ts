import { Router } from 'express';
import multer, { FileFilterCallback } from 'multer';

import { analyzeTrace, uploadTrace, listTraces, getTraceWithAnalyses } from './controller';
import { BadRequestError } from '../../utils/custom-errors';
import { paginationMiddleware } from '../../middlewares/pagination';
import { analyzeRateLimiterMiddleware } from '../../middlewares/rate-limiter';

export const tracesRouter = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
            cb(null, true);
        } else {
            cb(new BadRequestError('Only .zip files are allowed'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

tracesRouter.get('/', paginationMiddleware, listTraces);
tracesRouter.post('/upload', upload.single('trace'), uploadTrace);
tracesRouter.get('/:id', getTraceWithAnalyses);
tracesRouter.post('/:id/analyze', analyzeRateLimiterMiddleware, analyzeTrace);

