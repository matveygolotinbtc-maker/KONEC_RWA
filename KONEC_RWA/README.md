# RWA Live Demo

Минимальный переносимый Vite + React сайт для демонстрации RWA-консалтинговой платформы с live Solana devnet MVP.

## Текущий статус

Сайт уже подключён к новому devnet-контракту и умеет:

- подключать Phantom wallet;
- создавать новый `Sale` account через `initializeSale`;
- загружать существующий demo sale;
- читать и отображать состояние `Sale` account с devnet;
- показывать proof через Solana Explorer.

## Текущие on-chain значения

- Program ID: `H25He6vZt9kv7z4AQYeosBifs6SMML8jynSSqFhHXVgZ`
- Default RWA Mint: `5ziuRY49o4jUUAPPjbWZZPT68uYsk7GxX5zP2YigidSv`
- Demo Sale PDA: `5gHnjckzDHtdcKKcpgYWfLsiSsmB5khtrRU3osnrTRvP`
- Demo Tx: `2gFAiV2NhWb2aMrR22iRXYvFrUkL4CwKSkKYvzYP4k51x5QJv4XWt3RarAUDmhEfhVNf1M8PF1K59CPogBwiVtrP`
- Demo Sale ID: `1`
- Total Supply: `1000`
- Soft Cap: `500`
- Status: `Active`

## Что поддерживает контракт

По IDL контракт поддерживает следующие инструкции:

- `initializeSale`
- `addPaymentOption`
- `buy`
- `finalizeSale`
- `cancelSale`
- `claimRwa`
- `refundPayment`
- `withdrawProceeds`
- `returnMintAuthority`

Сейчас frontend показывает рабочий MVP для `initializeSale` и чтения `Sale` state. Следующий этап — добавить полноценный investor flow: payment option, purchase, finalize, claim/refund.

## Локальный запуск

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

## Деплой

Проект рассчитан на Vercel:

1. изменения пушатся в GitHub;
2. Vercel автоматически запускает build;
3. после успешного deploy сайт можно тестировать в браузере с Phantom;
4. Phantom должен быть переключён на Devnet.

## Важно

Phantom подключение и live-транзакции работают только в обычном браузере с установленным Phantom.
Для повторного создания sale нельзя использовать уже занятый `Sale ID` с тем же admin wallet. Для новых тестов меняй `Sale ID`, например `2`, `3`, `4`.

Подробный план следующего этапа лежит в `NEXT_STEPS.md`.
