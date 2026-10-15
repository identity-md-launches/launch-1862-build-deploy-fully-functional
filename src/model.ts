export type Asset = "BTC" | "ETH" | "SOL" | "LINK" | "AVAX" | "UNI";
export type Allocation = { asset: Asset; percent: number };
export type Vault = {
  id: string;
  name: string;
  description: string;
  category: "Official" | "Community";
  author: string;
  risk: "Moderate" | "High" | "Very high";
  allocations: Allocation[];
  returnYear: number;
  popularity: number;
  color: string;
  icon: string;
  nav: number;
  archived?: boolean;
  local?: boolean;
};
export type Holding = { vaultId: string; units: number; cost: number };
export type Transaction = {
  id: string;
  kind: "Invest" | "Withdraw" | "Deposit";
  vaultName: string;
  cents: number;
  date: string;
  allocations?: { asset: Asset; cents: number }[];
};
export type State = {
  version: 1;
  cash: number;
  deposited: number;
  realized: number;
  month: number;
  vaults: Vault[];
  holdings: Holding[];
  transactions: Transaction[];
  history: { month: number; value: number }[];
};
export const ASSETS: Record<
  Asset,
  { name: string; color: string; glyph: string }
> = {
  BTC: { name: "Bitcoin", color: "#f3a749", glyph: "₿" },
  ETH: { name: "Ethereum", color: "#a6b7f8", glyph: "Ξ" },
  SOL: { name: "Solana", color: "#bda4f8", glyph: "≋" },
  LINK: { name: "Chainlink", color: "#8aa9ff", glyph: "⬡" },
  AVAX: { name: "Avalanche", color: "#f39191", glyph: "Λ" },
  UNI: { name: "Uniswap", color: "#f59fd0", glyph: "U" },
};
export const SEED_VAULTS: Vault[] = [
  {
    id: "blue-chip",
    name: "Blue Chip Index",
    description:
      "The foundations of crypto. A balanced basket of Bitcoin, Ethereum, and Solana.",
    category: "Official",
    author: "CryptoVault",
    risk: "Moderate",
    allocations: [
      { asset: "BTC", percent: 50 },
      { asset: "ETH", percent: 30 },
      { asset: "SOL", percent: 20 },
    ],
    returnYear: 24.8,
    popularity: 2841,
    color: "#c5f277",
    icon: "layers",
    nav: 10000,
  },
  {
    id: "ethereum",
    name: "Ethereum Ecosystem",
    description:
      "Explore the building blocks of decentralized finance, led by Ethereum.",
    category: "Official",
    author: "CryptoVault",
    risk: "High",
    allocations: [
      { asset: "ETH", percent: 60 },
      { asset: "LINK", percent: 25 },
      { asset: "UNI", percent: 15 },
    ],
    returnYear: 32.6,
    popularity: 1926,
    color: "#b7a3f4",
    icon: "diamond",
    nav: 10000,
  },
  {
    id: "next-wave",
    name: "Next Wave",
    description:
      "A focused collection of emerging networks and the infrastructure behind them.",
    category: "Official",
    author: "CryptoVault",
    risk: "Very high",
    allocations: [
      { asset: "SOL", percent: 50 },
      { asset: "AVAX", percent: 30 },
      { asset: "LINK", percent: 20 },
    ],
    returnYear: 41.2,
    popularity: 1248,
    color: "#90c8f0",
    icon: "wave",
    nav: 10000,
  },
  {
    id: "steady-stack",
    name: "The Steady Stack",
    description:
      "A simple two-asset strategy for exploring the biggest names in crypto.",
    category: "Community",
    author: "alex.eth · example",
    risk: "Moderate",
    allocations: [
      { asset: "BTC", percent: 70 },
      { asset: "ETH", percent: 30 },
    ],
    returnYear: 18.5,
    popularity: 864,
    color: "#e9bc89",
    icon: "stack",
    nav: 10000,
  },
  {
    id: "defi",
    name: "DeFi Discovery",
    description:
      "A thematic portfolio of decentralized exchanges and oracle infrastructure.",
    category: "Community",
    author: "maya.eth · example",
    risk: "Very high",
    allocations: [
      { asset: "ETH", percent: 40 },
      { asset: "UNI", percent: 35 },
      { asset: "LINK", percent: 25 },
    ],
    returnYear: -8.4,
    popularity: 512,
    color: "#e9a8b9",
    icon: "orbit",
    nav: 10000,
  },
  {
    id: "layer-one",
    name: "Layer One Leaders",
    description:
      "Three different approaches to scaling the next generation of blockchains.",
    category: "Community",
    author: "sam.eth · example",
    risk: "High",
    allocations: [
      { asset: "ETH", percent: 40 },
      { asset: "SOL", percent: 40 },
      { asset: "AVAX", percent: 20 },
    ],
    returnYear: 29.3,
    popularity: 728,
    color: "#80d1b4",
    icon: "layers",
    nav: 10000,
  },
];
export function freshState(): State {
  return {
    version: 1,
    cash: 1000000,
    deposited: 1000000,
    realized: 0,
    month: 0,
    vaults: structuredClone(SEED_VAULTS),
    holdings: [],
    transactions: [],
    history: [{ month: 0, value: 1000000 }],
  };
}
export const currency = (cents: number, decimals = true) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(cents / 100);
export const percent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
export function holdingValue(state: State, holding: Holding) {
  return Math.round(
    holding.units *
      (state.vaults.find((v) => v.id === holding.vaultId)?.nav ?? 0),
  );
}
export function portfolioValue(state: State) {
  return state.holdings.reduce((s, h) => s + holdingValue(state, h), 0);
}
export function parseMoney(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return NaN;
  return Math.round(Number(value) * 100);
}
export function validateAllocations(allocations: Allocation[]): string | null {
  if (allocations.length < 2) return "Choose at least two different assets.";
  if (new Set(allocations.map((a) => a.asset)).size !== allocations.length)
    return "Choose each asset only once.";
  if (
    allocations.some(
      (a) =>
        !ASSETS[a.asset] ||
        !Number.isFinite(a.percent) ||
        a.percent <= 0 ||
        a.percent > 100 ||
        Math.abs(a.percent * 100 - Math.round(a.percent * 100)) > 0.000001,
    )
  )
    return "Give every asset a percentage above 0, with at most two decimal places.";
  if (Math.abs(allocations.reduce((s, a) => s + a.percent, 0) - 100) > 0.00001)
    return "Your allocations must total 100%.";
  return null;
}
export function allocateCents(cents: number, allocations: Allocation[]) {
  let remaining = cents;
  return allocations.map((a, i) => {
    const amount =
      i === allocations.length - 1
        ? remaining
        : Math.floor((cents * a.percent) / 100);
    remaining -= amount;
    return { asset: a.asset, cents: amount };
  });
}
function tx(
  kind: Transaction["kind"],
  cents: number,
  vaultName: string,
  allocations?: Transaction["allocations"],
): Transaction {
  return {
    id: crypto.randomUUID(),
    kind,
    cents,
    vaultName,
    date: new Date().toISOString(),
    allocations,
  };
}
export function transact(
  state: State,
  kind: "Invest" | "Withdraw" | "Deposit",
  cents: number,
  vaultId?: string,
): State {
  const fullHolding = state.holdings.find((h) => h.vaultId === vaultId);
  const fullWithdrawal =
    kind === "Withdraw" &&
    fullHolding &&
    holdingValue(state, fullHolding) === cents;
  if (
    !Number.isSafeInteger(cents) ||
    cents < 1 ||
    (cents < 100 && !fullWithdrawal) ||
    cents > 100000000
  )
    throw new Error(
      "Enter an amount from $1 to $1,000,000, with at most two decimal places. Use Max to close a smaller holding.",
    );
  const next = structuredClone(state);
  if (kind === "Deposit") {
    if (next.cash + cents > 100000000)
      throw new Error("Keep your available demo cash at or below $1,000,000.");
    next.cash += cents;
    next.deposited += cents;
    next.transactions.unshift(tx(kind, cents, "Demo cash"));
    next.history[next.history.length - 1] = {
      month: next.month,
      value: next.cash + portfolioValue(next),
    };
    return next;
  }
  const vault = next.vaults.find((v) => v.id === vaultId);
  if (!vault)
    throw new Error("This vault is unavailable. Choose another vault.");
  let holding = next.holdings.find((h) => h.vaultId === vaultId);
  if (kind === "Invest") {
    if (vault.archived)
      throw new Error(
        "This vault is archived. You can still withdraw an existing holding.",
      );
    if (cents > next.cash)
      throw new Error(
        "This amount exceeds your available demo cash. Add demo funds or enter a smaller amount.",
      );
    if (!holding) {
      holding = { vaultId: vault.id, units: 0, cost: 0 };
      next.holdings.push(holding);
    }
    holding.units += cents / vault.nav;
    holding.cost += cents;
    next.cash -= cents;
  } else {
    if (!holding) throw new Error("You have no investment in this vault yet.");
    const value = holdingValue(next, holding);
    if (cents > value)
      throw new Error(
        "This amount exceeds your holding. Enter a smaller amount or choose Max.",
      );
    const fraction = cents / value,
      costRemoved = Math.round(holding.cost * fraction);
    next.realized += cents - costRemoved;
    holding.cost -= costRemoved;
    holding.units *= 1 - fraction;
    next.cash += cents;
    if (cents === value)
      next.holdings = next.holdings.filter((h) => h.vaultId !== vault.id);
  }
  next.transactions.unshift(
    tx(kind, cents, vault.name, allocateCents(cents, vault.allocations)),
  );
  next.history[next.history.length - 1] = {
    month: next.month,
    value: next.cash + portfolioValue(next),
  };
  return next;
}
export function advanceMonth(
  state: State,
  scenario: "growth" | "decline",
): State {
  const next = structuredClone(state);
  next.month++;
  const rates: Record<Asset, number> = {
    BTC: 0.025,
    ETH: 0.04,
    SOL: 0.065,
    LINK: 0.05,
    AVAX: 0.07,
    UNI: 0.08,
  };
  for (const vault of next.vaults) {
    const rate =
      vault.allocations.reduce(
        (s, a) => s + (rates[a.asset] * a.percent) / 100,
        0,
      ) * (scenario === "growth" ? 1 : -1.25);
    vault.nav = Math.max(1, Math.round(vault.nav * (1 + rate)));
  }
  next.history.push({
    month: next.month,
    value: next.cash + portfolioValue(next),
  });
  return next;
}
export const STORAGE_KEY = "cryptovault-simulator-v1";
export function validState(value: unknown): value is State {
  try {
    if (!value || typeof value !== "object") return false;
    const s = value as State;
    return (
      s.version === 1 &&
      Number.isSafeInteger(s.cash) &&
      s.cash >= 0 &&
      Number.isSafeInteger(s.deposited) &&
      Number.isFinite(s.realized) &&
      Number.isInteger(s.month) &&
      Array.isArray(s.vaults) &&
      s.vaults.length > 0 &&
      s.vaults.every(
        (v) =>
          typeof v.id === "string" &&
          typeof v.name === "string" &&
          typeof v.description === "string" &&
          typeof v.author === "string" &&
          ["Official", "Community"].includes(v.category) &&
          ["Moderate", "High", "Very high"].includes(v.risk) &&
          /^#[0-9a-f]{6}$/i.test(v.color) &&
          Number.isFinite(v.returnYear) &&
          Number.isFinite(v.popularity) &&
          Number.isFinite(v.nav) &&
          v.nav > 0 &&
          Array.isArray(v.allocations) &&
          !validateAllocations(v.allocations),
      ) &&
      new Set(s.vaults.map((v) => v.id)).size === s.vaults.length &&
      Array.isArray(s.holdings) &&
      s.holdings.every(
        (h) =>
          s.vaults.some((v) => v.id === h.vaultId) &&
          Number.isFinite(h.units) &&
          h.units > 0 &&
          Number.isSafeInteger(h.cost) &&
          h.cost >= 0,
      ) &&
      Array.isArray(s.transactions) &&
      s.transactions.every(
        (t) =>
          typeof t.id === "string" &&
          typeof t.vaultName === "string" &&
          ["Invest", "Withdraw", "Deposit"].includes(t.kind) &&
          Number.isSafeInteger(t.cents) &&
          !isNaN(Date.parse(t.date)),
      ) &&
      Array.isArray(s.history) &&
      s.history.every(
        (h) => Number.isFinite(h.month) && Number.isFinite(h.value),
      )
    );
  } catch {
    return false;
  }
}
