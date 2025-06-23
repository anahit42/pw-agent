import { Job } from 'bullmq';

import { TraceAnalysisJobData } from './types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { analyzeTraceFile } from '../agent/test-analyzer';
import { createTraceAnalysis } from '../api/traces/service';
import { BaseQueueManager } from './base-queue-manager';
import { parseToJSON } from '../utils/file-manager';

async function analysisJobHandler (job: Job<TraceAnalysisJobData>) {
    const { traceId } = job.data;
    try {
        logger.info(`Starting trace analysis, trace id: ${traceId}`);
        const result = await analyzeTraceFile(traceId);
        const parsedResult = parseToJSON(result);

        logger.info(`Saving analysis result to database, trace id: ${traceId}`);
        const analysis = await createTraceAnalysis({
            traceFileId: traceId,
            analysisJson: parsedResult,
        });

        logger.info(`Analysis completed, trace id: ${traceId}`);
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