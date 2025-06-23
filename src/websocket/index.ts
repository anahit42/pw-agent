import { Server as WebsocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

import { createNewRedisClient } from '../utils/redis';
import { logger } from '../utils/logger';

export function initWebsockets(httpServer: HttpServer) {
  const io = new WebsocketServer(httpServer, { cors: { origin: '*' } });

  const redisSubscriber = createNewRedisClient('websockets');
  const FILE_PROCESSED_CHANNEL = 'file_processed';

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;
    if (userId) {
      socket.join(userId);
      logger.info(`Socket ${socket.id} joined room ${userId}`);
    }
  });

  redisSubscriber.subscribe(FILE_PROCESSED_CHANNEL);

  redisSubscriber.on('message', (channel, message) => {
    if (channel === FILE_PROCESSED_CHANNEL) {
      const data = JSON.parse(message);
      if (data.userId) {
        io.to(data.userId).emit('fileProcessed', data);
        logger.info(`Message sent to ${channel}`);
      }
    }
  });
}
