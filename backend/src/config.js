import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  roomStake: Number(process.env.ROOM_STAKE || 1),
  waitHours: Number(process.env.WAIT_HOURS || 24),
  commissionBps: Number(process.env.COMMISSION_BPS || 500),
  commissionAddress: process.env.ADMIN_COMMISSION_ADDRESS || ""
};

if (!Number.isFinite(config.roomStake) || config.roomStake <= 0) {
  throw new Error("ROOM_STAKE must be a positive number");
}

if (!Number.isInteger(config.commissionBps) || config.commissionBps < 0 || config.commissionBps > 10000) {
  throw new Error("COMMISSION_BPS must be between 0 and 10000");
}
