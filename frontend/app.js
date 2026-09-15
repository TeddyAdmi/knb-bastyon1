const state = {
  userId: null,
  name: "Гость",
  balance: null,
  roomId: null,
  mode: null,
  room: null,
  busy: false,
  timer: null
};

const $ = (id) => document.getElementById(id);

function showNotice(message) {
  $("notice").textContent = message;
  $("notice").classList.remove("hidden");
}

function hideNotice() {
  $("notice").classList.add("hidden");
}

function initials(name) {
  return String(name || "?").trim().slice(0, 1).toUpperCase() || "?";
}

async function loadBastyonUser() {
  try {
    if (window.sdk?.get?.account) {
      const account = await window.sdk.get.account();
      if (account) {
        state.userId = String(account.address || account.id || account.uid || account.n || "");
        state.name = account.name || account.nick || account.nickname || "Игрок";
      }
    }

    if (window.sdk?.get?.balance) {
      const balance = await window.sdk.get.balance();
      if (typeof balance === "number") state.balance = balance;
      else if (balance?.balance != null) state.balance = Number(balance.balance);
    }
  } catch (error) {
    console.warn("Bastyon SDK:", error);
  }

  if (!state.userId) {
    state.userId = "demo-" + crypto.randomUUID();
    state.name = "Гость";
  }

  $("nickname").textContent = state.name;
  $("avatar").textContent = initials(state.name);
  $("playerName").textContent = state.name;
  $("playerAvatar").textContent = initials(state.name);
  $("balance").textContent = state.balance == null ? "—" : state.balance.toFixed(2);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Ошибка сервера");
  }
  return data;
}

async function updateOnline() {
  try {
    const data = await api("/api/stats");
    $("online").textContent = data.online;
    $("roomOnline").textContent = data.online;
  } catch {
    $("online").textContent = "—";
  }
}

function openScreen(screen) {
  $("home").classList.toggle("hidden", screen !== "home");
  $("game").classList.toggle("hidden", screen !== "game");
}

function resetBoard() {
  $("result").classList.add("hidden");
  $("choicesArea").classList.remove("hidden");
  $("playAgain").classList.add("hidden");
}

function choiceName(choice) {
  return ({ stone: "Камень", scissors: "Ножницы", paper: "Бумага" })[choice] || choice;
}

function showResult(result, isFree = false) {
  $("result").classList.remove("hidden");
  $("choicesArea").classList.add("hidden");
  $("playAgain").classList.remove("hidden");

  if (result.type === "draw") {
    $("resultLabel").textContent = "НИЧЬЯ";
    $("resultText").textContent =
      `${choiceName(result.player1Choice)} — ${choiceName(result.player2Choice)}`;
    $("payout").classList.add("hidden");
    return;
  }

  const won = result.winnerId === state.userId;
  $("resultLabel").textContent = won ? "ПОБЕДА!" : "ПОРАЖЕНИЕ";
  $("resultText").textContent =
    `${choiceName(result.player1Choice)} против ${choiceName(result.player2Choice)}`;

  if (!isFree) {
    $("payout").classList.remove("hidden");
    $("payout").textContent = won
      ? "+1.90 PKOIN · комиссия приложения 0.10 PKOIN"
      : "Ставка проиграна";
  } else {
    $("payout").classList.add("hidden");
  }
}

function computerChoice() {
  const choices = ["stone", "scissors", "paper"];
  return choices[Math.floor(Math.random() * choices.length)];
}

function freeResult(playerChoice, aiChoice) {
  if (playerChoice === aiChoice) {
    return { type: "draw", player1Choice: playerChoice, player2Choice: aiChoice };
  }
  const wins = {
    stone: "scissors",
    scissors: "paper",
    paper: "stone"
  };
  return {
    type: "win",
    winnerId: wins[playerChoice] === aiChoice ? state.userId : "computer",
    player1Choice: playerChoice,
    player2Choice: aiChoice
  };
}

function startFreeGame() {
  state.mode = "free";
  state.room = null;
  $("gameEyebrow").textContent = "БЕСПЛАТНАЯ ИГРА";
  $("gameTitle").textContent = "Против компьютера";
  $("pot").classList.add("hidden");
  $("opponentName").textContent = "Компьютер";
  $("opponentAvatar").textContent = "AI";
  $("waiting").classList.add("hidden");
  resetBoard();
  openScreen("game");
}

