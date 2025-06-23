import { Job } from 'bullmq';

import { ExtractionJobData } from './types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { extractTraceFile } from '../api/traces/service';
import { BaseQueueManager } from './base-queue-manager';
import { redisManager } from '../utils/redis';

async function extractionJobHandler (job: Job<ExtractionJobData>) {
    const { traceId, originalFileName, s3Key, userId } = job.data;

    try {
        const traceFile = await extractTraceFile({
            traceId,
            originalFileName,
            fileKey: s3Key,
        });

        // Publish event to Redis for WebSocket notification
        const redisClient = redisManager.getSharedRedisClient();
        await redisClient.publish(
          config.websocket.FILE_PROCESSED_CHANNEL,
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
