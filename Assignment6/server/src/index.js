import { WebSocketServer } from 'ws';
import { PORT } from './types';
import { newId } from './utils';
import { RoomManager } from './roomManager';
import { MessageHandler } from './messageHandler';
import { broadcastRoomsList } from './broadcast';
const roomManager = new RoomManager();
const messageHandler = new MessageHandler(roomManager);
const wss = new WebSocketServer({ port: PORT });
wss.on('connection', socket => {
    const clientId = newId('c');
    const client = { id: clientId, socket, name: 'Player' };
    roomManager.addClient(client);
    socket.send(JSON.stringify({ type: 'welcome', clientId }));
    broadcastRoomsList(roomManager.getRooms(), roomManager.getClients());
    socket.on('message', (data, isBinary) => {
        if (isBinary)
            return;
        try {
            const text = typeof data === 'string' ? data : data.toString();
            const parsed = JSON.parse(text);
            messageHandler.handleMessage(client, parsed);
        }
        catch (err) {
            console.warn('Invalid message received', err);
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
        }
    });
    socket.on('close', () => {
        roomManager.removeClientFromRoom(client);
        roomManager.removeClient(clientId);
        broadcastRoomsList(roomManager.getRooms(), roomManager.getClients());
    });
});
console.log(`WebSocket UNO server running on ws://localhost:${PORT}`);
