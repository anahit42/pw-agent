import { Request, Response } from 'express';
import { v4 as generateUID } from 'uuid';

import { createBucketIfNotExists, uploadObject } from '../../utils/s3';
import { config } from '../../config';
import { analyzeTraceFile } from '../../agent/test-analyzer';
import { extractTraceFiles } from '../../utils/file-manager';
import { prisma } from '../../utils/db';

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

    // Store trace file metadata in the database
    const traceFile = await prisma.traceFile.create({
        data: {
            id,
            bucketName,
            originalZipPath: objectName,
        },
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

    // Find the trace file in the database
    const traceFile = await prisma.traceFile.findUnique({ where: { id } });
    if (!traceFile) {
        return res.status(404).json({ error: 'Trace file not found in database' });
    }

    const result = await analyzeTraceFile(traceFile.id);

    // Parse the result as JSON (assuming analyzeTraceFile returns a JSON string)
    let parsedResult;

    try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    } catch (e) {
        return res.status(500).json({ error: 'Failed to parse analysis result', result });
    }

    // Store analysis result in the database
    const analysis = await prisma.traceAnalysis.create({
        data: {
            traceFileId: traceFile.id,
            summary: parsedResult.summary || '',
            failedStep: parsedResult.failedStep || '',
            errorReason: parsedResult.errorReason || '',
            suggestions: parsedResult.suggestions || '',
        },
    });

    return res.status(200).json({
        message: 'Trace file analyzed successfully',
        result: analysis,
    });
}
