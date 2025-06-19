import { Router } from 'express';
import multer, { FileFilterCallback } from 'multer';

import { analyzeTrace, uploadTrace } from './controller';

export const tracesRouter = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
            cb(null, true);
        } else {
            cb(new Error('Only .zip files are allowed'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

tracesRouter.post('/upload', upload.single('trace'), uploadTrace);
tracesRouter.post('/:id/analyze', analyzeTrace);

