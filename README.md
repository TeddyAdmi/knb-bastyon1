# КНБ — Bastyon Mini App

MVP проекта «Камень Ножницы Бумага» с frontend + Node.js backend.

## Что уже есть

- Bastyon SDK подключается в frontend.
- Отображение аккаунта и баланса, если приложение запущено внутри Bastyon.
- Бесплатная игра против компьютера.
- Комната PvP за 1 PKOIN.
- Matchmaking: второй игрок может присоединиться в течение 24 часов.
- Сервер хранит состояние комнат и результаты.
- Расчёт банка: 2 PKOIN.
- Комиссия 5% от банка: 0.10 PKOIN.
- Выплата победителю: 1.90 PKOIN.
- В MVP реальная blockchain-выплата НЕ включена намеренно: payment adapter помечен TODO, чтобы сначала подключить правильный Bastyon/Pocketnet payment flow и проверить его в dev/test окружении.

## Запуск локально

```bash
cd backend
npm install
npm start
```

Frontend после этого доступен через backend на:

http://localhost:3000

## Переменные окружения

Скопируйте `.env.example` в `.env`.

```env
PORT=3000
COMMISSION_BPS=500
ROOM_STAKE=1
WAIT_HOURS=24
ADMIN_COMMISSION_ADDRESS=
```

`COMMISSION_BPS=500` означает 5%.

## Важно про реальные PKOIN

Не переводите реальные средства через этот MVP до подключения и проверки официального Bastyon/Pocketnet payment механизма.

Файл `backend/src/payments.js` специально содержит безопасный заглушечный адаптер. Его нужно заменить на реальную проверку платежа и payout после подтверждения blockchain-транзакции.

Для production также желательно добавить постоянную БД (например PostgreSQL/Supabase), а не хранить комнаты только в памяти процесса.
