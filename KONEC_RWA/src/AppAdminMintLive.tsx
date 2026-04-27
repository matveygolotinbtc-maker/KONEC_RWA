import React, { useEffect, useMemo, useState } from 'react';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createInitializeMintInstruction, getAssociatedTokenAddressSync, MINT_SIZE, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ArrowRight, Coins, Loader2, ShieldCheck, Sparkles, Wallet } from 'lucide-react';

const isBrowser = typeof window !== 'undefined';
if (isBrowser && !(window as any).Buffer) (window as any).Buffer = Buffer;

type PhantomProvider = { isPhantom?: boolean; publicKey?: PublicKey; connect: () => Promise<{ publicKey: PublicKey }>; disconnect: () => Promise<void>; signTransaction: (tx: Transaction) => Promise<Transaction>; signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]> };
declare global { interface Window { solana?: PhantomProvider; Buffer?: typeof Buffer } }

const RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('H25He6vZt9kv7z4AQYeosBifs6SMML8jynSSqFhHXVgZ');
const DEFAULT_PAYMENT_MINT = '9GH312Yx1R54qq8YjtcCaUGgz8y4ga9GQP9wkWzZHksj';
const DEFAULT_RWA_MINT = '5ziuRY49o4jUUAPPjbWZZPT68uYsk7GxX5zP2YigidSv';

const IDL = {
  address: PROGRAM_ID.toBase58(),
  metadata: { name: 'rwa_sale_anchor_contract_v1', version: '0.1.0', spec: '0.1.0' },
  instructions: [
    { name: 'initializeSale', discriminator: [208, 103, 34, 154, 179, 6, 125, 208], accounts: [
      { name: 'admin', writable: true, signer: true }, { name: 'sale', writable: true }, { name: 'rwaMint', writable: true }, { name: 'mintAuthority' }, { name: 'treasuryAuthority' }, { name: 'tokenProgram', address: TOKEN_PROGRAM_ID.toBase58() }, { name: 'systemProgram', address: SystemProgram.programId.toBase58() }
    ], args: [{ name: 'saleId', type: 'u64' }, { name: 'totalSupply', type: 'u64' }, { name: 'softCap', type: 'u64' }, { name: 'endTs', type: 'i64' }] },
    { name: 'addPaymentOption', discriminator: [57, 43, 114, 43, 53, 77, 237, 174], accounts: [
      { name: 'sale', writable: true }, { name: 'admin', writable: true, signer: true }, { name: 'paymentMint' }, { name: 'paymentOption', writable: true }, { name: 'treasuryPaymentAta', writable: true }, { name: 'treasuryAuthority' }, { name: 'systemProgram', address: SystemProgram.programId.toBase58() }
    ], args: [{ name: 'pricePerRwaToken', type: 'u64' }] },
  ],
  accounts: [
    { name: 'sale', discriminator: [202, 64, 232, 171, 178, 172, 34, 183] },
    { name: 'paymentOption', discriminator: [110, 17, 248, 220, 44, 116, 169, 16] },
  ],
  types: [
    { name: 'sale', type: { kind: 'struct', fields: [
      { name: 'saleId', type: 'u64' }, { name: 'admin', type: 'pubkey' }, { name: 'rwaMint', type: 'pubkey' }, { name: 'totalSupply', type: 'u64' }, { name: 'softCap', type: 'u64' }, { name: 'totalReserved', type: 'u64' }, { name: 'endTs', type: 'i64' }, { name: 'finalizedTs', type: 'i64' }, { name: 'status', type: 'u8' }, { name: 'bump', type: 'u8' }, { name: 'mintAuthorityBump', type: 'u8' }, { name: 'treasuryAuthorityBump', type: 'u8' }
    ] } },
    { name: 'paymentOption', type: { kind: 'struct', fields: [
      { name: 'sale', type: 'pubkey' }, { name: 'paymentMint', type: 'pubkey' }, { name: 'treasuryAta', type: 'pubkey' }, { name: 'pricePerRwaToken', type: 'u64' }, { name: 'bump', type: 'u8' }
    ] } },
  ],
} as any;

