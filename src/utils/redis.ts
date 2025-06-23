import Redis from 'ioredis';

import { config } from '../config';
import { logger } from './logger';

class RedisManager {
    private sharedRedisClient: Redis | null = null;

    public constructor() {}

    /**
     * Returns a singleton shared Redis client for general commands and publishing.
     */
    public getSharedRedisClient(): Redis {
        if (!this.sharedRedisClient) {
            this.sharedRedisClient = RedisManager.createNewRedisClient('shared');
        }

        return this.sharedRedisClient;
    }

    public static createNewRedisClient(connectionName: string): Redis {
        const client =  new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            maxRetriesPerRequest: null,
        });

        client.on('connect', () => {
            logger.info(`Redis ${connectionName} connection initiated successfully`);
        });

        client.on('error', (error) => {
            logger.error(`Redis ${connectionName} connection error:`, error);
        });

        client.on('close', () => {
            logger.info(`Redis ${connectionName} connection closed`);
        });

        client.on('reconnecting', () => {
            logger.info(`Redis ${connectionName} connection reconnecting`);
        });

        return client;
    }

    public async closeConnection(): Promise<void> {
        if (this.sharedRedisClient) {
            await this.sharedRedisClient.quit();
            this.sharedRedisClient = null;
            logger.info('Redis connection closed');
        }
    }
}

export const redisManager = new RedisManager();

export function getSharedRedisClient() {
    return redisManager.getSharedRedisClient()
}

export function createNewRedisClient(connectionName: string) {
    return RedisManager.createNewRedisClient(connectionName);
}