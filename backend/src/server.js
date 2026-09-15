import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import {
  createRoom,
  getRoom,
  findWaitingRoom,
  joinRoom,
  setPlayerPaid,
  setChoice,
  getPlayerSlot,
  cleanupExpiredRooms,
  onlineCount,
  playerRoom
} from "./store.js";
import { calculateResult } from "./game.js";
import { verifyStakePayment, payoutWinner } from "./payments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../../frontend");

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

function publicRoom(room) {
  if (!room) return null;
  return {
    id: room.id,
    status: room.status,
    stake: room.stake,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    player1: {
      id: room.player1.id,
      name: room.player1.name,
      paid: room.player1.paid,
      choice: room.status === "finished" ? room.player1.choice : null
    },
    player2: room.player2
      ? {
          id: room.player2.id,
          name: room.player2.name,
          paid: room.player2.paid,
          choice: room.status === "finished" ? room.player2.choice : null
        }
      : null,
    winnerId: room.winnerId,
    result: room.result
      ? {
          type: room.result.type,
          winnerId: room.result.winnerId,
          player1Choice: room.result.player1Choice,
          player2Choice: room.result.player2Choice
        }
      : null
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "knb-backend" });
});

app.get("/api/stats", (_req, res) => {
  cleanupExpiredRooms();
  res.json({ online: onlineCount() });
});

app.post("/api/pvp/join", (req, res) => {
  cleanupExpiredRooms();

  const playerId = String(req.body.playerId || "").trim();
  const name = String(req.body.name || "Игрок").trim().slice(0, 80);

  if (!playerId) {
    return res.status(400).json({ error: "playerId is required" });
  }

  const existing = playerRoom(playerId);
  if (existing) {
    const room = getRoom(existing.roomId);
    if (room) return res.json({ room: publicRoom(room) });
  }

  let room = findWaitingRoom(playerId);

  if (!room) {
    room = createRoom({ id: playerId, name });
  } else {
    joinRoom(room, { id: playerId, name });
  }

  res.json({
    room: publicRoom(room),
    paymentRequired: !getPlayerSlot(room, playerId) || true,
    payment: {
      amount: config.roomStake,
      currency: "PKOIN",
      mode: "TODO_OFFICIAL_PAYMENT_FLOW"
    }
  });
});

app.get("/api/pvp/room/:id", (req, res) => {
  cleanupExpiredRooms();
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "ROOM_NOT_FOUND" });
  res.json({ room: publicRoom(room), online: onlineCount() });
});

app.post("/api/pvp/room/:id/payment", async (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "ROOM_NOT_FOUND" });

  const playerId = String(req.body.playerId || "").trim();
  const txid = String(req.body.txid || "").trim();

  const result = await verifyStakePayment({
    playerId,
    txid,
    expectedAmount: room.stake
  });

  if (!result.ok) {
    return res.status(501).json({
      error: "PAYMENT_NOT_CONFIGURED",
      reason: result.reason
    });
  }

  setPlayerPaid(room, playerId, true);
  res.json({ ok: true, room: publicRoom(room) });
});

app.post("/api/pvp/room/:id/choice", async (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "ROOM_NOT_FOUND" });

  const playerId = String(req.body.playerId || "").trim();
  const choice = String(req.body.choice || "").trim();

  if (!room.player2) {
    return res.status(409).json({ error: "WAITING_FOR_OPPONENT" });
  }

  // Реальные деньги нельзя пускать в игру без подтверждённых ставок.
  if (!room.player1.paid || !room.player2.paid) {
    return res.status(409).json({
      error: "STAKES_NOT_CONFIRMED",
      message: "Both stakes must be confirmed by the payment adapter."
    });
  }

  try {
    setChoice(room, playerId, choice);
  } catch {
    return res.status(400).json({ error: "INVALID_CHOICE" });
  }

  const result = calculateResult(room);

  if (result) {
    room.result = result;
    room.winnerId = result.winnerId;
    room.status = "finished";

    if (result.type === "win") {
      const totalPot = room.stake * 2;
      const commission = Math.round(totalPot * config.commissionBps) / 10000;
      const payout = totalPot - commission;

      room.payout = {
        totalPot,
        commission,
        payout,
        commissionAddress: config.commissionAddress,
        status: "pending"
      };

      // В production сначала сделать payout только после атомарной фиксации
      // результата и idempotency protection.
      const payoutResult = await payoutWinner({
        winnerId: result.winnerId,
        amount: payout
      });

      room.payout.adapterResult = payoutResult;
    }
  }

  res.json({ room: publicRoom(room) });
});

app.post("/api/pvp/room/:id/refund-check", (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "ROOM_NOT_FOUND" });

  if (room.status !== "waiting" || room.expiresAt > Date.now()) {
    return res.status(409).json({ error: "REFUND_NOT_AVAILABLE" });
  }

  res.json({
    ok: true,
    message: "Refund must be implemented in the verified payment adapter.",
    room: publicRoom(room)
  });
});

app.use(express.static(frontendPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(config.port, () => {
  console.log(`КНБ server: http://localhost:${config.port}`);
});
