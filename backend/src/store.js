import crypto from "node:crypto";

const rooms = new Map();
const players = new Map();

export function createRoom(player) {
  const id = crypto.randomUUID();
  const room = {
    id,
    status: "waiting",
    stake: 1,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    player1: {
      id: player.id,
      name: player.name || "Игрок 1",
      choice: null,
      paid: false
    },
    player2: null,
    winnerId: null,
    result: null
  };
  rooms.set(id, room);
  players.set(player.id, { roomId: id, playerId: 1 });
  return room;
}

export function getRoom(id) {
  return rooms.get(id) || null;
}

export function findWaitingRoom(excludePlayerId) {
  for (const room of rooms.values()) {
    if (
      room.status === "waiting" &&
      !room.player2 &&
      room.player1.id !== excludePlayerId &&
      room.expiresAt > Date.now()
    ) {
      return room;
    }
  }
  return null;
}

export function joinRoom(room, player) {
  room.player2 = {
    id: player.id,
    name: player.name || "Игрок 2",
    choice: null,
    paid: false
  };
  room.status = "playing";
  players.set(player.id, { roomId: room.id, playerId: 2 });
  return room;
}

export function setPlayerPaid(room, playerId, paid = true) {
  if (room.player1.id === playerId) room.player1.paid = paid;
  if (room.player2?.id === playerId) room.player2.paid = paid;
}

export function setChoice(room, playerId, choice) {
  const normalized = String(choice || "").toLowerCase();
  if (!["stone", "scissors", "paper"].includes(normalized)) {
    throw new Error("Invalid choice");
  }

  if (room.player1.id === playerId) room.player1.choice = normalized;
  else if (room.player2?.id === playerId) room.player2.choice = normalized;
  else throw new Error("Player is not in room");
}

export function getPlayerSlot(room, playerId) {
  if (room.player1.id === playerId) return 1;
  if (room.player2?.id === playerId) return 2;
  return null;
}

export function cleanupExpiredRooms() {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (room.status === "waiting" && room.expiresAt <= now) {
      room.status = "expired";
      rooms.delete(id);
      players.delete(room.player1.id);
    }
  }
}

export function onlineCount() {
  return players.size;
}

export function playerRoom(playerId) {
  return players.get(playerId) || null;
}
