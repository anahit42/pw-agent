import { Request, Response } from 'express';
import { v4 as generateUID } from 'uuid';

import {
    createBucketIfNotExists,
    generateOriginalTraceFilePath,
    uploadObject
} from '../../utils/s3';
import { config } from '../../config';
import { extractTraceFiles } from '../../utils/file-manager';
import { uploadTraceFile, getTraceFileById, analyzeTraceById, getAllTraceFiles, getTraceFileWithAnalysesById } from './service';
import { NotFoundError } from '../../utils/custom-errors';

export async function uploadTrace (req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { bucketName } = config.s3;
    const id = generateUID();
    const { buffer, mimetype, originalname } = req.file;
    const objectName = generateOriginalTraceFilePath(id);

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

    const traceFile = await uploadTraceFile({
        id,
        originalFileName: originalname,
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

    const traceFile = await getTraceFileById(id);

    if (!traceFile) {
        return res.status(404).json({ error: 'Trace file not found in database' });
    }

    const analysis = await analyzeTraceById(traceFile.id);

    return res.status(200).json({
        message: 'Trace file analyzed successfully',
        result: analysis,
    });
}

export async function listTraces(req: Request, res: Response) {
    const page = (req.query as any).page;
    const limit = (req.query as any).limit;
    const { traces, total } = await getAllTraceFiles({ page, limit });
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
        traces,
        total,
        page,
        limit,
        totalPages,
    });
}

export async function getTraceWithAnalyses(req: Request, res: Response) {
    const { id } = req.params;
    const traceFile = await getTraceFileWithAnalysesById(id);

    if (!traceFile) {
        throw new NotFoundError('Trace file not found');
    }

    return res.status(200).json(traceFile);
}
