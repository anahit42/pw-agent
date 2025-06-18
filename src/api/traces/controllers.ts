import { Request, Response } from 'express';

import { createBucketIfNotExists, uploadObject } from '../../utils/s3';
import { logger } from '../../utils/logger';
import { config } from '../../config';

const TRACES_BUCKET = config.s3.tracesBucketName;

export async function uploadTrace (req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const objectName = `trace-${uniqueSuffix}.zip`;

    await createBucketIfNotExists(TRACES_BUCKET);

    await uploadObject({
        bucketName: TRACES_BUCKET,
        objectName,
        data: req.file.buffer,
        contentType: req.file.mimetype
    });

    logger.info(`Trace file uploaded successfully to MinIO: ${objectName}`);

    return res.status(200).json({
        message: 'Trace file uploaded successfully',
        objectName,
        bucket: TRACES_BUCKET
    });
}
