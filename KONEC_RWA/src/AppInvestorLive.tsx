import React, { useEffect, useMemo, useState } from 'react';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Coins, Loader2, ShieldCheck, Wallet } from 'lucide-react';

const isBrowser = typeof window !== 'undefined';
if (isBrowser && !(window as any).Buffer) (window as any).Buffer = Buffer;

type PhantomProvider = { isPhantom?: boolean; publicKey?: PublicKey; connect: () => Promise<{ publicKey: PublicKey }>; disconnect: () => Promise<void>; signTransaction: (tx: Transaction) => Promise<Transaction>; signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]> };
declare global { interface Window { solana?: PhantomProvider; Buffer?: typeof Buffer } }

const RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('H25He6vZt9kv7z4AQYeosBifs6SMML8jynSSqFhHXVgZ');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SALE = new PublicKey('5gHnjckzDHtdcKKcpgYWfLsiSsmB5khtrRU3osnrTRvP');
const PAYMENT_MINT = new PublicKey('9GH312Yx1R54qq8YjtcCaUGgz8y4ga9GQP9wkWzZHksj');
const DEMO_TX = '2gFAiV2NhWb2aMrR22iRXYvFrUkL4CwKSkKYvzYP4k51x5QJv4XWt3RarAUDmhEfhVNf1M8PF1K59CPogBwiVtrP';

const IDL = {
  address: PROGRAM_ID.toBase58(),
  metadata: { name: 'rwa_sale_anchor_contract_v1', version: '0.1.0', spec: '0.1.0' },
  instructions: [{ name: 'buy', discriminator: [102, 6, 61, 18, 1, 218, 235, 234], accounts: [
    { name: 'buyer', writable: true, signer: true }, { name: 'sale', writable: true }, { name: 'paymentOption', writable: true }, { name: 'paymentMint' }, { name: 'buyerPosition', writable: true }, { name: 'buyerPaymentAta', writable: true }, { name: 'treasuryPaymentAta', writable: true }, { name: 'tokenProgram', address: TOKEN_PROGRAM_ID.toBase58() }, { name: 'systemProgram', address: SystemProgram.programId.toBase58() }
  ], args: [{ name: 'paymentAmount', type: 'u64' }] }],
  accounts: [
    { name: 'sale', discriminator: [202, 64, 232, 171, 178, 172, 34, 183] },
    { name: 'paymentOption', discriminator: [110, 17, 248, 220, 44, 116, 169, 16] },
    { name: 'buyerPosition', discriminator: [232, 163, 167, 95, 170, 210, 214, 83] }
  ],
  types: [
    { name: 'sale', type: { kind: 'struct', fields: [{ name: 'saleId', type: 'u64' }, { name: 'admin', type: 'pubkey' }, { name: 'rwaMint', type: 'pubkey' }, { name: 'totalSupply', type: 'u64' }, { name: 'softCap', type: 'u64' }, { name: 'totalReserved', type: 'u64' }, { name: 'endTs', type: 'i64' }, { name: 'finalizedTs', type: 'i64' }, { name: 'status', type: 'u8' }, { name: 'bump', type: 'u8' }, { name: 'mintAuthorityBump', type: 'u8' }, { name: 'treasuryAuthorityBump', type: 'u8' }] } },
    { name: 'paymentOption', type: { kind: 'struct', fields: [{ name: 'sale', type: 'pubkey' }, { name: 'paymentMint', type: 'pubkey' }, { name: 'treasuryAta', type: 'pubkey' }, { name: 'pricePerRwaToken', type: 'u64' }, { name: 'bump', type: 'u8' }] } },
    { name: 'buyerPosition', type: { kind: 'struct', fields: [{ name: 'sale', type: 'pubkey' }, { name: 'buyer', type: 'pubkey' }, { name: 'totalReserved', type: 'u64' }, { name: 'totalPaymentEvents', type: 'u64' }, { name: 'claimed', type: 'bool' }, { name: 'bump', type: 'u8' }] } }
  ]
} as any;

