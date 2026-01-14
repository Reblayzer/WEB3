import { WebSocket } from 'ws';
import { sanitizeGame } from './utils';
export const broadcastRoom = (room) => {
    const { id, game } = room;
    room.sockets.forEach((c, idx) => {
        if (c.socket.readyState === WebSocket.OPEN) {
            const msg = {
                type: 'state',
                roomId: id,
                game: sanitizeGame(game),
                playerIndex: idx
            };
            c.socket.send(JSON.stringify(msg));
        }
    });
};
export const broadcastRoomsList = (rooms, clients) => {
    const list = Array.from(rooms.values()).map(r => ({
        id: r.id,
        players: r.sockets.map(c => c.name || 'Unknown'),
        awaiting: Math.max(0, r.maxPlayers - r.sockets.length),
    }));
    const msg = JSON.stringify({ type: 'room-list', rooms: list });
    clients.forEach(c => {
        if (c.socket.readyState === WebSocket.OPEN)
            c.socket.send(msg);
    });
};
