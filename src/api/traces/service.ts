import { createTraceFile, findTraceFileById, createTraceAnalysis } from './repository';
import { analyzeTraceFile } from '../../agent/test-analyzer';

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
        throw new Error('Failed to parse analysis result');
    }

    return createTraceAnalysis({
        traceFileId: traceFile.id,
        summary: parsedResult.summary || '',
        failedStep: parsedResult.failedStep || '',
        errorReason: parsedResult.errorReason || '',
        suggestions: parsedResult.suggestions || '',
    });
}