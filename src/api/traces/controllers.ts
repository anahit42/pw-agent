import { Request, Response } from 'express';
import { v4 as generateUID } from 'uuid';

import { createBucketIfNotExists, uploadObject } from '../../utils/s3';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { analyzeTraceFile } from '../../agent/test-analyzer';

export async function uploadTrace (req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { bucketName } = config.s3;
    const objectName = `traces/${generateUID()}/original.zip`;

    await createBucketIfNotExists(bucketName);

    await uploadObject({
        bucketName,
        objectName,
        data: req.file.buffer,
        contentType: req.file.mimetype
    });

    logger.info(`Trace file uploaded successfully to MinIO: ${objectName}`);

    return res.status(200).json({
        message: 'Trace file uploaded successfully',
        objectName,
        bucketName,
    });
}

export async function analyzeTrace (req: Request, res: Response) {
    const { traceFilePath } = req.body;

    const result = await analyzeTraceFile(traceFilePath);

    return res.status(200).json({
        message: 'Trace file analyzed successfully',
        result,
    });
}