type Busy = 'connect' | 'mint' | 'sale' | 'payment' | null;
type Row = [string, string];
const short = (v?: string, l = 6, r = 6) => !v ? '—' : v.length <= l + r + 3 ? v : `${v.slice(0, l)}...${v.slice(-r)}`;
const asU64 = (v: string, f: string) => { const x = v.trim() || f; if (!/^\d+$/.test(x)) throw new Error('Only positive integers are allowed.'); return x; };
const isAlreadyProcessed = (e: any) => String(e?.message || e || '').toLowerCase().includes('already been processed');
function Button({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) { return <button className={`btn btn-${variant}`} {...props}>{children}</button>; }
function Cards({ rows }: { rows: Row[] }) { return <div className="state-grid">{rows.map(([k, v]) => <div className="state-card" key={k}><div className="state-card__label">{k}</div><div className="state-card__value">{v || '—'}</div></div>)}</div>; }
function Info({ k, v }: { k: string; v: string }) { return <div className="info-card info-card--wide"><span>{k}</span><strong>{v || '—'}</strong></div>; }

export default function AppAdminMintLive() {
  const connection = useMemo(() => new Connection(RPC, 'confirmed'), []);
  const [wallet, setWallet] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState('Admin mode. Create a fresh RWA mint before creating a new sale.');
  const [error, setError] = useState('');
  const [saleId, setSaleId] = useState('2');
  const [hours, setHours] = useState('24');
  const [rwaMint, setRwaMint] = useState(DEFAULT_RWA_MINT);
  const [supply, setSupply] = useState('1000');
  const [softCap, setSoftCap] = useState('500');
  const [paymentMint, setPaymentMint] = useState(DEFAULT_PAYMENT_MINT);
  const [price, setPrice] = useState('1');
  const [tx, setTx] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [d, setD] = useState({ sale: '', paymentOption: '', treasuryAuthority: '', treasuryAta: '' });

  useEffect(() => { if (isBrowser && window.solana?.publicKey) setWallet(window.solana.publicKey.toBase58()); }, []);
  const provider = async () => { if (!isBrowser || !window.solana?.isPhantom) throw new Error('Phantom wallet was not detected.'); if (!window.solana.publicKey) await window.solana.connect(); return window.solana; };
  const program = async () => new Program(IDL, new AnchorProvider(connection, (await provider()) as any, { commitment: 'confirmed', preflightCommitment: 'confirmed' }) as any) as any;
  const salePda = (admin: PublicKey, id: string) => PublicKey.findProgramAddressSync([Buffer.from('sale'), admin.toBuffer(), new BN(id).toArrayLike(Buffer, 'le', 8)], PROGRAM_ID)[0];
  const mintAuth = (sale: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('mint-authority'), sale.toBuffer()], PROGRAM_ID)[0];
  const treasuryAuth = (sale: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('treasury-authority'), sale.toBuffer()], PROGRAM_ID)[0];
  const paymentOption = (sale: PublicKey, mint: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('payment-option'), sale.toBuffer(), mint.toBuffer()], PROGRAM_ID)[0];

  const connect = async () => { try { setBusy('connect'); setError(''); const p = await provider(); setWallet(p.publicKey!.toBase58()); setStatus('Wallet connected.'); } catch (e: any) { setError(e.message); } finally { setBusy(null); } };
  const disconnect = async () => { try { await window.solana?.disconnect(); } finally { setWallet(''); setStatus('Wallet disconnected.'); } };

  const createFreshMint = async () => {
    try {
      setBusy('mint'); setError(''); setStatus('Creating fresh RWA mint...');
      const p = await provider(); const payer = p.publicKey!; const mint = Keypair.generate(); const rent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE); const bh = await connection.getLatestBlockhash('confirmed');
      const txObj = new Transaction({ feePayer: payer, recentBlockhash: bh.blockhash }).add(
        SystemProgram.createAccount({ fromPubkey: payer, newAccountPubkey: mint.publicKey, space: MINT_SIZE, lamports: rent, programId: TOKEN_PROGRAM_ID }),
        createInitializeMintInstruction(mint.publicKey, 0, payer, payer, TOKEN_PROGRAM_ID)
      );
      txObj.partialSign(mint); const signed = await p.signTransaction(txObj); const sig = await connection.sendRawTransaction(signed.serialize()); await connection.confirmTransaction({ signature: sig, ...bh }, 'confirmed');
      setTx(sig); setRwaMint(mint.publicKey.toBase58()); setStatus('Fresh RWA mint created. Now create sale using this mint.');
    } catch (e: any) { setError(e.message || 'Fresh mint creation failed.'); setStatus('Fresh mint creation failed.'); } finally { setBusy(null); }
  };

  const showSale = async (sale: PublicKey, pr?: any) => {
    const read = pr || new Program(IDL, { connection, publicKey: undefined } as any) as any;
    const raw = await read.account.sale.fetch(sale);
    setRows([['Sale PDA', sale.toBase58()], ['Sale ID', raw.saleId.toString()], ['Admin', raw.admin.toBase58()], ['RWA Mint', raw.rwaMint.toBase58()], ['Total Supply', raw.totalSupply.toString()], ['Soft Cap', raw.softCap.toString()], ['Total Reserved', raw.totalReserved.toString()], ['Status', String(raw.status)]]);
  };

  const createSale = async () => {
    try {
      setBusy('sale'); setError(''); setStatus('Creating sale...');
      const p = await provider(); const pr = await program(); const admin = p.publicKey!; const id = asU64(saleId, '2'); const total = asU64(supply, '1000'); const cap = asU64(softCap, '500');
      if (BigInt(cap) > BigInt(total)) throw new Error('Soft cap cannot be greater than total supply.');
      const sale = salePda(admin, id); const mint = new PublicKey(rwaMint); const treasury = treasuryAuth(sale);
      const sig = await pr.methods.initializeSale(new BN(id), new BN(total), new BN(cap), new BN(Math.floor(Date.now() / 1000) + Number(asU64(hours, '24')) * 3600)).accounts({ admin, sale, rwaMint: mint, mintAuthority: mintAuth(sale), treasuryAuthority: treasury, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).rpc();
      setTx(sig); await connection.confirmTransaction(sig, 'confirmed'); await showSale(sale, pr); setD(x => ({ ...x, sale: sale.toBase58(), treasuryAuthority: treasury.toBase58() })); setStatus('Sale created. Now add payment option.');
    } catch (e: any) { setError(e.message || 'Create sale failed.'); setStatus('Create sale failed.'); } finally { setBusy(null); }
  };

  const fetchSale = async () => {
    try { setBusy('sale'); setError(''); const p = await provider(); const sale = salePda(p.publicKey!, asU64(saleId, '2')); await showSale(sale); setD(x => ({ ...x, sale: sale.toBase58(), treasuryAuthority: treasuryAuth(sale).toBase58() })); setStatus('Sale fetched.'); }
    catch (e: any) { setError(e.message || 'Fetch sale failed.'); setStatus('Fetch sale failed.'); } finally { setBusy(null); }
  };

  const loadPaymentOptionIfExists = async (pr: any, sale: PublicKey, payMint: PublicKey, opt: PublicKey, treasury: PublicKey, treasuryAta: PublicKey) => {
    try {
      const raw = await pr.account.paymentOption.fetch(opt);
      setD({ sale: sale.toBase58(), paymentOption: opt.toBase58(), treasuryAuthority: treasury.toBase58(), treasuryAta: treasuryAta.toBase58() });
      setRows([['Payment Option PDA', opt.toBase58()], ['Sale', raw.sale.toBase58()], ['Payment Mint', raw.paymentMint.toBase58()], ['Treasury ATA', raw.treasuryAta.toBase58()], ['Expected Treasury ATA', treasuryAta.toBase58()], ['Price per RWA token', raw.pricePerRwaToken.toString()]]);
      return true;
    } catch {
      return false;
    }
  };

  const ensureTreasuryAta = async (payer: PublicKey, treasury: PublicKey, payMint: PublicKey, treasuryAta: PublicKey) => {
    const existing = await connection.getAccountInfo(treasuryAta);
    if (existing) return;
    const p = await provider(); const bh = await connection.getLatestBlockhash('confirmed');
    const txObj = new Transaction({ feePayer: payer, recentBlockhash: bh.blockhash }).add(createAssociatedTokenAccountInstruction(payer, treasuryAta, treasury, payMint, TOKEN_PROGRAM_ID));
    const signed = await p.signTransaction(txObj);
    try {
      const sigAta = await connection.sendRawTransaction(signed.serialize());
      setTx(sigAta);
      await connection.confirmTransaction({ signature: sigAta, ...bh }, 'confirmed');
    } catch (e: any) {
      if (!isAlreadyProcessed(e)) throw e;
    }
    if (!(await connection.getAccountInfo(treasuryAta))) throw new Error('Treasury ATA was not created. Try Add payment option again.');
  };

  const addPayment = async () => {
    try {
      setBusy('payment'); setError(''); setStatus('Adding payment option with verified treasury ATA...');
      const p = await provider(); const pr = await program(); const admin = p.publicKey!; const sale = salePda(admin, asU64(saleId, '2')); const payMint = new PublicKey(paymentMint); const treasury = treasuryAuth(sale); const treasuryAta = getAssociatedTokenAddressSync(payMint, treasury, true, TOKEN_PROGRAM_ID); const opt = paymentOption(sale, payMint);
      await ensureTreasuryAta(admin, treasury, payMint, treasuryAta);
      if (await loadPaymentOptionIfExists(pr, sale, payMint, opt, treasury, treasuryAta)) { setStatus('Payment option already exists and was loaded.'); return; }
      try {
        const sig = await pr.methods.addPaymentOption(new BN(asU64(price, '1'))).accounts({ sale, admin, paymentMint: payMint, paymentOption: opt, treasuryPaymentAta: treasuryAta, treasuryAuthority: treasury, systemProgram: SystemProgram.programId }).rpc();
        setTx(sig); await connection.confirmTransaction(sig, 'confirmed');
      } catch (e: any) {
        if (!isAlreadyProcessed(e)) throw e;
      }
      const loaded = await loadPaymentOptionIfExists(pr, sale, payMint, opt, treasury, treasuryAta);
      if (!loaded) throw new Error('Payment option transaction finished, but account was not found. Press Add payment option again.');
      setStatus('Payment option added with a real SPL treasury ATA.');
    } catch (e: any) { setError(e.message || 'Add payment option failed.'); setStatus('Add payment option failed.'); } finally { setBusy(null); }
  };

  return <div className="site-shell"><div className="container"><header className="topbar glass-card"><div className="brand-row"><div className="brand-mark">AB</div><div><div className="eyebrow">Admin Setup</div><div className="brand-title">AssetBridge Sale Builder</div></div></div><div className="topbar-pills"><div className="stat-pill"><span className="stat-pill__label">Program</span><span className="stat-pill__value">{short(PROGRAM_ID.toBase58())}</span></div><div className="stat-pill"><span className="stat-pill__label">Network</span><span className="stat-pill__value">Devnet</span></div></div></header><section className="hero-grid"><div className="hero-panel glass-card"><div className="eyebrow badge-soft">Fresh sale setup</div><h1 className="hero-title">Create a fresh RWA mint, sale, and payment option.</h1><p className="hero-copy">Use this admin mode for new tests. Do not reuse the old RWA mint if initializeSale returns owner mismatch.</p><div className="hero-actions">{wallet ? <Button variant="secondary" onClick={disconnect}>Disconnect {short(wallet)}</Button> : <Button onClick={connect} disabled={busy === 'connect'}>{busy === 'connect' ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}Connect Phantom</Button>}<Button variant="ghost" onClick={createFreshMint} disabled={!wallet || busy === 'mint'}>{busy === 'mint' ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}Create fresh RWA mint</Button></div></div><aside className="hero-side glass-card"><div className="side-label">Latest proof</div><div className="mini-proof"><div className="mini-proof__label">Sale PDA</div><div className="mono">{short(d.sale, 12, 12)}</div></div><div className="mini-proof"><div className="mini-proof__label">Treasury ATA</div><div className="mono">{short(d.treasuryAta, 12, 12)}</div></div><div className="mini-proof"><div className="mini-proof__label">Latest Tx</div><div className="mono">{short(tx, 12, 12)}</div></div></aside></section><section className="demo-section glass-card"><div className="demo-header"><div><div className="section-topline">Admin flow</div><h2 className="section-title">Fresh mint → sale → payment option</h2><p className="demo-copy">Step 1: Create fresh RWA mint. Step 2: Create sale. Step 3: Add payment option.</p></div></div><div className="demo-grid"><div className="demo-panel panel-dark"><div className="panel-title">Sale</div><div className="form-grid"><div className="field"><label>Sale ID</label><input value={saleId} onChange={e => setSaleId(e.target.value.replace(/[^0-9]/g, ''))} /></div><div className="field"><label>Deadline hours</label><input value={hours} onChange={e => setHours(e.target.value.replace(/[^0-9]/g, ''))} /></div><div className="field field-full"><label>RWA mint</label><input value={rwaMint} onChange={e => setRwaMint(e.target.value)} /></div><div className="field"><label>Total supply</label><input value={supply} onChange={e => setSupply(e.target.value.replace(/[^0-9]/g, ''))} /></div><div className="field"><label>Soft cap</label><input value={softCap} onChange={e => setSoftCap(e.target.value.replace(/[^0-9]/g, ''))} /></div></div><div className="action-row"><Button onClick={createSale} disabled={!wallet || busy === 'sale'}><ArrowRight size={18} />Create sale</Button><Button variant="ghost" onClick={fetchSale} disabled={!wallet || busy === 'sale'}>Fetch sale</Button></div><div className="panel-title" style={{ marginTop: 24 }}>Payment option</div><div className="form-grid"><div className="field field-full"><label>Payment mint</label><input value={paymentMint} onChange={e => setPaymentMint(e.target.value)} /></div><div className="field field-full"><label>Price per RWA token</label><input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))} /></div></div><div className="action-row"><Button onClick={addPayment} disabled={!wallet || busy === 'payment'}>{busy === 'payment' ? <Loader2 className="spin" size={18} /> : <Coins size={18} />}Add payment option</Button></div></div><div className="demo-panel panel-muted"><div className="panel-title">Status</div><div className="status-box">{status}</div>{error && <div className="notice notice-error">{error}</div>}<div className="info-list"><Info k="Connected wallet" v={wallet} /><Info k="Sale PDA" v={d.sale} /><Info k="Payment option PDA" v={d.paymentOption} /><Info k="Treasury authority" v={d.treasuryAuthority} /><Info k="Treasury payment ATA" v={d.treasuryAta} /><Info k="Latest transaction" v={tx} /></div><div className="proof-actions"><a className="text-link" href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`} target="_blank" rel="noreferrer">Open latest tx in Explorer</a></div></div></div><div style={{ marginTop: 22 }}>{rows.length ? <Cards rows={rows} /> : <div className="empty-state">Run an admin action to see decoded state.</div>}</div></section><footer className="footer-strip glass-card"><div><div className="footer-title">Next after setup</div><div className="footer-copy">Copy the Sale PDA into investor mode after I add the editable Sale PDA field there.</div></div><div className="footer-badge"><ShieldCheck size={18} />Devnet</div></footer></div></div>;
}
