import { Queue, Worker, Job, QueueOptions } from 'bullmq';
import { logger } from '../utils/logger';
import { config } from '../config';
import { redisManager } from '../utils/redis';

export interface BaseQueueManagerOptions<JobData> {
    queueName: string;
    jobName: string;
    concurrency: number;
    defaultJobOptions?: QueueOptions['defaultJobOptions'];
    jobHandler: (job: Job<JobData>) => Promise<unknown>;
}

export class BaseQueueManager<JobData> {
    private queue: Queue<JobData> | null = null;
    private worker: Worker<JobData> | null = null;
    private readonly options: BaseQueueManagerOptions<JobData>;

    constructor(options: BaseQueueManagerOptions<JobData>) {
        this.options = options;
    }

    private getQueue(): Queue<JobData> {
        if (!this.queue) {
            this.queue = new Queue(this.options.queueName, {
                connection: {
                    ...config.redis,
                    connectionName: 'queues'
                },
                defaultJobOptions: this.options.defaultJobOptions,
            });
            this.queue.on('waiting', (job: any) => {
                logger.info(`${this.options.queueName} job ${job.id} waiting`);
            });
        }
        return this.queue;
    }

    private getWorker(): Worker<JobData> {
        if (!this.worker) {
            this.worker = new Worker(
                this.options.queueName,
                this.options.jobHandler,
                {
                    connection: {
                        ...config.redis,
                        connectionName: 'queues'
                    },
                    concurrency: this.options.concurrency,
                }
            );

            this.worker.on('completed', (job: any) => {
                logger.info(`${this.options.queueName} job ${job.id} completed`);
            });

            this.worker.on('failed', async (job: any, err: Error) => {
                if (job) {
                    logger.error(`${this.options.queueName} job ${job.id} failed:`, err.message);
                    // Emit error event if this was the last attempt
                    if (job.attemptsMade >= (job.opts.attempts || 1)) {
                        try {
                            const redisClient = redisManager.getSharedRedisClient();
                            await redisClient.publish(
                                config.websocket.JOB_ERROR_CHANNEL,
                                JSON.stringify({
                                    jobType: this.options.queueName,
                                    jobId: job.data.traceId,
                                    userId: job.data.userId,
                                    status: 'error',
                                    error: err.message,
                                    jobCategory: this.options.queueName.includes('analysis') ? 'analysis' : 'extraction',
                                })
                            );
                        } catch (e) {
                            logger.error('Failed to publish job error event', e);
                        }
                    }
                }
            });

            this.worker.on('error', (err: Error) => {
                logger.error(`${this.options.queueName} worker error:`, err);
            });
        }
        return this.worker;
    }

    public initWorker() {
        return this.getWorker();
    }

    public async addJob(data: JobData, jobId: string, priority = 1): Promise<Job<any>> {
        const queue = this.getQueue();
        const existingJob = await queue.getJob(jobId);
        if (existingJob) {
            await existingJob.remove();
        }
        return await queue.add(this.options.jobName as any, data as any, {
            jobId,
            priority,
        });
    }

    public async getJobState(jobId: string): Promise<any> {
        const queue = this.getQueue();
        const job = await queue.getJob(jobId);
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

    public async cleanup(): Promise<void> {
        /**
         * Pause worker (stop consuming new jobs)
         * true = do not wait for current jobs to finish
         */
        if (this.worker) {
            await this.worker.close();
        }

        /**
         * Pause queue (stop publishing new jobs)
         */
        if (this.queue) {
            await this.queue.close();
        }
    }
}