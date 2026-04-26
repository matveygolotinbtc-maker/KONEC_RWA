# RWA Live Demo

Минимальный переносимый Vite + React сайт для демонстрации RWA-консалтинговой платформы с live Solana devnet MVP.

## Что внутри

- подключение Phantom wallet
- создание нового `Sale` account через новый `initializeSale`
- отображение состояния `Sale` account
- работа с новым devnet-контрактом, который поддерживает payment options, buy, finalize, cancel, claim, refund и withdraw на уровне smart contract
- заранее подставлены:
  - Program ID: `H25He6vZt9kv7z4AQYeosBifs6SMML8jynSSqFhHXVgZ`
  - Default RWA Mint: `5ziuRY49o4jUUAPPjbWZZPT68uYsk7GxX5zP2YigidSv`
  - Demo Sale PDA: будет заполнен после первого успешного `Create sale on devnet`
  - Demo Tx: будет заполнен после первого успешного `Create sale on devnet`

## Локальный запуск

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

## Лучший вариант деплоя

Для этой версии проекта самый простой вариант — **Vercel**:

1. загрузить папку в GitHub
2. импортировать репозиторий в Vercel
3. Vercel сам определит Vite-проект
4. нажать Deploy

## Альтернативы

- **Netlify** — тоже очень удобен для Vite и хорошо подходит для статических демо-сайтов
- **Cloudflare Pages** — хороший вариант, если хочешь дешёвый и быстрый edge-hosting

## Важно

Phantom подключение и live-транзакции работают только в обычном браузере с установленным Phantom.
Кнопка `Load live demo sale` начнёт работать после того, как в `src/App.tsx` будут добавлены реальные `DEMO_SALE_PDA` и `DEMO_TX` после первого успешного создания sale.
