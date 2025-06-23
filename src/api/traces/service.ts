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
import { NotFoundError } from '../../utils/custom-errors';
import { deleteObject, downloadObject, listObjects, uploadObject } from '../../utils/s3';
import { config } from '../../config';
import { extractTraceFiles, parseToJSON } from '../../utils/file-manager';
import { logger } from '../../utils/logger';

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

export async function extractTraceFile({
    traceId,
    fileKey,
    originalFileName,
}: {
    traceId: string;
    fileKey: string;
    originalFileName: string;
}) {
    const bucketName = config.s3.bucketName;

    const zipBuffer = await downloadObject({ bucketName, objectName: fileKey });

    logger.info(`Extracting trace files from zip, trace id: ${traceId} `);
    const fileBuffers = await extractTraceFiles(zipBuffer, ['test', 'network', 'stacks']);

    logger.info(`Uploading extracted files to S3`);
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

    logger.info(`Saving trace record to database, trace id: ${traceId}`);

    return createTraceFile({
        id: traceId,
        originalFileName,
        originalZipPath: fileKey,
    });
}

export async function analyzeTraceById(traceId: string) {
    const result = await analyzeTraceFile(traceId);
    const parsedResult = parseToJSON(result);

    logger.info(`Saving analysis result to database, trace id: ${traceId}`);
    return createTraceAnalysis({
        traceFileId: traceId,
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