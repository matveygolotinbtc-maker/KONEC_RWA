# Next steps for the RWA MVP

## 1. Current working demo

The current site proves the base integration:

- Phantom connects on Devnet.
- The frontend talks to the deployed Anchor program.
- `initializeSale` creates a live `Sale` account.
- The site can load and decode the demo sale account.
- The Proof tab can show Program ID, Sale PDA, and transaction hash.

Current demo values:

- Program ID: `H25He6vZt9kv7z4AQYeosBifs6SMML8jynSSqFhHXVgZ`
- Demo Sale PDA: `5gHnjckzDHtdcKKcpgYWfLsiSsmB5khtrRU3osnrTRvP`
- Demo Tx: `2gFAiV2NhWb2aMrR22iRXYvFrUkL4CwKSkKYvzYP4k51x5QJv4XWt3RarAUDmhEfhVNf1M8PF1K59CPogBwiVtrP`
- RWA Mint: `5ziuRY49o4jUUAPPjbWZZPT68uYsk7GxX5zP2YigidSv`

## 2. Next product milestone

The next milestone is to turn the technical sale initializer into a real investor demo.

Recommended order:

1. Add `addPaymentOption` UI for admin.
2. Add a stable devnet payment mint, for example a test USDC-like SPL token.
3. Add a buyer flow with `buy`.
4. Display investor position accounts.
5. Add `finalizeSale` for admin.
6. Add `claimRwa` for successful sale.
7. Add `refundPayment` for failed or cancelled sale.
8. Add `withdrawProceeds` for admin.

## 3. UI changes to add next

Recommended new blocks in `src/App.tsx`:

- Admin setup panel
  - Payment mint input
  - Price per RWA token input
  - `Add payment option` button

- Investor buy panel
  - Payment amount input
  - Derived buyer position PDA
  - Derived buyer payment position PDA
  - `Buy tokens` button

- Settlement panel
  - `Finalize sale`
  - `Claim RWA`
  - `Refund payment`
  - `Withdraw proceeds`

## 4. Important technical notes

Before adding the next UI actions, confirm the exact PDA seeds in the Rust contract for:

- `paymentOption`
- `treasuryPaymentAta`
- `buyerPosition`
- `buyerPaymentPosition`
- `buyerRwaAta`
- `adminPaymentAta`

The previous `mintAuthority` issue happened because the frontend used `mint_authority`, while the contract expected `mint-authority`. The same check should be done before building the payment flow.

## 5. Testing checklist

For every new instruction added to the frontend:

1. Create a fresh Sale ID.
2. Run the instruction from the site.
3. Copy the transaction signature.
4. Open it in Solana Explorer on Devnet.
5. Fetch the account state from the site.
6. Confirm the decoded state changed correctly.

## 6. Suggested immediate next step

Add `addPaymentOption` first. Without a payment option, investors cannot buy, so `Total Reserved` will stay `0`.
