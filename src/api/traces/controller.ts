import { Request, Response } from 'express';
import { v4 as generateUID } from 'uuid';

import { createBucketIfNotExists, uploadObject } from '../../utils/s3';
import { config } from '../../config';
import { extractTraceFiles } from '../../utils/file-manager';
import { uploadTraceFile, getTraceFileById, analyzeTraceById } from './service';

export async function uploadTrace (req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { bucketName } = config.s3;
    const id = generateUID();
    const objectName = `traces/${id}/original.zip`;
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
        const extractedObjectName = `traces/${id}/${fileBufferKey}.txt`;
        const data = fileBuffer.toString('utf-8');

        await uploadObject({
            bucketName,
            objectName: extractedObjectName,
            data,
            contentType: 'text/plain',
        });
    }

    // Store trace file metadata in the database via service
    const traceFile = await uploadTraceFile({
        id,
        bucketName,
        originalZipPath: objectName,
    });

    return res.status(200).json({
        message: 'Trace file uploaded and extracted successfully',
        traceId: traceFile.id,
        originalZipPath: objectName,
        bucketName,
    });
}

export async function analyzeTrace (req: Request, res: Response) {
    const { id } = req.params;

    // Use service to get and analyze trace file
    const traceFile = await getTraceFileById(id);
    if (!traceFile) {
        return res.status(404).json({ error: 'Trace file not found in database' });
    }

    try {
        const analysis = await analyzeTraceById(traceFile.id);
        return res.status(200).json({
            message: 'Trace file analyzed successfully',
            result: analysis,
        });
    } catch (e: any) {
        return res.status(500).json({ error: e.message || 'Failed to analyze trace file' });
    }
}
