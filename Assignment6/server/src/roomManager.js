import { MIN_PLAYERS, MAX_PLAYERS } from './types';
import { newId } from './utils';
import { createGame, waitingGame } from './game';
import { broadcastRoom, broadcastRoomsList } from './broadcast';
export class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.clients = new Map();
    }
    getRoom(id) {
        return this.rooms.get(id);
    }
    getRooms() {
        return this.rooms;
    }
    getClients() {
        return this.clients;
    }
    addClient(client) {
        this.clients.set(client.id, client);
    }
    removeClient(clientId) {
        this.clients.delete(clientId);
    }
    createRoom(creator, maxPlayers) {
        const id = newId('room');
        const clampedMax = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, maxPlayers || MAX_PLAYERS));
        const room = {
            id,
            game: waitingGame([creator.name || 'Player']),
            sockets: [creator],
            maxPlayers: clampedMax,
            creatorId: creator.id,
        };
        creator.roomId = id;
        this.rooms.set(id, room);
        broadcastRoomsList(this.rooms, this.clients);
        broadcastRoom(room);
    }
    joinRoom(client, roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            client.socket.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
        }
        if (room.sockets.length >= room.maxPlayers || room.game.winner !== undefined) {
            client.socket.send(JSON.stringify({ type: 'error', message: 'Room full or finished' }));
            return;
        }
        room.sockets.push(client);
        client.roomId = roomId;
        room.game = waitingGame(room.sockets.map(c => c.name || 'Player'));
        broadcastRoomsList(this.rooms, this.clients);
        broadcastRoom(room);
    }
    startGame(room) {
        const humanNames = room.sockets.map(c => c.name || 'Player');
        room.game = createGame(humanNames);
    }
    removeClientFromRoom(client) {
        const roomId = client.roomId;
        if (!roomId)
            return;
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        room.sockets = room.sockets.filter(c => c !== client);
        if (room.sockets.length === 0) {
            this.rooms.delete(roomId);
        }
        else {
            const humanNames = room.sockets.map(c => c.name || 'Player');
            room.game = waitingGame(humanNames);
            broadcastRoom(room);
        }
    }
    updateClientName(client, name) {
        client.name = name || 'Player';
        broadcastRoomsList(this.rooms, this.clients);
        if (client.roomId) {
            const room = this.rooms.get(client.roomId);
            if (room) {
                const humanNames = room.sockets.map(c => c.name || 'Player');
                room.game = waitingGame(humanNames);
                broadcastRoom(room);
            }
        }
    }
}
