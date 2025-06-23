import { Server as WebsocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

import { createNewRedisClient } from '../utils/redis';
import { logger } from '../utils/logger';
import { config } from '../config';

export function initWebsockets(httpServer: HttpServer) {
  const io = new WebsocketServer(httpServer, { cors: { origin: '*' } });

  const redisSubscriber = createNewRedisClient('websockets');

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;
    if (userId) {
      socket.join(userId);
      logger.info(`Socket ${socket.id} joined room ${userId}`);
    }
  });

  redisSubscriber.subscribe(config.websocket.ANALYSIS_COMPLETED_CHANNEL);
  redisSubscriber.subscribe(config.websocket.FILE_PROCESSED_CHANNEL);

  redisSubscriber.on('message', (channel, message) => {
    if (channel === config.websocket.FILE_PROCESSED_CHANNEL) {
      const data = JSON.parse(message);
      if (data.userId) {
        io.to(data.userId).emit('fileProcessed', data);
        logger.info(`Message sent to ${channel}`);
      }
    } else if (channel === config.websocket.ANALYSIS_COMPLETED_CHANNEL) {
      const data = JSON.parse(message);
      if (data.userId) {
        io.to(data.userId).emit('analysisCompleted', data);
        logger.info(`Message sent to ${channel}`);
      }
    }
  });
}
