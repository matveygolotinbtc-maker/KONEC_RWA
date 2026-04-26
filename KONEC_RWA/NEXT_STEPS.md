# Next steps for the RWA MVP

## 1. Current working demo

The current site proves the base integration:

- Phantom connects on Devnet.
- The frontend talks to the deployed Anchor program.
- `initializeSale` creates a live `Sale` account.
- The site can load and decode the demo sale account.
- The Proof tab shows Program ID, Sale PDA, and transaction hash.

Current demo values:

- Program ID: `H25He6vZt9kv7z4AQYeosBifs6SMML8jynSSqFhHXVgZ`
- Demo Sale PDA: `5gHnjckzDHtdcKKcpgYWfLsiSsmB5khtrRU3osnrTRvP`
- Demo Tx: `2gFAiV2NhWb2aMrR22iRXYvFrUkL4CwKSkKYvzYP4k51x5QJv4XWt3RarAUDmhEfhVNf1M8PF1K59CPogBwiVtrP`
- RWA Mint: `5ziuRY49o4jUUAPPjbWZZPT68uYsk7GxX5zP2YigidSv`
- Payment Mint: `9GH312Yx1R54qq8YjtcCaUGgz8y4ga9GQP9wkWzZHksj`
- Sale ID: `1`
- Total supply: `1000`
- Soft cap: `500`
- Current status: `Active`

## 2. Exact PDA seeds from the Rust contract

These seeds are confirmed from `lib.rs` and must be used by the frontend.

### Sale

```ts
[Buffer.from("sale"), admin.toBuffer(), saleId.toArrayLike(Buffer, "le", 8)]
```

### Mint authority

```ts
[Buffer.from("mint-authority"), salePda.toBuffer()]
```

### Treasury authority

```ts
[Buffer.from("treasury-authority"), salePda.toBuffer()]
```

### Payment option

```ts
[Buffer.from("payment-option"), salePda.toBuffer(), paymentMint.toBuffer()]
```

### Buyer position

```ts
[Buffer.from("position"), salePda.toBuffer(), buyer.toBuffer()]
```

### Buyer payment position

```ts
[Buffer.from("payment-position"), salePda.toBuffer(), buyer.toBuffer(), paymentMint.toBuffer()]
```

## 3. Associated token accounts needed later

These are associated token accounts, not custom program PDAs:

- Treasury payment ATA: owner is the treasury authority PDA, mint is the payment mint.
- Buyer RWA ATA: owner is the buyer wallet, mint is the RWA mint.
- Admin payment ATA: owner is the admin wallet, mint is the payment mint.

## 4. Next product milestone

The next milestone is to turn the technical sale initializer into a real investor demo.

Recommended implementation order:

1. Add `addPaymentOption` UI for admin using Payment Mint `9GH312Yx1R54qq8YjtcCaUGgz8y4ga9GQP9wkWzZHksj`.
2. Create or verify the treasury payment ATA for the treasury authority PDA.
3. Add buyer token-account checks.
4. Add `buy` UI.
5. Display investor `BuyerPosition` and `BuyerPaymentPosition` accounts.
6. Add `finalizeSale` for admin.
7. Add `claimRwa` for successful sale.
8. Add `refundPayment` for failed or cancelled sale.
9. Add `withdrawProceeds` for admin.

## 5. Testing checklist

For every new instruction added to the frontend:

1. Create a fresh Sale ID.
2. Run the instruction from the site.
3. Copy the transaction signature.
4. Open it in Solana Explorer on Devnet.
5. Fetch the account state from the site.
6. Confirm the decoded state changed correctly.

## 6. Suggested immediate next step

Add `addPaymentOption` to the frontend. Without a payment option, investors cannot buy, so `Total Reserved` will stay `0`.
