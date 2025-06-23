import { Queue, Worker, Job, QueueOptions } from 'bullmq';
import { logger } from '../utils/logger';
import { getSharedRedisClient } from '../utils/redis';

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
            const redis = getSharedRedisClient();
            this.queue = new Queue(this.options.queueName, {
                connection: redis,
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
            const redis = getSharedRedisClient();
            this.worker = new Worker(
                this.options.queueName,
                this.options.jobHandler,
                {
                    connection: redis,
                    concurrency: this.options.concurrency,
                }
            );

            this.worker.on('completed', (job: any) => {
                logger.info(`${this.options.queueName} job ${job.id} completed`);
            });

            this.worker.on('failed', (job: any, err: Error) => {
                if (job) {
                    logger.error(`${this.options.queueName} job ${job.id} failed:`, err.message);
                }
            });

            this.worker.on('ready', () => {
                logger.info(`Worker ${this.options.queueName} is ready`);
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
            await this.worker.pause(true);
            await this.worker.close(true);
        }

        /**
         * Pause queue (stop publishing new jobs)
         */
        if (this.queue) {
            await this.queue.pause();
            await this.queue.close();
        }
    }
}