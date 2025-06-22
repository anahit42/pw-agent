import { Queue, Worker, Job } from 'bullmq';

import { config } from '../../config';
import { logger } from '../logger';
import { uploadObject, downloadObject } from '../s3';
import { getRedisClient } from '../redis';
import { extractTraceFiles } from '../file-manager';
import { createTraceFile } from '../../api/traces/service';
import { ExtractionJobData } from './types'

let extractionQueue: Queue | null = null;
let extractionWorker: Worker | null = null;

async function extractionJobHandler(job: Job<ExtractionJobData>) {
    const { traceId, originalFileName, s3Key } = job.data;
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
        return { success: true, traceFile };
    } catch (error) {
        logger.error(`Extraction failed, trace id: ${traceId}`, error);
        throw error;
    }
}

function getExtractionWorker(): Worker {
    if  (!extractionWorker) {
        const redis = getRedisClient();

        extractionWorker = new Worker(
            config.queue.zipExtractionQueue.name,
            extractionJobHandler,
            {
                connection: redis,
                concurrency: config.queue.zipExtractionQueue.concurrency,
            }
        );

        extractionWorker.on('completed', (job: Job<ExtractionJobData>) => {
            logger.info(`Extraction job ${job.id} completed for trace ${job.data.traceId}`);
        });

        extractionWorker.on('failed', (job: Job<ExtractionJobData> | undefined, err: Error) => {
            if (job) {
                logger.error(`Extraction job ${job.id} failed for trace ${job.data.traceId}:`, err.message);
            }
        });

        extractionWorker.on('error', (err: Error) => {
            logger.error('Extraction worker error:', err);
        });

    }

    return extractionWorker;
}

function getExtractionQueue(): Queue {
    if (!extractionQueue) {
        const redis = getRedisClient();

        extractionQueue = new Queue(config.queue.zipExtractionQueue.name, {
            connection: redis,
            defaultJobOptions: config.queue.zipExtractionQueue.defaultJobOptions,
        });

        extractionQueue.on('waiting', (job: Job<ExtractionJobData>) => {
            logger.info(`Extraction job ${job.id} waiting for trace ${job.data.traceId}`);
        });
    }

    return extractionQueue;
}

export function initExtractionWorker() {
    return getExtractionWorker();
}

export async function addExtractionJob(data: ExtractionJobData): Promise<Job<ExtractionJobData>> {
    const queue = getExtractionQueue();
    return await queue.add(config.queue.zipExtractionQueue.jobName, data, {
        jobId: `${data.traceId}-extraction`,
        priority: 1,
    });
}

export async function getExtractionJobState(traceId: string): Promise<any> {
    const queue = getExtractionQueue();

    const job = await queue.getJob(`${traceId}-extraction`);

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

export async function cleanupExtractionQueue(): Promise<void> {
    const worker = getExtractionWorker();
    const queue = getExtractionQueue();
    await worker.close();
    await queue.close();
}
