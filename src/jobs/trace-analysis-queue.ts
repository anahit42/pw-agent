import { Job } from 'bullmq';

import { TraceAnalysisJobData } from './types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { analyzeTraceById } from '../api/traces/service';
import { BaseQueueManager } from './base-queue-manager';
import { redisManager } from '../utils/redis';

async function analysisJobHandler (job: Job<TraceAnalysisJobData>) {
    const { traceId, userId } = job.data;

    try {
        const analysis = await analyzeTraceById(traceId);

        logger.info(`Analysis completed, trace id: ${traceId}`);

        // Publish event to Redis for WebSocket notification
        const redisClient = redisManager.getSharedRedisClient();
        await redisClient.publish(
          config.websocket.ANALYSIS_COMPLETED_CHANNEL,
          JSON.stringify({ jobId: traceId, userId, status: 'done' })
        );

        return { success: true, analysis };
    } catch (error) {
        logger.error(`Analysis failed, trace id: ${traceId}`, error);
        throw error;
    }
}

class TraceAnalysisQueue {
    private manager = new BaseQueueManager<TraceAnalysisJobData>({
        queueName: config.queue.traceAnalysisQueue.name,
        jobName: config.queue.traceAnalysisQueue.jobName,
        concurrency: config.queue.traceAnalysisQueue.concurrency,
        defaultJobOptions: config.queue.traceAnalysisQueue.defaultJobOptions,
        jobHandler: analysisJobHandler,
    });

    public initWorker() {
        return this.manager.initWorker();
    }

    public async addJob(data: TraceAnalysisJobData) {
        return await this.manager.addJob(data, `${data.traceId}-analysis`, 1);
    }

    public async getJobState(traceId: string) {
        return await this.manager.getJobState(`${traceId}-analysis`);
    }

    public async cleanup() {
        await this.manager.cleanup();
    }
}

export const traceAnalysisQueue = new TraceAnalysisQueue();