import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Coins,
  FileText,
  Globe,
  Landmark,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Buffer } from "buffer";

const isBrowser = typeof window !== "undefined";

if (isBrowser && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
    Buffer?: typeof Buffer;
  }
}

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("H25He6vZt9kv7z4AQYeosBifs6SMML8jynSSqFhHXVgZ");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const DEFAULT_RWA_MINT = "5ziuRY49o4jUUAPPjbWZZPT68uYsk7GxX5zP2YigidSv";
const DEMO_SALE_PDA = "5gHnjckzDHtdcKKcpgYWfLsiSsmB5khtrRU3osnrTRvP";
const DEMO_ADMIN = "CsSCxuAh7UR5zTPYFKyttrGzQgP48kWqgLAsP2R2Fuvi";
const DEMO_TX = "2gFAiV2NhWb2aMrR22iRXYvFrUkL4CwKSkKYvzYP4k51x5QJv4XWt3RarAUDmhEfhVNf1M8PF1K59CPogBwiVtrP";

const IDL = {
  address: PROGRAM_ID.toBase58(),
  metadata: {
    name: "rwa_sale_anchor_contract_v1",
    version: "0.1.0",
    spec: "0.1.0",
    description: "RWA sale MVP with payment options",
  },
  instructions: [
    {
      name: "initializeSale",
      discriminator: [208, 103, 34, 154, 179, 6, 125, 208],
      accounts: [
        { name: "admin", writable: true, signer: true },
        { name: "sale", writable: true },
        { name: "rwaMint", writable: true },
        { name: "mintAuthority" },
        { name: "treasuryAuthority" },
        { name: "tokenProgram", address: TOKEN_PROGRAM_ID.toBase58() },
        { name: "systemProgram", address: SystemProgram.programId.toBase58() },
      ],
      args: [
        { name: "saleId", type: "u64" },
        { name: "totalSupply", type: "u64" },
        { name: "softCap", type: "u64" },
        { name: "endTs", type: "i64" },
      ],
    },
  ],
  accounts: [
    {
      name: "sale",
      discriminator: [202, 64, 232, 171, 178, 172, 34, 183],
    },
  ],
  types: [
    {
      name: "sale",
      type: {
        kind: "struct",
        fields: [
          { name: "saleId", type: "u64" },
          { name: "admin", type: "pubkey" },
          { name: "rwaMint", type: "pubkey" },
          { name: "totalSupply", type: "u64" },
          { name: "softCap", type: "u64" },
          { name: "totalReserved", type: "u64" },
          { name: "endTs", type: "i64" },
          { name: "finalizedTs", type: "i64" },
          { name: "status", type: "u8" },
          { name: "bump", type: "u8" },
          { name: "mintAuthorityBump", type: "u8" },
          { name: "treasuryAuthorityBump", type: "u8" },
        ],
      },
    },
  ],
} as any;

type SaleView = {
  saleId: string;
  admin: string;
  rwaMint: string;
  totalSupply: string;
  softCap: string;
  totalReserved: string;
  endTs: string;
  finalizedTs: string;
  status: number;
  statusLabel: string;
  bump: number;
  mintAuthorityBump: number;
  treasuryAuthorityBump: number;
  pda: string;
};

type TabKey = "interact" | "state" | "proof";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const serviceCards = [
  {
    icon: Building2,
    title: "Tokenization structuring",
    text: "Asset packaging, issuance architecture, token design, and investor-facing product positioning.",
  },
  {
    icon: Landmark,
    title: "Investor portal",
    text: "A polished sales experience that lets an issuer present the asset and show live blockchain proof.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance layer",
    text: "KYC, legal workstreams, permissions, and process controls can be layered on top of the MVP shell.",
  },
  {
    icon: Blocks,
    title: "Solana execution",
    text: "This demo already talks to a deployed Solana contract on devnet and reads live state on-chain.",
  },
];

