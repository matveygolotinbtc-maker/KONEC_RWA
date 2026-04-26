import React, { useEffect, useMemo, useState } from 'react';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';

const isBrowser = typeof window !== 'undefined';
if (isBrowser && !(window as any).Buffer) (window as any).Buffer = Buffer;

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
    Buffer?: typeof Buffer;
  }
}

const RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('H25He6vZt9kv7z4AQYeosBifs6SMML8jynSSqFhHXVgZ');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const DEMO_SALE = new PublicKey('5gHnjckzDHtdcKKcpgYWfLsiSsmB5khtrRU3osnrTRvP');
const RWA_MINT = '5ziuRY49o4jUUAPPjbWZZPT68uYsk7GxX5zP2YigidSv';
const PAYMENT_MINT = '9GH312Yx1R54qq8YjtcCaUGgz8y4ga9GQP9wkWzZHksj';
const DEMO_TX = '2gFAiV2NhWb2aMrR22iRXYvFrUkL4CwKSkKYvzYP4k51x5QJv4XWt3RarAUDmhEfhVNf1M8PF1K59CPogBwiVtrP';

const IDL = {
  address: PROGRAM_ID.toBase58(),
  metadata: { name: 'rwa_sale_anchor_contract_v1', version: '0.1.0', spec: '0.1.0' },
  instructions: [
    { name: 'initializeSale', discriminator: [208,103,34,154,179,6,125,208], accounts: [
      { name: 'admin', writable: true, signer: true }, { name: 'sale', writable: true }, { name: 'rwaMint', writable: true }, { name: 'mintAuthority' }, { name: 'treasuryAuthority' }, { name: 'tokenProgram', address: TOKEN_PROGRAM_ID.toBase58() }, { name: 'systemProgram', address: SystemProgram.programId.toBase58() }
    ], args: [{ name: 'saleId', type: 'u64' }, { name: 'totalSupply', type: 'u64' }, { name: 'softCap', type: 'u64' }, { name: 'endTs', type: 'i64' }] },
    { name: 'addPaymentOption', discriminator: [57,43,114,43,53,77,237,174], accounts: [
      { name: 'sale', writable: true }, { name: 'admin', writable: true, signer: true }, { name: 'paymentMint' }, { name: 'paymentOption', writable: true }, { name: 'treasuryPaymentAta', writable: true }, { name: 'treasuryAuthority' }, { name: 'systemProgram', address: SystemProgram.programId.toBase58() }
    ], args: [{ name: 'pricePerRwaToken', type: 'u64' }] },
  ],
  accounts: [
    { name: 'sale', discriminator: [202,64,232,171,178,172,34,183] },
    { name: 'paymentOption', discriminator: [110,17,248,220,44,116,169,16] },
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

type Busy = 'connect' | 'sale' | 'payment' | null;

function s(v?: string, l = 5, r = 5) { return !v ? '—' : v.length <= l + r + 3 ? v : `${v.slice(0,l)}...${v.slice(-r)}`; }
function asU64(v: string, fallback: string) { const out = v.trim() || fallback; if (!/^\d+$/.test(out)) throw new Error('Only positive integers are allowed.'); return out; }
function statusName(n: number) { return n === 0 ? 'Active' : n === 1 ? 'Successful' : n === 2 ? 'Failed' : n === 3 ? 'Cancelled' : `Unknown ${n}`; }

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className='demo-panel panel-muted'><div className='panel-title'>{title}</div>{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className='info-card info-card--wide'><span>{label}</span><strong>{value}</strong></div>;
}

export default function AppPayment() {
  const connection = useMemo(() => new Connection(RPC, 'confirmed'), []);
  const [wallet, setWallet] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready. Load the demo sale, then add payment option.');
  const [saleId, setSaleId] = useState('1');
  const [supply, setSupply] = useState('1000');
  const [softCap, setSoftCap] = useState('500');
  const [hours, setHours] = useState('24');
  const [rwaMint, setRwaMint] = useState(RWA_MINT);
  const [paymentMint, setPaymentMint] = useState(PAYMENT_MINT);
  const [price, setPrice] = useState('1');
  const [tx, setTx] = useState(DEMO_TX);
  const [saleRows, setSaleRows] = useState<string[][]>([]);
  const [paymentRows, setPaymentRows] = useState<string[][]>([]);
  const [derived, setDerived] = useState({ sale: DEMO_SALE.toBase58(), option: '', treasuryAta: '' });

  useEffect(() => { if (window.solana?.publicKey) setWallet(window.solana.publicKey.toBase58()); }, []);

  const provider = async () => {
    if (!window.solana?.isPhantom) throw new Error('Phantom wallet was not detected.');
    if (!window.solana.publicKey) await window.solana.connect();
    return window.solana;
  };
  const program = async () => new Program(IDL, new AnchorProvider(connection, (await provider()) as any, { commitment: 'confirmed' }) as any) as any;
  const readProgram = () => new Program(IDL, { connection, publicKey: undefined } as any) as any;

  const salePda = (admin: PublicKey, id: string) => PublicKey.findProgramAddressSync([Buffer.from('sale'), admin.toBuffer(), new BN(id).toArrayLike(Buffer, 'le', 8)], PROGRAM_ID)[0];
  const mintAuth = (sale: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('mint-authority'), sale.toBuffer()], PROGRAM_ID)[0];
  const treasuryAuth = (sale: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('treasury-authority'), sale.toBuffer()], PROGRAM_ID)[0];
  const paymentOption = (sale: PublicKey, mint: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('payment-option'), sale.toBuffer(), mint.toBuffer()], PROGRAM_ID)[0];
  const ata = (owner: PublicKey, mint: PublicKey) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ATA_PROGRAM_ID)[0];

  const ataIx = (payer: PublicKey, account: PublicKey, owner: PublicKey, mint: PublicKey) => new TransactionInstruction({ programId: ATA_PROGRAM_ID, keys: [
    { pubkey: payer, isSigner: true, isWritable: true }, { pubkey: account, isSigner: false, isWritable: true }, { pubkey: owner, isSigner: false, isWritable: false }, { pubkey: mint, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
  ], data: Buffer.alloc(0) });

  const connect = async () => { try { setBusy('connect'); const p = await provider(); setWallet(p.publicKey!.toBase58()); setStatus('Wallet connected.'); setError(''); } catch(e:any){ setError(e.message); } finally { setBusy(null); } };

  const showSale = async (sale: PublicKey, p = readProgram()) => {
    const raw = await p.account.sale.fetch(sale);
    const st = Number(raw.status ?? 0);
    setDerived((d) => ({ ...d, sale: sale.toBase58() }));
    setSaleRows([
      ['Sale PDA', sale.toBase58()], ['Sale ID', raw.saleId.toString()], ['Admin', raw.admin.toBase58()], ['RWA Mint', raw.rwaMint.toBase58()], ['Total Supply', raw.totalSupply.toString()], ['Soft Cap', raw.softCap.toString()], ['Total Reserved', raw.totalReserved.toString()], ['Status', `${st} · ${statusName(st)}`], ['End Timestamp', raw.endTs.toString()], ['Finalized Timestamp', raw.finalizedTs.toString()]
    ]);
  };

  const loadDemo = async () => { try { setBusy('sale'); setError(''); setStatus('Loading demo sale...'); await showSale(DEMO_SALE); setStatus('Demo sale loaded.'); } catch(e:any){ setError(e.message); setStatus('Load failed.'); } finally { setBusy(null); } };

  const fetchMine = async () => { try { setBusy('sale'); setError(''); const p = await provider(); const pr = await program(); const sale = salePda(p.publicKey!, asU64(saleId, '1')); await showSale(sale, pr); setStatus('Sale fetched.'); } catch(e:any){ setError(e.message); setStatus('Fetch failed.'); } finally { setBusy(null); } };

  const createSale = async () => { try { setBusy('sale'); setError(''); const p = await provider(); const pr = await program(); const admin = p.publicKey!; const id = asU64(saleId, '1'); const sale = salePda(admin, id); const sig = await pr.methods.initializeSale(new BN(id), new BN(asU64(supply, '1000')), new BN(asU64(softCap, '500')), new BN(Math.floor(Date.now()/1000) + Number(asU64(hours, '24'))*3600)).accounts({ admin, sale, rwaMint: new PublicKey(rwaMint), mintAuthority: mintAuth(sale), treasuryAuthority: treasuryAuth(sale), tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).rpc(); setTx(sig); await connection.confirmTransaction(sig, 'confirmed'); await showSale(sale, pr); setStatus('Sale created.'); } catch(e:any){ setError(e.message); setStatus('Create failed.'); } finally { setBusy(null); } };

  const ensureAta = async (payer: PublicKey, owner: PublicKey, mint: PublicKey) => { const account = ata(owner, mint); if (await connection.getAccountInfo(account)) return account; const p = await provider(); const bh = await connection.getLatestBlockhash('confirmed'); const t = new Transaction({ feePayer: payer, recentBlockhash: bh.blockhash }).add(ataIx(payer, account, owner, mint)); const signed = await p.signTransaction(t); const sig = await connection.sendRawTransaction(signed.serialize()); await connection.confirmTransaction({ signature: sig, ...bh }, 'confirmed'); return account; };

  const addPayment = async () => { try { setBusy('payment'); setError(''); setStatus('Adding payment option...'); const p = await provider(); const pr = await program(); const admin = p.publicKey!; const sale = salePda(admin, asU64(saleId, '1')); const mint = new PublicKey(paymentMint); const option = paymentOption(sale, mint); const treasury = treasuryAuth(sale); const treasuryAta = await ensureAta(admin, treasury, mint); const sig = await pr.methods.addPaymentOption(new BN(asU64(price, '1'))).accounts({ sale, admin, paymentMint: mint, paymentOption: option, treasuryPaymentAta: treasuryAta, treasuryAuthority: treasury, systemProgram: SystemProgram.programId }).rpc(); setTx(sig); await connection.confirmTransaction(sig, 'confirmed'); const raw = await pr.account.paymentOption.fetch(option); setPaymentRows([['Payment Option PDA', option.toBase58()], ['Sale', raw.sale.toBase58()], ['Payment Mint', raw.paymentMint.toBase58()], ['Treasury ATA', raw.treasuryAta.toBase58()], ['Price per RWA token', raw.pricePerRwaToken.toString()]]); setDerived({ sale: sale.toBase58(), option: option.toBase58(), treasuryAta: treasuryAta.toBase58() }); await showSale(sale, pr); setStatus('Payment option added.'); } catch(e:any){ setError(e.message); setStatus('Payment option failed.'); } finally { setBusy(null); } };

  return <div className="site-shell"><div className="container"><header className="topbar glass-card"><div className="brand-row"><div className="brand-mark">AB</div><div><div className="eyebrow">Live Devnet RWA Demo</div><div className="brand-title">AssetBridge Tokenization Studio</div></div></div><div className="topbar-pills"><div className="stat-pill"><span className="stat-pill__label">Program</span><span className="stat-pill__value">{s(PROGRAM_ID.toBase58())}</span></div><div className="stat-pill"><span className="stat-pill__label">Network</span><span className="stat-pill__value">Devnet</span></div></div></header>
  <section className="hero-grid"><div className="hero-panel glass-card"><div className="eyebrow badge-soft">Payment option milestone</div><h1 className="hero-title">RWA sale demo with admin payment setup.</h1><p className="hero-copy">Load the demo sale, create a new sale, or add the payment option needed before investor purchases.</p><div className="hero-actions">{wallet ? <Button variant="secondary" onClick={() => window.solana?.disconnect().then(()=>setWallet(''))}>Disconnect {s(wallet)}</Button> : <Button onClick={connect} disabled={busy==='connect'}>{busy==='connect' ? 'Connecting...' : 'Connect Phantom'}</Button>}<Button variant="ghost" onClick={loadDemo} disabled={busy==='sale'}>Load demo sale</Button></div></div><aside className="hero-side glass-card"><div className="side-label">Current proof</div><div className="mini-proof"><div className="mini-proof__label">Sale PDA</div><div className="mono">{s(derived.sale,12,12)}</div></div><div className="mini-proof"><div className="mini-proof__label">Payment Mint</div><div className="mono">{s(PAYMENT_MINT,12,12)}</div></div><div className="mini-proof"><div className="mini-proof__label">Latest Tx</div><div className="mono">{s(tx,12,12)}</div></div></aside></section>
  <section className="demo-section glass-card"><div className="demo-header"><div><div className="section-topline">Live contract demo</div><h2 className="section-title">Initialize sale and add payment option</h2><p className="demo-copy">Use Sale ID 1 for the existing demo. Use 2, 3, 4 for new tests.</p></div></div><div className="demo-grid"><div className="demo-panel panel-dark"><div className="panel-title">Sale</div><div className="form-grid"><div className="field"><label>Sale ID</label><input value={saleId} onChange={e=>setSaleId(e.target.value.replace(/[^0-9]/g,''))}/></div><div className="field"><label>Deadline hours</label><input value={hours} onChange={e=>setHours(e.target.value.replace(/[^0-9]/g,''))}/></div><div className="field field-full"><label>RWA mint</label><input value={rwaMint} onChange={e=>setRwaMint(e.target.value)}/></div><div className="field"><label>Total supply</label><input value={supply} onChange={e=>setSupply(e.target.value.replace(/[^0-9]/g,''))}/></div><div className="field"><label>Soft cap</label><input value={softCap} onChange={e=>setSoftCap(e.target.value.replace(/[^0-9]/g,''))}/></div></div><div className="action-row"><Button onClick={createSale} disabled={!wallet || busy==='sale'}><ArrowRight size={18}/>Create sale</Button><Button variant="ghost" onClick={fetchMine} disabled={!wallet || busy==='sale'}><ChevronRight size={18}/>Fetch my sale</Button></div><div className="panel-title" style={{marginTop:24}}>Admin: add payment option</div><div className="form-grid"><div className="field field-full"><label>Payment mint</label><input value={paymentMint} onChange={e=>setPaymentMint(e.target.value)}/></div><div className="field field-full"><label>Price per RWA token</label><input value={price} onChange={e=>setPrice(e.target.value.replace(/[^0-9]/g,''))}/></div></div><div className="action-row"><Button onClick={addPayment} disabled={!wallet || busy==='payment'}><Coins size={18}/>Add payment option</Button></div></div><Card title="Status"><div className="status-box">{status}</div>{error && <div className="notice notice-error">{error}</div>}<div className="info-list"><Row label="Connected wallet" value={wallet}/><Row label="Sale PDA" value={derived.sale}/><Row label="Payment option PDA" value={derived.option}/><Row label="Treasury payment ATA" value={derived.treasuryAta}/><Row label="Latest transaction" value={tx}/></div><a className="text-link" href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`} target="_blank" rel="noreferrer">Open in Solana Explorer</a></Card></div>
  <div className="content-grid"><div><div className="section-topline">Sale account</div>{saleRows.length ? <StateRows rows={saleRows}/> : <div className="empty-state">Load or create a sale first.</div>}</div><div><div className="section-topline">Payment option account</div>{paymentRows.length ? <StateRows rows={paymentRows}/> : <div className="empty-state">Add payment option to see decoded state.</div>}</div></div></section><footer className="footer-strip glass-card"><div><div className="footer-title">Current MVP scope</div><div className="footer-copy">Sale initialization, state reading, and payment option setup. Next: buyer flow.</div></div><div className="footer-badge"><ShieldCheck size={18}/>Devnet</div></footer></div></div>;
}
