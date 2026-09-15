const beats = {
  stone: "scissors",
  scissors: "paper",
  paper: "stone"
};

export function calculateResult(room) {
  const a = room.player1.choice;
  const b = room.player2.choice;

  if (!a || !b) return null;

  let winnerId = null;
  if (a === b) {
    return {
      type: "draw",
      winnerId: null,
      player1Choice: a,
      player2Choice: b
    };
  }

  winnerId = beats[a] === b ? room.player1.id : room.player2.id;

  return {
    type: "win",
    winnerId,
    player1Choice: a,
    player2Choice: b
  };
}