type Busy = 'connect' | 'load' | 'ata' | 'buy' | null;
type Row = [string, string];
const short = (v?: string, l = 6, r = 6) => !v ? '—' : v.length <= l + r + 3 ? v : `${v.slice(0, l)}...${v.slice(-r)}`;
const asU64 = (v: string, f: string) => { const x = v.trim() || f; if (!/^\d+$/.test(x)) throw new Error('Only positive integers are allowed.'); return x; };
function Button({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) { return <button className={`btn btn-${variant}`} {...props}>{children}</button>; }
function Cards({ rows }: { rows: Row[] }) { return <div className="state-grid">{rows.map(([k, v]) => <div className="state-card" key={k}><div className="state-card__label">{k}</div><div className="state-card__value">{v || '—'}</div></div>)}</div>; }
function Info({ k, v }: { k: string; v: string }) { return <div className="info-card info-card--wide"><span>{k}</span><strong>{v || '—'}</strong></div>; }

export default function AppInvestorLive() {
  const connection = useMemo(() => new Connection(RPC, 'confirmed'), []);
  const [wallet, setWallet] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState('Ready. Load sale + payment option, then check buyer.');
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('1');
  const [tx, setTx] = useState(DEMO_TX);
  const [saleRows, setSaleRows] = useState<Row[]>([]);
  const [payRows, setPayRows] = useState<Row[]>([]);
  const [buyerRows, setBuyerRows] = useState<Row[]>([]);
  const [d, setD] = useState({ option: '', treasuryAta: '', buyerPosition: '', buyerAta: '', balance: '—', required: '—' });

  useEffect(() => { if (isBrowser && window.solana?.publicKey) setWallet(window.solana.publicKey.toBase58()); }, []);
  const provider = async () => { if (!isBrowser || !window.solana?.isPhantom) throw new Error('Phantom wallet was not detected.'); if (!window.solana.publicKey) await window.solana.connect(); return window.solana; };
  const program = async () => new Program(IDL, new AnchorProvider(connection, (await provider()) as any, { commitment: 'confirmed', preflightCommitment: 'confirmed' }) as any) as any;
  const readProgram = () => new Program(IDL, { connection, publicKey: undefined } as any) as any;
  const optionPda = () => PublicKey.findProgramAddressSync([Buffer.from('payment-option'), SALE.toBuffer(), PAYMENT_MINT.toBuffer()], PROGRAM_ID)[0];
  const treasuryAuthority = () => PublicKey.findProgramAddressSync([Buffer.from('treasury-authority'), SALE.toBuffer()], PROGRAM_ID)[0];
  const treasuryPaymentAta = () => PublicKey.findProgramAddressSync([treasuryAuthority().toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), PAYMENT_MINT.toBuffer()], ATA_PROGRAM_ID)[0];
  const positionPda = (buyer: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('position'), SALE.toBuffer(), buyer.toBuffer()], PROGRAM_ID)[0];
  const ata = (owner: PublicKey) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), PAYMENT_MINT.toBuffer()], ATA_PROGRAM_ID)[0];

  const ensureTokenAccount = async (account: PublicKey, label: string) => {
    const info = await connection.getAccountInfo(account);
    if (!info) throw new Error(`${label} does not exist: ${account.toBase58()}`);
    if (!info.owner.equals(TOKEN_PROGRAM_ID)) throw new Error(`${label} is not owned by SPL Token Program: ${account.toBase58()}`);
    return info;
  };
  const bal = async (a: PublicKey) => { const i = await connection.getAccountInfo(a); if (!i) return null; if (!i.owner.equals(TOKEN_PROGRAM_ID)) throw new Error(`Buyer ATA is not owned by SPL Token Program: ${a.toBase58()}`); return i.data.readBigUInt64LE(64); };
  const connect = async () => { try { setBusy('connect'); setError(''); const p = await provider(); setWallet(p.publicKey!.toBase58()); setStatus('Wallet connected.'); } catch (e: any) { setError(e.message); } finally { setBusy(null); } };
  const disconnect = async () => { try { await window.solana?.disconnect(); } finally { setWallet(''); setStatus('Wallet disconnected.'); } };

  const load = async () => {
    try {
      setBusy('load'); setError(''); setStatus('Loading sale and payment option...');
      const p = readProgram(); const sale: any = await p.account.sale.fetch(SALE); const opt = optionPda(); const pay: any = await p.account.paymentOption.fetch(opt); const treasuryAta = treasuryPaymentAta(); await ensureTokenAccount(treasuryAta, 'Treasury payment ATA');
      setSaleRows([['Sale PDA', SALE.toBase58()], ['Sale ID', sale.saleId.toString()], ['Admin', sale.admin.toBase58()], ['RWA Mint', sale.rwaMint.toBase58()], ['Total Supply', sale.totalSupply.toString()], ['Total Reserved', sale.totalReserved.toString()], ['Status', String(sale.status)]]);
      setPayRows([['Payment Option PDA', opt.toBase58()], ['Payment Mint', pay.paymentMint.toBase58()], ['Stored Treasury ATA', pay.treasuryAta.toBase58()], ['Derived Treasury ATA', treasuryAta.toBase58()], ['Price per RWA token', pay.pricePerRwaToken.toString()]]);
      setD(x => ({ ...x, option: opt.toBase58(), treasuryAta: treasuryAta.toBase58(), required: (BigInt(pay.pricePerRwaToken.toString()) * BigInt(asU64(amount, '1'))).toString() }));
      setStatus('Sale and payment option loaded. Treasury ATA verified as SPL token account.');
    } catch (e: any) { setError(e.message || 'Load failed.'); setStatus('Load failed.'); } finally { setBusy(null); }
  };

  const checkBuyer = async () => {
    try {
      setBusy('load'); setError(''); const ph = await provider(); const buyer = ph.publicKey!; const p = readProgram(); const opt: any = await p.account.paymentOption.fetch(optionPda()); const treasuryAta = treasuryPaymentAta(); await ensureTokenAccount(treasuryAta, 'Treasury payment ATA');
      const buyerAta = ata(buyer); const balance = await bal(buyerAta); const pos = positionPda(buyer); let rows: Row[] = [];
      try { const bp: any = await p.account.buyerPosition.fetch(pos); rows = [['Buyer Position PDA', pos.toBase58()], ['Reserved RWA', bp.totalReserved.toString()], ['Payment Events', bp.totalPaymentEvents.toString()], ['Claimed', String(Boolean(bp.claimed))]]; } catch { rows = []; }
      setBuyerRows(rows); setD(x => ({ ...x, treasuryAta: treasuryAta.toBase58(), buyerPosition: pos.toBase58(), buyerAta: buyerAta.toBase58(), balance: balance === null ? 'ATA not found' : balance.toString(), required: (BigInt(opt.pricePerRwaToken.toString()) * BigInt(asU64(amount, '1'))).toString() }));
      setStatus(balance === null ? 'Buyer ATA not found. Create it and fund it.' : 'Buyer checked.');
    } catch (e: any) { setError(e.message || 'Buyer check failed.'); setStatus('Buyer check failed.'); } finally { setBusy(null); }
  };

  const createBuyerAta = async () => {
    try {
      setBusy('ata'); setError(''); const ph = await provider(); const buyerAta = ata(ph.publicKey!); if (!(await connection.getAccountInfo(buyerAta))) { const bh = await connection.getLatestBlockhash('confirmed'); const ix = new TransactionInstruction({ programId: ATA_PROGRAM_ID, keys: [{ pubkey: ph.publicKey!, isSigner: true, isWritable: true }, { pubkey: buyerAta, isSigner: false, isWritable: true }, { pubkey: ph.publicKey!, isSigner: false, isWritable: false }, { pubkey: PAYMENT_MINT, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }], data: Buffer.alloc(0) }); const tr = new Transaction({ feePayer: ph.publicKey!, recentBlockhash: bh.blockhash }).add(ix); const signed = await ph.signTransaction(tr); const sig = await connection.sendRawTransaction(signed.serialize()); await connection.confirmTransaction({ signature: sig, ...bh }, 'confirmed'); setTx(sig); }
      await checkBuyer(); setStatus('Buyer ATA is ready. It still needs payment tokens before Buy.');
    } catch (e: any) { setError(e.message || 'Create ATA failed.'); setStatus('Create ATA failed.'); } finally { setBusy(null); }
  };

  const buy = async () => {
    try {
      setBusy('buy'); setError(''); const ph = await provider(); const pr = await program(); const buyer = ph.publicKey!; const opt = optionPda(); const pay: any = await pr.account.paymentOption.fetch(opt); const paymentAmount = BigInt(pay.pricePerRwaToken.toString()) * BigInt(asU64(amount, '1')); const buyerAta = ata(buyer); const balance = await bal(buyerAta); if (balance === null) throw new Error('Buyer ATA does not exist.'); if (balance < paymentAmount) throw new Error(`Insufficient payment token balance. Required ${paymentAmount}, current ${balance}.`); const treasuryAta = treasuryPaymentAta(); await ensureTokenAccount(treasuryAta, 'Treasury payment ATA'); const pos = positionPda(buyer); const sig = await pr.methods.buy(new BN(paymentAmount.toString())).accounts({ buyer, sale: SALE, paymentOption: opt, paymentMint: PAYMENT_MINT, buyerPosition: pos, buyerPaymentAta: buyerAta, treasuryPaymentAta: treasuryAta, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).rpc(); setTx(sig); await connection.confirmTransaction(sig, 'confirmed'); await load(); await checkBuyer(); setStatus('Buy confirmed. totalReserved and buyer position updated.');
    } catch (e: any) { setError(e.message || 'Buy failed.'); setStatus('Buy failed.'); } finally { setBusy(null); }
  };

  return <div className="site-shell"><div className="container"><header className="topbar glass-card"><div className="brand-row"><div className="brand-mark">AB</div><div><div className="eyebrow">Live Devnet RWA Demo</div><div className="brand-title">AssetBridge Investor Portal</div></div></div><div className="topbar-pills"><div className="stat-pill"><span className="stat-pill__label">Program</span><span className="stat-pill__value">{short(PROGRAM_ID.toBase58())}</span></div><div className="stat-pill"><span className="stat-pill__label">Network</span><span className="stat-pill__value">Devnet</span></div></div></header><section className="hero-grid"><div className="hero-panel glass-card"><div className="eyebrow badge-soft">Investor buy milestone</div><h1 className="hero-title">Buy RWA tokens from the live devnet sale.</h1><p className="hero-copy">This screen checks buyer token accounts and calls the real contract buy instruction.</p><div className="hero-actions">{wallet ? <Button variant="secondary" onClick={disconnect}>Disconnect {short(wallet)}</Button> : <Button onClick={connect} disabled={busy === 'connect'}>{busy === 'connect' ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}Connect Phantom</Button>}<Button variant="ghost" onClick={load} disabled={busy === 'load'}>Load sale + payment</Button></div></div><aside className="hero-side glass-card"><div className="side-label">Current proof</div><div className="mini-proof"><div className="mini-proof__label">Sale PDA</div><div className="mono">{short(SALE.toBase58(), 12, 12)}</div></div><div className="mini-proof"><div className="mini-proof__label">Payment option</div><div className="mono">{short(d.option, 12, 12)}</div></div><div className="mini-proof"><div className="mini-proof__label">Latest Tx</div><div className="mono">{short(tx, 12, 12)}</div></div></aside></section><section className="demo-section glass-card"><div className="demo-header"><div><div className="section-topline">Investor flow</div><h2 className="section-title">Check buyer readiness and buy</h2><p className="demo-copy">The connected wallet is the buyer. It must have payment mint tokens in its buyer payment ATA.</p></div></div><div className="demo-grid"><div className="demo-panel panel-dark"><div className="panel-title">Buy form</div><div className="form-grid"><div className="field field-full"><label>RWA tokens to buy</label><input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} /></div></div><div className="action-row"><Button variant="ghost" onClick={checkBuyer} disabled={!wallet || busy === 'load'}>Check buyer</Button><Button variant="ghost" onClick={createBuyerAta} disabled={!wallet || busy === 'ata'}>Create buyer ATA</Button><Button onClick={buy} disabled={!wallet || busy === 'buy'}>{busy === 'buy' ? <Loader2 className="spin" size={18} /> : <Coins size={18} />}Buy RWA tokens</Button></div><div className="notice notice-warning">If balance is 0 or ATA not found, mint or transfer devnet payment tokens to the buyer first.</div></div><div className="demo-panel panel-muted"><div className="panel-title">Status</div><div className="status-box">{status}</div>{error && <div className="notice notice-error">{error}</div>}<div className="info-list"><Info k="Connected wallet" v={wallet} /><Info k="Buyer payment ATA" v={d.buyerAta} /><Info k="Buyer payment balance" v={d.balance} /><Info k="Required payment amount" v={d.required} /><Info k="Buyer position PDA" v={d.buyerPosition} /><Info k="Treasury payment ATA" v={d.treasuryAta} /></div><div className="proof-actions"><a className="text-link" href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`} target="_blank" rel="noreferrer">Open latest tx in Explorer</a></div></div></div><div className="content-grid" style={{ marginTop: 22 }}><div><div className="section-topline">Sale account</div>{saleRows.length ? <Cards rows={saleRows} /> : <div className="empty-state">Load sale first.</div>}</div><div><div className="section-topline">Payment option account</div>{payRows.length ? <Cards rows={payRows} /> : <div className="empty-state">Load payment option first.</div>}</div></div><div style={{ marginTop: 22 }}><div className="section-topline">Buyer position account</div>{buyerRows.length ? <Cards rows={buyerRows} /> : <div className="empty-state">Check buyer or complete buy transaction.</div>}</div></section><footer className="footer-strip glass-card"><div><div className="footer-title">Current MVP scope</div><div className="footer-copy">Payment option setup is complete. This screen adds buyer checks and buy transaction wiring.</div></div><div className="footer-badge"><ShieldCheck size={18} />Devnet</div></footer></div></div>;
}
