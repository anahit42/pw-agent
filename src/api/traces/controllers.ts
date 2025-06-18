import { Request, Response } from 'express';
import { v4 as generateUID } from 'uuid';

import { createBucketIfNotExists, uploadObject } from '../../utils/s3';
import { config } from '../../config';
import { analyzeTraceFile } from '../../agent/test-analyzer';
import { extractTraceFiles } from '../../utils/file-manager';

export async function uploadTrace (req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { bucketName } = config.s3;
    const traceId = generateUID();
    const objectName = `traces/${traceId}/original.zip`;
    const { buffer, mimetype } = req.file;

    await createBucketIfNotExists(bucketName);

    await uploadObject({
        bucketName,
        objectName,
        data: buffer,
        contentType: mimetype,
    });

    const fileBuffers = await extractTraceFiles(buffer, ['test', 'network', 'stacks'])

    for (const fileBufferKey of Object.keys(fileBuffers)) {
        const fileBuffer = fileBuffers[fileBufferKey];
        const extractedObjectName = `traces/${traceId}/${fileBufferKey}.txt`;
        const data = fileBuffer.toString('utf-8');

        await uploadObject({
            bucketName,
            objectName: extractedObjectName,
            data,
            contentType: 'text/plain',
        });
    }

    return res.status(200).json({
        message: 'Trace file uploaded and extracted successfully',
        traceId,
        originalZipPath: objectName,
        bucketName,
    });
}

export async function analyzeTrace (req: Request, res: Response) {
    const { traceId } = req.params;

    const result = await analyzeTraceFile(traceId);

    return res.status(200).json({
        message: 'Trace file analyzed successfully',
        result,
    });
}
