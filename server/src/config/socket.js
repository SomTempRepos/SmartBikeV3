const { Server } = require('socket.io');
const config = require('./environment');

const createSocketServer = (server, corsOptions) => {
  const io = new Server(server, {
    cors: corsOptions,
    transports: ['websocket'],
    pingTimeout: config.SOCKET_PING_TIMEOUT,
    pingInterval: config.SOCKET_PING_INTERVAL
  });

  return io;
};

module.exports = {
  createSocketServer
};