import {
    saveTraceFile,
    findTraceFileById,
    saveTraceAnalysis,
    listTraceFiles,
    countTraceFiles,
    findTraceFileWithAnalysesById,
    deleteTraceFile,
} from './repository';
import { analyzeTraceFile } from '../../agent/test-analyzer';
import { BadRequestError, NotFoundError } from '../../utils/custom-errors';
import { deleteObject, listObjects } from '../../utils/s3';
import { config } from '../../config';

export async function createTraceFile({ id, originalFileName, originalZipPath }: { id: string; originalFileName: string; originalZipPath: string }) {
    return saveTraceFile({ id, originalFileName, originalZipPath });
}

export async function createTraceAnalysis(data: {
    traceFileId: string;
    analysisJson: any;
    analyzedAt?: Date;
}) {
    return saveTraceAnalysis(data);
}

export async function getTraceFileById(id: string) {
    return findTraceFileById(id);
}

export async function analyzeTraceById(traceFileId: string) {
    const traceFile = await findTraceFileById(traceFileId);

    if (!traceFile) {
        return null;
    }

    const result = await analyzeTraceFile(traceFile.id);

    let parsedResult;
    try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    } catch (e) {
        throw new BadRequestError('Failed to parse analysis result');
    }

    return createTraceAnalysis({
        traceFileId: traceFile.id,
        analysisJson: parsedResult,
    });
}

export async function getAllTraceFiles({ page = 1, limit = 50 }: { page?: number; limit?: number }) {
    const [traces, total] = await Promise.all([
        listTraceFiles({ page, limit }),
        countTraceFiles(),
    ]);
    return { traces, total };
}

export async function getTraceFileWithAnalysesById(id: string) {
    return findTraceFileWithAnalysesById(id);
}

export async function deleteTraceFileById(id: string) {
    const traceFile = await findTraceFileById(id);

    if (!traceFile) {
        throw new NotFoundError('Trace file not found');
    }

    const { bucketName } = config.s3;

    // Delete all associated files from S3
    const tracePrefix = `traces/${id}/`;
    const objects = await listObjects({ bucketName, prefix: tracePrefix });

    // Delete all objects with this trace prefix
    for (const objectName of objects) {
        await deleteObject({ bucketName, objectName });
    }

    // Delete from database (this will cascade delete analyses)
    await deleteTraceFile(id);
}