const outcomes = [
  "Premium landing page for issuers and investors",
  "Wallet connection with Phantom",
  "Live devnet contract interaction",
  "Readable proof of sale initialization on-chain",
];

const roadmap = [
  "Assess the asset and define the tokenization model",
  "Structure issuance, investor journey, and compliance scope",
  "Launch investor-facing website and live portal",
  "Deploy Solana contract and record on-chain proof",
  "Expand into payments, allocations, and reporting workflows",
];

function short(value?: string | null, left = 4, right = 4) {
  if (!value) return "—";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function formatTs(ts?: string) {
  if (!ts) return "—";
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Date(n * 1000).toLocaleString();
}

function saleStatusLabel(status: number) {
  switch (status) {
    case 0:
      return "Active";
    case 1:
      return "Successful";
    case 2:
      return "Failed";
    case 3:
      return "Cancelled";
    default:
      return `Unknown (${status})`;
  }
}

function parsePositiveInt(input: string, fallback: string) {
  const value = input.trim() || fallback;
  if (!/^\d+$/.test(value)) {
    throw new Error("Use only positive integer values.");
  }
  return value;
}

function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pill">
      <span className="stat-pill__label">{label}</span>
      <span className="stat-pill__value">{value}</span>
    </div>
  );
}

function SaleStateGrid({ saleState }: { saleState: SaleView | null }) {
  if (!saleState) {
    return <div className="empty-state">Load the live demo sale or create your own sale account to see decoded on-chain state here.</div>;
  }

  const rows = [
    ["Sale PDA", saleState.pda],
    ["Sale ID", saleState.saleId],
    ["Admin", saleState.admin],
    ["RWA Mint", saleState.rwaMint],
    ["Total Supply", saleState.totalSupply],
    ["Soft Cap", saleState.softCap],
    ["Total Reserved", saleState.totalReserved],
    ["End Date", `${saleState.endTs} · ${formatTs(saleState.endTs)}`],
    ["Status", `${saleState.status} · ${saleState.statusLabel}`],
    ["Finalized Timestamp", saleState.finalizedTs === "0" ? "Not finalized" : `${saleState.finalizedTs} · ${formatTs(saleState.finalizedTs)}`],
    ["Sale Bump", String(saleState.bump)],
    ["Mint Authority Bump", String(saleState.mintAuthorityBump)],
    ["Treasury Authority Bump", String(saleState.treasuryAuthorityBump)],
  ];

  return (
    <div className="state-grid">
      {rows.map(([label, value]) => (
        <div className="state-card" key={label}>
          <div className="state-card__label">{label}</div>
          <div className="state-card__value">{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const connection = useMemo(() => new Connection(RPC_ENDPOINT, "confirmed"), []);

  const [phantomReady, setPhantomReady] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState<"create" | "fetch" | "demo" | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("interact");
  const [saleId, setSaleId] = useState("1");
  const [rwaMint, setRwaMint] = useState(DEFAULT_RWA_MINT);
  const [totalSupply, setTotalSupply] = useState("1000");
  const [softCap, setSoftCap] = useState("500");
  const [hoursAhead, setHoursAhead] = useState("24");
  const [saleState, setSaleState] = useState<SaleView | null>(null);
  const [derivedPda, setDerivedPda] = useState("");
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState("Ready to demo the live Solana MVP.");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isBrowser) return;
    const provider = window.solana;
    setPhantomReady(Boolean(provider?.isPhantom));
    if (provider?.publicKey) {
      const address = provider.publicKey.toBase58();
      setWalletAddress(address);
    }
  }, []);

  const deriveSalePda = (admin: PublicKey, currentSaleId: string) => {
    const saleIdBn = new BN(currentSaleId || "0");
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("sale"), admin.toBuffer(), saleIdBn.toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID
    );
    return pda;
  };

  const deriveMintAuthorityPda = (salePda: PublicKey) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint-authority"), salePda.toBuffer()],
      PROGRAM_ID
    );
    return pda;
  };

  const deriveTreasuryAuthorityPda = (salePda: PublicKey) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury-authority"), salePda.toBuffer()],
      PROGRAM_ID
    );
    return pda;
  };

  const getProvider = async () => {
    if (!isBrowser) {
      throw new Error("Wallet connection is only available in the browser.");
    }
    const provider = window.solana;
    if (!provider?.isPhantom) {
      throw new Error("Phantom wallet was not detected. Open the site in a browser with Phantom installed.");
    }
    if (!provider.publicKey) {
      await provider.connect();
    }
    return provider;
  };

  const makeWritableProgram = async () => {
    const provider = await getProvider();
    const anchorProvider = new AnchorProvider(connection, provider as any, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    return new Program(IDL, anchorProvider as any);
  };

  const makeReadonlyProgram = () => {
    const readonlyProvider = {
      connection,
      publicKey: undefined,
    };
    return new Program(IDL, readonlyProvider as any);
  };

  const normalizeSale = (raw: any, pda: string): SaleView => {
    const status = Number(raw.status ?? 0);

    return {
      saleId: raw.saleId?.toString?.() ?? String(raw.saleId),
      admin: raw.admin?.toBase58?.() ?? String(raw.admin),
      rwaMint: raw.rwaMint?.toBase58?.() ?? String(raw.rwaMint),
      totalSupply: raw.totalSupply?.toString?.() ?? String(raw.totalSupply),
      softCap: raw.softCap?.toString?.() ?? String(raw.softCap),
      totalReserved: raw.totalReserved?.toString?.() ?? String(raw.totalReserved),
      endTs: raw.endTs?.toString?.() ?? String(raw.endTs),
      finalizedTs: raw.finalizedTs?.toString?.() ?? String(raw.finalizedTs),
      status,
      statusLabel: saleStatusLabel(status),
      bump: Number(raw.bump),
      mintAuthorityBump: Number(raw.mintAuthorityBump),
      treasuryAuthorityBump: Number(raw.treasuryAuthorityBump),
      pda,
    };
  };

  const connectWallet = async () => {
    try {
      setError("");
      setStatus("Connecting Phantom wallet...");
      setConnecting(true);
      const provider = await getProvider();
      const address = provider.publicKey!.toBase58();
      setWalletAddress(address);
      setStatus("Wallet connected.");
    } catch (e: any) {
      setError(e?.message || "Failed to connect wallet.");
      setStatus("Wallet connection failed.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (isBrowser) await window.solana?.disconnect();
    } catch {
      // ignore
    }
    setWalletAddress("");
    setStatus("Wallet disconnected.");
  };

  const loadDemoSale = async () => {
    try {
      setError("");
      setBusy("demo");
      setStatus("Loading the live demo sale from devnet...");

      if (!DEMO_SALE_PDA) {
        throw new Error("No demo sale is configured yet. Create a sale first, then copy its Derived sale PDA and Latest transaction into the site constants.");
      }

      const demoSalePda = new PublicKey(DEMO_SALE_PDA);
      const program = makeReadonlyProgram();
      const raw = await program.account.sale.fetch(demoSalePda);
      setSaleState(normalizeSale(raw, demoSalePda.toBase58()));
      setDerivedPda(demoSalePda.toBase58());
      setTxHash(DEMO_TX);
      setActiveTab("state");
      setStatus("Live demo sale loaded successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to load the live demo sale.");
      setStatus("Unable to load demo sale.");
    } finally {
      setBusy(null);
    }
  };

  const fetchMySale = async () => {
    try {
      setError("");
      setBusy("fetch");
      setStatus("Reading your sale account from devnet...");
      const provider = await getProvider();
      const program = await makeWritableProgram();
      const validatedSaleId = parsePositiveInt(saleId, "1");
      const salePda = deriveSalePda(provider.publicKey!, validatedSaleId);
      setDerivedPda(salePda.toBase58());
      const raw = await program.account.sale.fetch(salePda);
      setSaleState(normalizeSale(raw, salePda.toBase58()));
      setActiveTab("state");
      setStatus("Sale account fetched successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to fetch your sale account.");
      setStatus("Fetch failed.");
    } finally {
      setBusy(null);
    }
  };

  const createSale = async () => {
    try {
      setError("");
      setBusy("create");
      setStatus("Sending initializeSale transaction...");

      const provider = await getProvider();
      const program = await makeWritableProgram();
      const admin = provider.publicKey!;

      const validatedSaleId = parsePositiveInt(saleId, "1");
      const validatedSupply = parsePositiveInt(totalSupply, "1000");
      const validatedSoftCap = parsePositiveInt(softCap, "500");
      const validatedHours = parsePositiveInt(hoursAhead, "24");

      if (BigInt(validatedSoftCap) > BigInt(validatedSupply)) {
        throw new Error("Soft cap cannot be greater than total supply.");
      }

      if (!rwaMint.trim()) {
        throw new Error("Enter the SPL token mint address, not your wallet address.");
      }

      const salePda = deriveSalePda(admin, validatedSaleId);
      const mintPk = new PublicKey(rwaMint.trim());
      const mintAuthority = deriveMintAuthorityPda(salePda);
      const treasuryAuthority = deriveTreasuryAuthorityPda(salePda);
      const endTs = new BN(Math.floor(Date.now() / 1000) + Math.max(1, Number(validatedHours)) * 3600);

      const signature = await program.methods
        .initializeSale(new BN(validatedSaleId), new BN(validatedSupply), new BN(validatedSoftCap), endTs)
        .accounts({
          admin,
          sale: salePda,
          rwaMint: mintPk,
          mintAuthority,
          treasuryAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxHash(signature);
      setDerivedPda(salePda.toBase58());
      await connection.confirmTransaction(signature, "confirmed");
      const raw = await program.account.sale.fetch(salePda);
      setSaleState(normalizeSale(raw, salePda.toBase58()));
      setActiveTab("state");
      setStatus("Sale account created and confirmed on devnet.");
    } catch (e: any) {
      setError(e?.message || "Failed to create sale account.");
      setStatus("Transaction failed.");
    } finally {
      setBusy(null);
    }
  };

  const liveProofUrl = txHash || DEMO_TX ? `https://explorer.solana.com/tx/${txHash || DEMO_TX}?cluster=devnet` : "https://explorer.solana.com/?cluster=devnet";

  return (
    <div className="site-shell">
      <div className="site-glow site-glow--left" />
      <div className="site-glow site-glow--right" />

      <div className="container">
        <header className="topbar glass-card">
          <div className="brand-row">
            <div className="brand-mark">AB</div>
            <div>
              <div className="eyebrow">Live Devnet RWA Demo</div>
              <div className="brand-title">AssetBridge Tokenization Studio</div>
            </div>
          </div>
          <div className="topbar-pills">
            <StatPill label="Program" value={short(PROGRAM_ID.toBase58(), 6, 6)} />
            <StatPill label="Network" value="Devnet" />
          </div>
        </header>

        <section className="hero-grid">
          <motion.div className="hero-panel glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="eyebrow badge-soft">Institutional-grade tokenization</div>
            <h1 className="hero-title">Launch tokenized assets with a premium investor experience and live on-chain proof.</h1>
            <p className="hero-copy">
              A presentation-ready tokenization website for issuers and investors. This live demo combines premium fintech design,
              Phantom wallet connection, and direct interaction with a deployed Solana smart contract.
            </p>

            <div className="hero-actions">
              {!walletAddress ? (
                <Button onClick={connectWallet} disabled={connecting}>
                  {connecting ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}
                  Connect Phantom
                </Button>
              ) : (
                <Button variant="secondary" onClick={disconnectWallet}>
                  Disconnect {short(walletAddress, 5, 5)}
                </Button>
              )}

              <Button variant="ghost" onClick={loadDemoSale} disabled={busy === "demo"}>
                {busy === "demo" ? <Loader2 className="spin" size={18} /> : <Globe size={18} />}
                Load live demo sale
              </Button>
            </div>

            <div className="trust-row">
              <div className="trust-item">
                <CheckCircle2 size={18} />
                Live smart contract integration
              </div>
              <div className="trust-item">
                <CheckCircle2 size={18} />
                Wallet-ready investor portal
              </div>
              <div className="trust-item">
                <CheckCircle2 size={18} />
                Designed for issuer demos
              </div>
            </div>
          </motion.div>

          <motion.aside className="hero-side glass-card" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="side-label">What this live demo proves</div>
            <ul className="check-list">
              {outcomes.map((item) => (
                <li key={item}>
                  <BadgeCheck size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mini-proof">
              <div className="mini-proof__label">Latest transaction</div>
              <div className="mono">{txHash || DEMO_TX ? short(txHash || DEMO_TX, 12, 12) : "Create sale first"}</div>
            </div>
            <div className="mini-proof">
              <div className="mini-proof__label">Demo Sale PDA</div>
              <div className="mono">{DEMO_SALE_PDA ? short(DEMO_SALE_PDA, 12, 12) : "Create sale first"}</div>
            </div>
          </motion.aside>
        </section>

        <section className="services-grid">
          {serviceCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.title}
                className="service-card glass-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.07 }}
              >
                <div className="service-card__icon">
                  <Icon size={22} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </motion.article>
            );
          })}
        </section>

        <section className="content-grid">
          <div className="glass-card section-card">
            <div className="section-topline">Execution roadmap</div>
            <h2 className="section-title">From structuring to investor launch</h2>
            <div className="roadmap-list">
              {roadmap.map((step, index) => (
                <div className="roadmap-item" key={step}>
                  <div className="roadmap-index">{index + 1}</div>
                  <div>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card section-card section-card--accent">
            <div className="section-topline">Commercial fit</div>
            <h2 className="section-title">Why an investor will take this seriously</h2>
            <div className="fit-grid">
              {[
                { icon: Briefcase, title: "Issuer-ready", text: "Looks credible for real estate, private placements, and structured digital offerings." },
                { icon: Coins, title: "Investor-facing", text: "Shows an accessible path from asset story to wallet interaction and verified blockchain state." },
                { icon: FileText, title: "Expandable", text: "Ready for KYC, documents, gated access, and later payment / allocation logic." },
                { icon: Sparkles, title: "Demo-friendly", text: "Strong enough for a live investor call, not just a static prototype or slide deck." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div className="fit-card" key={item.title}>
                    <Icon size={18} />
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="demo-section glass-card">
          <div className="demo-header">
            <div>
              <div className="section-topline">Live contract demo</div>
              <h2 className="section-title">Interact with the deployed Solana MVP</h2>
              <p className="demo-copy">
                Connect Phantom and initialize a sale account on devnet using the new deployed RWA sale contract.
              </p>
            </div>
            <div className="demo-pills">
              <StatPill label="Program ID" value={short(PROGRAM_ID.toBase58(), 8, 8)} />
              <StatPill label="Demo Admin" value={short(DEMO_ADMIN, 8, 8)} />
            </div>
          </div>

          <div className="tabs-row">
            {(["interact", "state", "proof"] as TabKey[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab-btn ${activeTab === tab ? "tab-btn--active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "interact" ? "Interact" : tab === "state" ? "Sale state" : "Proof"}
              </button>
            ))}
          </div>

          {activeTab === "interact" && (
            <div className="demo-grid">
              <div className="demo-panel panel-dark">
                <div className="panel-title">Create or fetch a sale</div>
                <div className="form-grid">
                  <div className="field">
                    <label>Sale ID</label>
                    <input value={saleId} onChange={(e) => setSaleId(e.target.value.replace(/[^0-9]/g, ""))} />
                  </div>
                  <div className="field">
                    <label>Deadline (hours ahead)</label>
                    <input value={hoursAhead} onChange={(e) => setHoursAhead(e.target.value.replace(/[^0-9]/g, ""))} />
                  </div>
                  <div className="field field-full">
                    <label>RWA mint / SPL token mint address</label>
                    <input value={rwaMint} onChange={(e) => setRwaMint(e.target.value)} placeholder="Enter a devnet SPL token mint" />
                  </div>
                  <div className="field field-full">
                    <label>Total supply</label>
                    <input value={totalSupply} onChange={(e) => setTotalSupply(e.target.value.replace(/[^0-9]/g, ""))} />
                  </div>
                  <div className="field field-full">
                    <label>Soft cap</label>
                    <input value={softCap} onChange={(e) => setSoftCap(e.target.value.replace(/[^0-9]/g, ""))} />
                  </div>
                </div>

                <div className="action-row">
                  <Button onClick={createSale} disabled={!walletAddress || busy === "create"}>
                    {busy === "create" ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
                    Create sale on devnet
                  </Button>
                  <Button variant="ghost" onClick={fetchMySale} disabled={!walletAddress || busy === "fetch"}>
                    {busy === "fetch" ? <Loader2 className="spin" size={18} /> : <ChevronRight size={18} />}
                    Fetch my sale
                  </Button>
                </div>

                {!phantomReady && (
                  <div className="notice notice-warning">
                    Phantom is not detected. You can still load the existing demo sale, but wallet-based transactions require Phantom in the browser.
                  </div>
                )}
              </div>

              <div className="demo-panel panel-muted">
                <div className="panel-title">Live session status</div>
                <div className="status-box">{status}</div>
                {error && <div className="notice notice-error">{error}</div>}
                <div className="info-list">
                  <div className="info-card">
                    <span>Connected wallet</span>
                    <strong>{walletAddress || "—"}</strong>
                  </div>
                  <div className="info-card">
                    <span>Derived sale PDA</span>
                    <strong>{derivedPda || "—"}</strong>
                  </div>
                  <div className="info-card info-card--wide">
                    <span>Latest transaction</span>
                    <strong>{txHash || "—"}</strong>
                  </div>
                </div>
                <div className="proof-actions">
                  <Button variant="ghost" onClick={loadDemoSale} disabled={busy === "demo"}>
                    {busy === "demo" ? <Loader2 className="spin" size={18} /> : <Globe size={18} />}
                    Load existing demo sale
                  </Button>
                  <a className="text-link" href={liveProofUrl} target="_blank" rel="noreferrer">
                    Open transaction in Solana Explorer
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === "state" && <SaleStateGrid saleState={saleState} />}

          {activeTab === "proof" && (
            <div className="proof-grid">
              <div className="proof-card">
                <span>Program ID</span>
                <strong>{PROGRAM_ID.toBase58()}</strong>
              </div>
              <div className="proof-card">
                <span>Demo Sale PDA</span>
                <strong>{DEMO_SALE_PDA || "Create a sale first"}</strong>
              </div>
              <div className="proof-card">
                <span>Demo Transaction</span>
                <strong>{DEMO_TX || "Create a sale first"}</strong>
              </div>
            </div>
          )}
        </section>

        <footer className="footer-strip glass-card">
          <div>
            <div className="footer-title">Current MVP scope</div>
            <div className="footer-copy">
              The live contract supports sale initialization, payment options, purchases, finalization, claims, refunds, and withdrawals. This site currently exposes the initialization and state-reading flow.
            </div>
          </div>
          <div className="footer-badge">
            <ShieldCheck size={18} />
            Deployed live on devnet
          </div>
        </footer>
      </div>
    </div>
  );
}
