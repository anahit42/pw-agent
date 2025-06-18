import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { downloadObject } from '../utils/s3';
import { config } from '../config';
import { logger } from '../utils/logger';

export const getMainTraceFile = tool(async ({ mainTraceFileKey }) => {
    try {
        logger.info(`Downloading Main Trace File: ${mainTraceFileKey}`);

        const contentBuffer = await downloadObject({
            bucketName: config.s3.bucketName,
            objectName: mainTraceFileKey,
        });
        return contentBuffer.toString('utf-8');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new Error(`Failed to download file from S3: ${errorMessage}`);
    }
}, {
    name: 'get_main_trace_file',
    description: 'Download Playwright main trace from S3',
    schema: z.object({
        mainTraceFileKey: z.string().describe('S3 key of main trace file'),
    })
});
