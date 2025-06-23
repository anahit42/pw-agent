import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import {
    downloadObject,
    generateMainTraceFilePath,
    generateNetworkTraceFilePath,
    generateStackTraceFilePath
} from '../utils/s3';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../utils/custom-errors';

export const getTraceFilesSchema = z.object({
    traceFileId: z.string().describe('Trace file id'),
});

export const getTraceFiles = tool(async ({ traceFileId }) => {
    try {
        logger.info(`Downloading all trace files for file: ${traceFileId}`);

        const [mainBuffer, networkBuffer, stackBuffer] = await Promise.all([
            downloadObject({
                bucketName: config.s3.bucketName,
                objectName: generateMainTraceFilePath(traceFileId),
            }),
            downloadObject({
                bucketName: config.s3.bucketName,
                objectName: generateNetworkTraceFilePath(traceFileId),
            }),
            downloadObject({
                bucketName: config.s3.bucketName,
                objectName: generateStackTraceFilePath(traceFileId),
            })
        ]);
        return {
            mainTrace: mainBuffer.toString('utf-8'),
            networkTrace: networkBuffer.toString('utf-8'),
            stackTrace: stackBuffer.toString('utf-8'),
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new AppError(`Failed to download file from S3: ${errorMessage}`, 500);
    }
}, {
    name: 'get_trace_files',
    description: 'Download Playwright trace files from S3',
    schema: getTraceFilesSchema
});

