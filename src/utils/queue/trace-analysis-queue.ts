import { Queue, Worker, Job } from 'bullmq';

import { config } from '../../config';
import { logger } from '../logger';
import { getRedisClient } from '../redis';
import { analyzeTraceFile } from '../../agent/test-analyzer';
import { createTraceAnalysis } from '../../api/traces/service';
import { TraceAnalysisJobData } from './types';

let analysisQueue: Queue | null = null;
let analysisWorker: Worker | null = null;

async function analysisJobHandler(job: Job<TraceAnalysisJobData>) {
    const { traceId } = job.data;

    try {
        logger.info(`Starting trace analysis, trace id: ${traceId}`);

        const result = await analyzeTraceFile(traceId);

        let parsedResult;
        try {
            parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        } catch (e) {
            throw new Error('Failed to parse analysis result');
        }

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

function getAnalysisWorker(): Worker {
    if (!analysisWorker) {
        const redis = getRedisClient();

        analysisWorker = new Worker(
            config.queue.traceAnalysisQueue.name,
            analysisJobHandler,
            {
                connection: redis,
                concurrency: config.queue.traceAnalysisQueue.concurrency,
            }
        );

        analysisWorker.on('completed', (job: Job<TraceAnalysisJobData>) => {
            logger.info(`Analysis job ${job.id} completed for trace ${job.data.traceId}`);
        });

        analysisWorker.on('failed', (job: Job<TraceAnalysisJobData> | undefined, err: Error) => {
            if (job) {
                logger.error(`Analysis job ${job.id} failed for trace ${job.data.traceId}:`, err.message);
            }
        });

        analysisWorker.on('error', (err: Error) => {
            logger.error('Analysis worker error:', err);
        });
    }

    return analysisWorker;
}

function getAnalysisQueue(): Queue {
    if (!analysisQueue) {
        const redis = getRedisClient();

        analysisQueue = new Queue(config.queue.traceAnalysisQueue.name, {
            connection: redis,
            defaultJobOptions: config.queue.traceAnalysisQueue.defaultJobOptions,
        });

        analysisQueue.on('waiting', (job: Job<TraceAnalysisJobData>) => {
            logger.info(`Analysis job ${job.id} waiting for trace ${job.data.traceId}`);
        });
    }

    return analysisQueue;
}

export function initAnalysisWorker() {
    return getAnalysisWorker();
}

export async function addAnalysisJob(data: TraceAnalysisJobData): Promise<Job<TraceAnalysisJobData>> {
    const queue = getAnalysisQueue();
    return await queue.add(config.queue.traceAnalysisQueue.jobName, data, {
        jobId: `${data.traceId}-analysis`,
        priority: 1,
    });
}

export async function getAnalysisJobState(traceId: string): Promise<any> {
    const queue = getAnalysisQueue();

    const job = await queue.getJob(`${traceId}-analysis`);

    if (!job) {
        return { status: 'not_found' };
    }

    const state = await job.getState();

    return {
        status: state,
        data: job.data,
        failedReason: job.failedReason,
    };
}

export async function cleanupAnalysisQueue(): Promise<void> {
    const worker = getAnalysisWorker();
    const queue = getAnalysisQueue();
    await worker.close();
    await queue.close();
}