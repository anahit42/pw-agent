import { Request, Response } from 'express';
import { v4 as generateUID } from 'uuid';

import {
    createBucketIfNotExists,
    generateOriginalTraceFilePath,
    uploadObject
} from '../../utils/s3';
import { config } from '../../config';
import { getTraceFileById, analyzeTraceById, getAllTraceFiles, getTraceFileWithAnalysesById, deleteTraceFileById } from './service';
import {BadRequestError, NotFoundError} from '../../utils/custom-errors';
import { addExtractionJob, getExtractionJobState } from '../../utils/queue/zip-extraction-queue';
import { addAnalysisJob, getAnalysisJobState } from '../../utils/queue/trace-analysis-queue';

export async function uploadTrace (req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const traceId = generateUID();
    const { buffer, mimetype, originalname } = req.file;
    const s3Key = generateOriginalTraceFilePath(traceId);

    await createBucketIfNotExists(config.s3.bucketName);
    await uploadObject({
        bucketName: config.s3.bucketName,
        objectName: s3Key,
        data: buffer,
        contentType: mimetype,
    });
    await addExtractionJob({
        traceId,
        originalFileName: originalname,
        s3Key
    });

    return res.status(202).json({
        message: 'File uploaded and extraction queued',
        traceId,
        status: 'queued'
    });
}

export async function analyzeTrace (req: Request, res: Response) {
    const { id } = req.params;

    const traceFile = await getTraceFileWithAnalysesById(id);

    if (!traceFile) {
        throw new NotFoundError('Trace file not found');
    }

    if (traceFile.analyses && traceFile.analyses.length > 0) {
        throw new BadRequestError('Analysis already exists for this trace file');
    }

    await addAnalysisJob({
        traceId: id,
    });

    return res.status(202).json({
        message: 'Analysis job queued successfully',
        traceId: id,
        status: 'queued'
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

export async function deleteTrace(req: Request, res: Response) {
    const { id } = req.params;

    await deleteTraceFileById(id);

    return res.status(200).json({
        message: 'Trace file deleted successfully',
    });
}

export async function getJobStatus(req: Request, res: Response) {
    const { id } = req.params;
    const status = await getExtractionJobState(id);

    return res.status(200).json(status);
}

export async function getAnalysisJobStatus(req: Request, res: Response) {
    const { id } = req.params;
    const status = await getAnalysisJobState(id);

    return res.status(200).json(status);
}
