import { createTraceFile, findTraceFileById, createTraceAnalysis, listTraceFiles, countTraceFiles, findTraceFileWithAnalysesById } from './repository';
import { analyzeTraceFile } from '../../agent/test-analyzer';
import { BadRequestError } from '../../utils/custom-errors';

export async function uploadTraceFile({ id, bucketName, originalZipPath }: { id: string; bucketName: string; originalZipPath: string }) {
    return createTraceFile({ id, bucketName, originalZipPath });
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