async function startPvp() {
  state.mode = "pvp";
  state.busy = false;
  $("gameEyebrow").textContent = "КОМНАТА 1 PKOIN";
  $("gameTitle").textContent = "Игра против игрока";
  $("pot").classList.remove("hidden");
  $("waiting").classList.remove("hidden");
  $("board").classList.remove("hidden");
  $("choicesArea").classList.add("hidden");
  $("result").classList.add("hidden");
  $("playAgain").classList.add("hidden");
  openScreen("game");

  try {
    const data = await api("/api/pvp/join", {
      method: "POST",
      body: JSON.stringify({ playerId: state.userId, name: state.name })
    });
    state.roomId = data.room.id;
    state.room = data.room;
    renderRoom(data.room);

    if (data.paymentRequired) {
      showNotice("MVP: платёжный адаптер пока отключён. Сначала подключим официальную проверку PKOIN-транзакции.");
    }
  } catch (error) {
    showNotice(error.message);
  }
}

function renderRoom(room) {
  state.room = room;
  $("roomOnline").textContent = "—";

  const meIsP1 = room.player1?.id === state.userId;
  const me = meIsP1 ? room.player1 : room.player2;
  const opponent = meIsP1 ? room.player2 : room.player1;

  if (opponent) {
    $("opponentName").textContent = opponent.name;
    $("opponentAvatar").textContent = initials(opponent.name);
  } else {
    $("opponentName").textContent = "Ожидание...";
    $("opponentAvatar").textContent = "?";
  }

  if (room.status === "waiting") {
    $("waiting").classList.remove("hidden");
    $("choicesArea").classList.add("hidden");
  } else if (room.status === "playing") {
    $("waiting").classList.add("hidden");

    // До подключения реального payment adapter игра остаётся заблокированной.
    $("choicesArea").classList.add("hidden");
    showNotice("Соперник найден. Для реального запуска игры необходимо подтвердить обе ставки через payment adapter.");
  } else if (room.status === "finished" && room.result) {
    $("waiting").classList.add("hidden");
    showResult(room.result, false);
  }

  updateExpiry(room);
}

function updateExpiry(room) {
  clearInterval(state.timer);

  const tick = () => {
    const ms = Math.max(0, room.expiresAt - Date.now());
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    $("expires").textContent =
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  tick();
  state.timer = setInterval(tick, 1000);
}

async function pollRoom() {
  if (!state.roomId || state.mode !== "pvp") return;

  try {
    const data = await api(`/api/pvp/room/${state.roomId}`);
    renderRoom(data.room);
    $("roomOnline").textContent = data.online;
  } catch (error) {
    console.warn(error);
  }
}

$("freeRoom").addEventListener("click", startFreeGame);
$("pvpRoom").addEventListener("click", startPvp);

$("backHome").addEventListener("click", () => {
  clearInterval(state.timer);
  openScreen("home");
  hideNotice();
  updateOnline();
});

$("refreshRoom").addEventListener("click", pollRoom);

document.querySelectorAll(".choice").forEach((button) => {
  button.addEventListener("click", async () => {
    if (state.busy) return;
    state.busy = true;

    const choice = button.dataset.choice;

    if (state.mode === "free") {
      const result = freeResult(choice, computerChoice());
      showResult(result, true);
      state.busy = false;
      return;
    }

    if (state.mode === "pvp") {
      try {
        const data = await api(`/api/pvp/room/${state.roomId}/choice`, {
          method: "POST",
          body: JSON.stringify({ playerId: state.userId, choice })
        });
        renderRoom(data.room);
      } catch (error) {
        showNotice(error.message);
      } finally {
        state.busy = false;
      }
    }
  });
});

$("playAgain").addEventListener("click", () => {
  if (state.mode === "free") {
    startFreeGame();
  } else {
    startPvp();
  }
});

loadBastyonUser();
updateOnline();
setInterval(updateOnline, 5000);
setInterval(pollRoom, 3000);
