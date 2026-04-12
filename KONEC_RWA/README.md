# RWA Live Demo

Минимальный переносимый Vite + React сайт для демонстрации RWA-консалтинговой платформы с live Solana devnet MVP.

## Что внутри

- подключение Phantom wallet
- readonly загрузка уже существующего `Sale` account с devnet
- создание нового `sale` через `initializeSale`
- отображение состояния `Sale` account
- заранее подставлены:
  - Program ID: `G9acQdREqSrvNhp2hHUWYsMtfBFJJKkudAANYjM5d6DM`
  - Demo Sale PDA: `6kMtPKcCRvDP62PPjrUgDKACGb14daZZ2pwnGWNx9oAK`
  - Demo Tx: `faGUcpG7D4eFQFyW5BPZhoTPd7bAW6rt1eeuBxhVZouZGx8X8m4bcuUissZ2R8Zqb7cwtyp4kUB3zFuK4qXFoHU`

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
Без Phantom все равно можно открыть сайт и нажать `Load live demo sale`.
