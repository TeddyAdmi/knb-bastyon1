/*
 * Payment adapter.
 *
 * ВАЖНО:
 * Здесь намеренно нет автоматической отправки реальных PKOIN.
 * Для production этот модуль должен:
 * 1) проверить, что ставка действительно отправлена;
 * 2) дождаться нужного blockchain confirmation;
 * 3) защититься от повторного использования одной txid;
 * 4) после результата игры сделать payout;
 * 5) отправить комиссию на commissionAddress;
 * 6) атомарно записать состояние payout в БД.
 *
 * Нельзя доверять сумме/txid, присланным только из браузера.
 */

export async function verifyStakePayment({ playerId, txid, expectedAmount }) {
  if (!txid) {
    return { ok: false, reason: "TXID_REQUIRED" };
  }

  // TODO: заменить на официальную проверку Bastyon/Pocketnet.
  return {
    ok: false,
    reason: "PAYMENT_ADAPTER_NOT_CONFIGURED",
    expectedAmount,
    playerId
  };
}

export async function payoutWinner({ winnerId, amount }) {
  // TODO: реальная blockchain payout операция.
  return {
    ok: false,
    reason: "PAYOUT_ADAPTER_NOT_CONFIGURED",
    winnerId,
    amount
  };
}
