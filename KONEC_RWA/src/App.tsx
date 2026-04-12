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
const PROGRAM_ID = new PublicKey("G9acQdREqSrvNhp2hHUWYsMtfBFJJKkudAANYjM5d6DM");
const DEMO_SALE_PDA = new PublicKey("6kMtPKcCRvDP62PPjrUgDKACGb14daZZ2pwnGWNx9oAK");
const DEMO_ADMIN = "CsSCxuAh7UR5zTPYFKyttrGzQgP48kWqgLAsP2R2Fuvi";
const DEMO_TX =
  "faGUcpG7D4eFQFyW5BPZhoTPd7bAW6rt1eeuBxhVZouZGx8X8m4bcuUissZ2R8Zqb7cwtyp4kUB3zFuK4qXFoHU";

const IDL = {
  address: PROGRAM_ID.toBase58(),
  metadata: {
    name: "rwa_sale_anchor_contract_v1",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Minimal RWA sale MVP",
  },
  instructions: [
    {
      name: "initializeSale",
      discriminator: [0, 0, 0, 0, 0, 0, 0, 1],
      accounts: [
        { name: "admin", writable: true, signer: true },
        { name: "sale", writable: true },
        { name: "systemProgram", address: SystemProgram.programId.toBase58() },
      ],
      args: [
        { name: "saleId", type: "u64" },
        { name: "rwaMint", type: "pubkey" },
        { name: "totalSupply", type: "u64" },
        { name: "endTs", type: "i64" },
      ],
    },
  ],
  accounts: [
    {
      name: "sale",
      discriminator: [0, 0, 0, 0, 0, 0, 0, 2],
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
          { name: "totalReserved", type: "u64" },
          { name: "endTs", type: "i64" },
          { name: "finalizedTs", type: "i64" },
          { name: "finalized", type: "bool" },
          { name: "bump", type: "u8" },
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
  totalReserved: string;
  endTs: string;
  finalizedTs: string;
  finalized: boolean;
  bump: number;
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
    ["Total Reserved", saleState.totalReserved],
    ["End Date", `${saleState.endTs} · ${formatTs(saleState.endTs)}`],
    ["Finalized", saleState.finalized ? "true" : "false"],
    ["Finalized Timestamp", saleState.finalizedTs === "0" ? "Not finalized" : `${saleState.finalizedTs} · ${formatTs(saleState.finalizedTs)}`],
    ["Bump", String(saleState.bump)],
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
  const [saleId, setSaleId] = useState("2");
  const [rwaMint, setRwaMint] = useState("");
  const [totalSupply, setTotalSupply] = useState("1000000");
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
      setRwaMint((prev) => prev || address);
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

  const normalizeSale = (raw: any, pda: string): SaleView => ({
    saleId: raw.saleId?.toString?.() ?? String(raw.saleId),
    admin: raw.admin?.toBase58?.() ?? String(raw.admin),
    rwaMint: raw.rwaMint?.toBase58?.() ?? String(raw.rwaMint),
    totalSupply: raw.totalSupply?.toString?.() ?? String(raw.totalSupply),
    totalReserved: raw.totalReserved?.toString?.() ?? String(raw.totalReserved),
    endTs: raw.endTs?.toString?.() ?? String(raw.endTs),
    finalizedTs: raw.finalizedTs?.toString?.() ?? String(raw.finalizedTs),
    finalized: Boolean(raw.finalized),
    bump: Number(raw.bump),
    pda,
  });

  const connectWallet = async () => {
    try {
      setError("");
      setStatus("Connecting Phantom wallet...");
      setConnecting(true);
      const provider = await getProvider();
      const address = provider.publicKey!.toBase58();
      setWalletAddress(address);
      setRwaMint((prev) => prev || address);
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
      const program = makeReadonlyProgram();
      const raw = await program.account.sale.fetch(DEMO_SALE_PDA);
      setSaleState(normalizeSale(raw, DEMO_SALE_PDA.toBase58()));
      setDerivedPda(DEMO_SALE_PDA.toBase58());
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
      const validatedSupply = parsePositiveInt(totalSupply, "1000000");
      const validatedHours = parsePositiveInt(hoursAhead, "24");
      const salePda = deriveSalePda(admin, validatedSaleId);
      const mintPk = new PublicKey((rwaMint || admin.toBase58()).trim());
      const endTs = new BN(Math.floor(Date.now() / 1000) + Math.max(1, Number(validatedHours)) * 3600);

      const signature = await program.methods
        .initializeSale(new BN(validatedSaleId), mintPk, new BN(validatedSupply), endTs)
        .accounts({
          admin,
          sale: salePda,
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

  const liveProofUrl = `https://explorer.solana.com/tx/${txHash || DEMO_TX}?cluster=devnet`;

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
              <div className="mono">{short(txHash || DEMO_TX, 12, 12)}</div>
            </div>
            <div className="mini-proof">
              <div className="mini-proof__label">Demo Sale PDA</div>
              <div className="mono">{short(DEMO_SALE_PDA.toBase58(), 12, 12)}</div>
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
                Connect Phantom, initialize a sale account on devnet, or simply load the existing on-chain example that was already deployed.
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
                    <label>RWA mint / placeholder public key</label>
                    <input value={rwaMint} onChange={(e) => setRwaMint(e.target.value)} placeholder="Enter a Solana public key" />
                  </div>
                  <div className="field field-full">
                    <label>Total supply</label>
                    <input value={totalSupply} onChange={(e) => setTotalSupply(e.target.value.replace(/[^0-9]/g, ""))} />
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
                <strong>{DEMO_SALE_PDA.toBase58()}</strong>
              </div>
              <div className="proof-card">
                <span>Demo Transaction</span>
                <strong>{DEMO_TX}</strong>
              </div>
            </div>
          )}
        </section>

        <footer className="footer-strip glass-card">
          <div>
            <div className="footer-title">Current MVP scope</div>
            <div className="footer-copy">
              The live contract currently supports sale initialization and on-chain state reading. Payments, claims, and expanded investor flows can be layered on in the next release.
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
