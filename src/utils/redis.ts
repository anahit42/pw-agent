import Redis from 'ioredis';

import { config } from '../config';
import { logger } from './logger';

class RedisManager {
    private static instance: RedisManager;
    private redisClient: Redis | null = null;

    private constructor() {}

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    public getRedisClient(): Redis {
        if (!this.redisClient) {
            this.redisClient = new Redis({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                maxRetriesPerRequest: null,
            });

            this.redisClient.on('connect', () => {
                logger.info('Redis connected successfully');
            });

            this.redisClient.on('error', (error) => {
                logger.error('Redis connection error:', error);
            });

            this.redisClient.on('close', () => {
                logger.info('Redis connection closed');
            });

            this.redisClient.on('reconnecting', () => {
                logger.info('Redis reconnecting...');
            });
        }

        return this.redisClient;
    }

    public async closeConnection(): Promise<void> {
        if (this.redisClient) {
            await this.redisClient.quit();
            this.redisClient = null;
            logger.info('Redis connection closed');
        }
    }
}

export const redisManager = RedisManager.getInstance();

export const getRedisClient = (): Redis => redisManager.getRedisClient();