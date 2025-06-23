import { Job } from 'bullmq';

import { ExtractionJobData } from './types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { uploadObject, downloadObject } from '../utils/s3';
import { extractTraceFiles } from '../utils/file-manager';
import { createTraceFile } from '../api/traces/service';
import { BaseQueueManager } from './base-queue-manager';
import { getSharedRedisClient } from '../utils/redis';

async function extractionJobHandler (job: Job<ExtractionJobData>) {
    logger.info(`[DEBUG] extractionJobHandler called for job: ${job.id}, data: ${JSON.stringify(job.data)}`);
    const { traceId, originalFileName, s3Key, userId } = job.data;
    const { bucketName } = config.s3;
    try {
        const zipBuffer = await downloadObject({ bucketName, objectName: s3Key });

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
        const traceFile = await createTraceFile({
            id: traceId,
            originalFileName,
            originalZipPath: s3Key,
        });

        logger.info(`Extraction completed, trace id: ${traceId}`);

        // Publish event to Redis for WebSocket notification
        const redisClient = getSharedRedisClient();
        await redisClient.publish(
          'file_processed',
          JSON.stringify({ jobId: traceId, userId, status: 'done' })
        );

        return { success: true, traceFile };
    } catch (error) {
        logger.error(`Extraction failed, trace id: ${traceId}`, error);
        throw error;
    }
}

class ZipExtractionQueue {
    private manager = new BaseQueueManager<ExtractionJobData>({
        queueName: config.queue.zipExtractionQueue.name,
        jobName: config.queue.zipExtractionQueue.jobName,
        concurrency: config.queue.zipExtractionQueue.concurrency,
        defaultJobOptions: config.queue.zipExtractionQueue.defaultJobOptions,
        jobHandler: extractionJobHandler,
    });

    public initWorker() {
        return this.manager.initWorker();
    }

    public async addJob(data: ExtractionJobData) {
        return await this.manager.addJob(data, `${data.traceId}-extraction`, 1);
    }

    public async getJobState(traceId: string) {
        return await this.manager.getJobState(`${traceId}-extraction`);
    }

    public async cleanup() {
        await this.manager.cleanup();
    }
}

export const zipExtractionQueue = new ZipExtractionQueue();
