import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import unzipper from 'unzipper';

import { downloadObject } from '../utils/s3';
import { config } from '../config';
import { logger } from '../utils/logger';

export const unzipTraceFile = tool(async ({ key }) => {
    try {
        logger.info(`Downloading Trace Zip: ${key}`);

        const zipBuffer = await downloadObject({
            bucketName: config.s3.bucketName,
            objectName: key
        });
        const directory = await unzipper.Open.buffer(zipBuffer);

        const traceEntry = directory.files.find(file =>
            file.type === 'File' && file.path.toLowerCase().includes('trace'));

        if (!traceEntry) {
            throw new Error('No trace file found in the zip archive');
        }

        const contentBuffer = await traceEntry.buffer();
        logger.info(`Extracted Trace File: ${traceEntry.path}, Size: ${contentBuffer.length} bytes`);

        return contentBuffer.toString('utf-8');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new Error(`Failed to download file from S3: ${errorMessage}`);
    }
}, {
    name: 'unzip_trace_file',
    description: 'Download Playwright trace zip file from S3, unzip it',
    schema: z.object({
        key: z.string().describe("The S3 object key (path to the file)"),
    })
})
