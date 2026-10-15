import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  advanceMonth,
  allocateCents,
  ASSETS,
  currency,
  freshState,
  holdingValue,
  parseMoney,
  percent,
  portfolioValue,
  STORAGE_KEY,
  transact,
  validState,
  validateAllocations,
  type Allocation,
  type Asset,
  type State,
  type Vault,
} from "./model";
import {
  AllocationBar,
  AllocationList,
  Chart,
  Coin,
  CoinStack,
  Empty,
  Icon,
  Logo,
  Modal,
  Return,
  Stat,
  VaultCard,
  VaultIcon,
} from "./components";

type Action = { kind: "Invest" | "Withdraw" | "Deposit"; vaultId?: string };
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: freshState(), warning: "" };
    const data: unknown = JSON.parse(raw);
    if (validState(data)) return { state: data, warning: "" };
    return {
      state: freshState(),
      warning:
        "Saved demo data could not be read. A new $10,000 practice portfolio is ready.",
    };
  } catch {
    return {
      state: freshState(),
      warning:
        "Browser storage is unavailable. You can explore, but your demo changes may not be saved.",
    };
  }
}
function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  useEffect(() => {
    const onHash = () => {
      setRoute(location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("main h1")?.focus(),
      );
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export default function App() {
  const [initial] = useState(load);
  const [state, setState] = useState<State>(initial.state);
  const [warning, setWarning] = useState(initial.warning);
  const [status, setStatus] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [help, setHelp] = useState(false);
  const [reset, setReset] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [menu, setMenu] = useState(false);
  const route = useRoute();
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setWarning(
        "Changes are available for this visit only. Browser storage is full or disabled.",
      );
    }
  }, [state]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const data: unknown = JSON.parse(e.newValue);
        if (validState(data)) {
          setState(data);
          setStatus("Your demo portfolio was updated in another tab.");
        }
      } catch {
        /* Keep the valid state already in memory. */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    setMenu(false);
  }, [route]);
  const title =
    route === "/"
      ? "Discover"
      : route.startsWith("/explore")
        ? "Explore vaults"
        : route === "/portfolio"
          ? "My portfolio"
          : route.startsWith("/admin")
            ? "Admin studio"
            : route.startsWith("/create")
              ? "Vault creator"
              : "Vault overview";
  useEffect(() => {
    document.title = `${title} · CryptoVault`;
  }, [title]);
  const links = [
    { path: "/", name: "Overview", icon: "home" },
    { path: "/explore", name: "Explore vaults", icon: "compass" },
    { path: "/portfolio", name: "My portfolio", icon: "chart" },
    { path: "/create", name: "Create a vault", icon: "plus" },
  ];
  const nav = (mobile = false) => (
    <nav aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
      {links.map((link) => (
        <a
          key={link.path}
          href={`#${link.path}`}
          aria-current={
            (link.path === "/" ? route === "/" : route.startsWith(link.path))
              ? "page"
              : undefined
          }
        >
          <Icon name={link.icon} />
          <span>{link.name}</span>
          {link.path === "/explore" && (
            <span className="nav-count">
              {state.vaults.filter((v) => !v.archived).length}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
  const update = (next: State, message: string) => {
    setState(next);
    setStatus(message);
  };
  let page: ReactNode;
  if (route === "/")
    page = <Home state={state} openHelp={() => setHelp(true)} />;
  else if (route.startsWith("/explore"))
    page = <Explore key={route} state={state} category={route.split("/")[2]} />;
  else if (route === "/portfolio")
    page = (
      <Portfolio
        state={state}
        onAction={setAction}
        onAdvance={(scenario) =>
          update(
            advanceMonth(state, scenario),
            `Simulated a ${scenario === "growth" ? "rising" : "falling"} month. Your holdings have been updated.`,
          )
        }
        onReset={() => setReset(true)}
      />
    );
  else if (route.startsWith("/vault/")) {
    const vault = state.vaults.find((v) => v.id === route.split("/")[2]);
    page = vault ? (
      <VaultDetail
        key={vault.id}
        vault={vault}
        state={state}
        onAction={setAction}
      />
    ) : (
      <NotFound />
    );
  } else if (route === "/create")
    page = (
      <Creator
        key="community"
        state={state}
        onSave={(vault) => {
          update(
            { ...state, vaults: [...state.vaults, vault] },
            "Your community vault was published in this browser.",
          );
          location.hash = `/vault/${vault.id}`;
        }}
      />
    );
  else if (route === "/admin")
    page = (
      <Admin
        state={state}
        enabled={admin}
        enable={() => setAdmin(true)}
        onToggle={(id) => {
          update(
            {
              ...state,
              vaults: state.vaults.map((v) =>
                v.id === id ? { ...v, archived: !v.archived } : v,
              ),
            },
            "Official vault availability updated in this browser.",
          );
        }}
      />
    );
  else if (route.startsWith("/admin/")) {
    const editId =
      route.split("/")[2] === "edit" ? route.split("/")[3] : undefined;
    const existing = editId
      ? state.vaults.find((v) => v.id === editId && v.category === "Official")
      : undefined;
    page = !admin ? (
      <Admin
        state={state}
        enabled={false}
        enable={() => setAdmin(true)}
        onToggle={() => {}}
      />
    ) : editId && !existing ? (
      <NotFound />
    ) : (
      <Creator
        key={editId ?? "official"}
        state={state}
        official
        existing={existing}
        onSave={(vault) => {
          update(
            {
              ...state,
              vaults: existing
                ? state.vaults.map((v) => (v.id === vault.id ? vault : v))
                : [...state.vaults, vault],
            },
            "Official vault saved in this browser.",
          );
          location.hash = "/admin";
        }}
      />
    );
  } else page = <NotFound />;
  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <Logo />
        {nav()}
        <div className="sidebar-bottom">
          <div className="practice-note">
            <span className="practice-icon">
              <Icon name="wallet" />
            </span>
            <strong>
              Your investment
              <br />
              sandbox.
            </strong>
            <p>Start with $10,000 in demo funds.</p>
            <a href="#/portfolio">
              Open your portfolio <Icon name="arrow" size={16} />
            </a>
          </div>
          <button className="plain sidebar-help" onClick={() => setHelp(true)}>
            <Icon name="help" />
            How it works
          </button>
          <a
            className={`admin-link ${route.startsWith("/admin") ? "active" : ""}`}
            href="#/admin"
          >
            <Icon name="shield" />
            Admin studio
          </a>
          <div className="profile">
            <span className="avatar">Y</span>
            <div>
              <strong>Your workspace</strong>
              <span>Local demo account</span>
            </div>
            <Icon name="chevron" size={16} />
          </div>
        </div>
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <Logo />
          </div>
          <span className="desktop-breadcrumb">{title}</span>
          <div className="topbar-actions">
            <span className="demo-pill">
              <span className="status-dot" />
              Demo mode
            </span>
            <button
              className="icon-button help-button"
              aria-label="How CryptoVault works"
              onClick={() => setHelp(true)}
            >
              <Icon name="help" />
            </button>
            <a
              href="#/portfolio"
              className="avatar top-avatar"
              aria-label="Open your portfolio"
            >
              Y
            </a>
            <button
              className="icon-button menu-button"
              aria-label={menu ? "Close navigation" : "Open navigation"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Icon name={menu ? "close" : "menu"} />
            </button>
          </div>
        </header>
        {menu && (
          <div className="mobile-menu">
            {nav(true)}
            <a href="#/admin">
              <Icon name="shield" />
              Admin studio
            </a>
            <button
              className="plain"
              onClick={() => {
                setHelp(true);
                setMenu(false);
              }}
            >
              How it works
            </button>
          </div>
        )}
        {warning && (
          <div className="storage-warning" role="alert">
            <Icon name="info" />
            {warning}
            <button
              className="icon-button"
              aria-label="Dismiss storage notice"
              onClick={() => setWarning("")}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          {page}
        </main>
        <footer>
          <span>© {new Date().getFullYear()} CryptoVault</span>
          <span>Simulated investments. Real curiosity.</span>
          <button className="text-button" onClick={() => setHelp(true)}>
            About this demo <Icon name="up" size={14} />
          </button>
        </footer>
      </div>
      <div className={`toast ${status ? "visible" : ""}`} role="status">
        {status && (
          <>
            <Icon name="check" />
            <span>{status}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setStatus("")}
            >
              <Icon name="close" size={16} />
            </button>
          </>
        )}
      </div>
      {action && (
        <TransactionModal
          action={action}
          state={state}
          onClose={() => setAction(null)}
          onConfirm={(kind, cents, id) => {
            const next = transact(state, kind, cents, id);
            setState(next);
            return next;
          }}
        />
      )}
      {help && (
        <Modal
          title="A practice space for crypto"
          onClose={() => setHelp(false)}
        >
          <p className="muted">
            CryptoVault lets you explore index-style investing with virtual
            dollars. No wallet, payment details, or real funds are involved.
          </p>
          <ol className="help-steps">
            <li>
              <strong>Pick a portfolio</strong>
              <p>
                Each vault holds a basket of crypto assets. Percentages always
                total 100%.
              </p>
            </li>
            <li>
              <strong>Try an investment</strong>
              <p>
                A $100 investment in Blue Chip Index allocates $50 to BTC, $30
                to ETH, and $20 to SOL.
              </p>
            </li>
            <li>
              <strong>Explore what happens next</strong>
              <p>
                Use market scenarios in your portfolio to simulate gains and
                losses, then withdraw back to demo cash.
              </p>
            </li>
          </ol>
          <div className="notice">
            <Icon name="info" />
            <p>
              All returns, popularity counts, and example creators are
              illustrative. Your vaults and balances are stored only in this
              browser. Community publishing and admin mode are local
              demonstrations, without shared accounts or access control. Nothing
              here is investment advice.
            </p>
          </div>
          <button
            className="button primary full"
            onClick={() => setHelp(false)}
          >
            Start exploring
            <Icon name="arrow" />
          </button>
        </Modal>
      )}
      {reset && (
        <Modal
          title="Reset your demo portfolio?"
          onClose={() => setReset(false)}
        >
          <p className="muted">
            This removes your local vaults, holdings, and transaction history
            and restores $10,000 in demo cash. This cannot be undone.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setReset(false)}
            >
              Keep my portfolio
            </button>
            <button
              className="button danger"
              onClick={() => {
                update(freshState(), "Your demo has been reset to $10,000.");
                setAdmin(false);
                setReset(false);
              }}
            >
              Reset demo
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Home({ state, openHelp }: { state: State; openHelp: () => void }) {
  const featured = state.vaults
    .filter((v) => v.category === "Official" && !v.archived)
    .slice(0, 3);
  const vault = featured[0] ?? state.vaults.find((v) => !v.archived)!;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1 tabIndex={-1}>
            A portfolio,
            <br /> not a <span>prediction.</span>
          </h1>
          <p>
            Discover crypto index vaults.
            <br className="desktop-only" /> Invest in the bigger picture.
          </p>
          <div className="button-row">
            <a href="#/explore" className="button primary">
              Explore vaults <Icon name="arrow" size={18} />
            </a>
            <button className="button ghost" onClick={openHelp}>
              How it works <Icon name="chevron" size={16} />
            </button>
          </div>
          <div className="hero-footnote">
            <Icon name="shield" size={16} />
            Demo funds, with no wallet needed.
          </div>
        </div>
        <div className="hero-chart">
          <div className="row between">
            <div className="row">
              <VaultIcon vault={vault} />
              <div>
                <a className="featured-title" href={`#/vault/${vault.id}`}>
                  {vault.name}
                  <Icon name="up" size={15} />
                </a>
                <span className="small-text muted">
                  {vault.allocations.length} assets in one portfolio.
                </span>
              </div>
            </div>
            <span className="small-text muted">1Y</span>
          </div>
          <div className="hero-chart-value">
            <strong>{percent(vault.returnYear)}</strong>
            <span className="small-text muted">Illustrative annual return</span>
          </div>
          <Chart
            value={vault.returnYear}
            label={`${vault.name}: ${percent(vault.returnYear)} illustrative annual return`}
          />
          <div className="chart-axis">
            <span>Jan</span>
            <span>Apr</span>
            <span>Jul</span>
            <span>Dec</span>
          </div>
          <div className="hero-allocation">
            {vault.allocations.map((a) => (
              <span key={a.asset}>
                <span
                  className="color-dot"
                  style={{ background: ASSETS[a.asset].color }}
                />
                {a.asset}
                <b>{a.percent}%</b>
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="quick-stats" aria-label="Explore the simulator">
        <div>
          <strong>{state.vaults.filter((v) => !v.archived).length}</strong>
          <span>Curated & community vaults</span>
        </div>
        <div>
          <strong>{Object.keys(ASSETS).length}</strong>
          <span>Crypto assets to explore</span>
        </div>
        <div>
          <strong>{currency(state.cash, false)}</strong>
          <span>Your available demo cash</span>
        </div>
        <div>
          <span className="stats-icon">
            <Icon name="shield" size={24} />
          </span>
          <span>
            100% simulated.
            <br />
            Zero real funds at risk.
          </span>
        </div>
      </section>
      <section className="featured-section">
        <div className="section-heading">
          <div>
            <h2>Start with the foundations.</h2>
            <p>Explore our official index portfolios.</p>
          </div>
          <a href="#/explore/Official" className="text-button">
            View all vaults
            <Icon name="arrow" size={16} />
          </a>
        </div>
        <div className="vault-grid">
          {featured.map((v) => (
            <VaultCard key={v.id} vault={v} />
          ))}
        </div>
      </section>
      <section className="create-banner">
        <div className="create-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <h2>Your conviction. Your composition.</h2>
          <p>Build a crypto portfolio that reflects your perspective.</p>
        </div>
        <a href="#/create" className="button secondary">
          Create a vault <Icon name="plus" size={18} />
        </a>
      </section>
      <p className="disclaimer">
        All performance and popularity data are examples, not live market data.
        Crypto assets can lose value.
      </p>
    </>
  );
}

function Explore({ state, category }: { state: State; category?: string }) {
  const [filter, setFilter] = useState(
    category === "Official" || category === "Community"
      ? category
      : "All vaults",
  );
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("All risks");
  const [sort, setSort] = useState("popular");
  const vaults = state.vaults
    .filter(
      (v) =>
        !v.archived &&
        (filter === "All vaults" || v.category === filter) &&
        (risk === "All risks" || v.risk === risk) &&
        `${v.name} ${v.description} ${v.allocations.map((a) => a.asset).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "returns"
        ? b.returnYear - a.returnYear
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : b.popularity - a.popularity,
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>Explore crypto vaults</h1>
          <p>Compare example returns and asset allocations.</p>
        </div>
        <a href="#/create" className="button secondary">
          <Icon name="plus" size={18} />
          Create a vault
        </a>
      </div>
      <div className="filter-tabs" role="group" aria-label="Vault category">
        {["All vaults", "Official", "Community"].map((f) => (
          <button
            key={f}
            className={filter === f ? "selected" : ""}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
            {f === "Official" && <Icon name="shield" size={15} />}
          </button>
        ))}
      </div>
      <div className="filter-row">
        <label className="search-field">
          <Icon name="search" />
          <span className="sr-only">Search vaults or assets</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vaults or assets…"
            type="search"
          />
        </label>
        <label className="select-field">
          <span id="risk-filter-label">Risk</span>
          <select
            aria-labelledby="risk-filter-label"
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
          >
            {["All risks", "Moderate", "High", "Very high"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span id="sort-filter-label">Sort by</span>
          <select
            aria-labelledby="sort-filter-label"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="popular">Popularity</option>
            <option value="returns">1Y return</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className="result-info">
        <span role="status">
          {vaults.length} vault{vaults.length !== 1 ? "s" : ""}
        </span>
        <span>Returns & popularity are illustrative</span>
      </div>
      {vaults.length ? (
        <div className="vault-grid explore-grid">
          {vaults.map((v) => (
            <VaultCard key={v.id} vault={v} />
          ))}
        </div>
      ) : (
        <Empty
          icon="search"
          title="No matching vaults"
          action={
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setFilter("All vaults");
                setRisk("All risks");
              }}
            >
              Clear filters
            </button>
          }
        >
          Try another name, asset, or risk level.
        </Empty>
      )}
      <div className="notice page-notice">
        <Icon name="info" />
        <p>
          {filter === "Community"
            ? "Example community vaults are included for exploration. Vaults you publish are available only in this browser."
            : "Risk labels compare these demo vaults only. Even “Moderate” crypto portfolios can lose substantial value."}
        </p>
      </div>
    </>
  );
}

function VaultDetail({
  vault,
  state,
  onAction,
}: {
  vault: Vault;
  state: State;
  onAction: (a: Action) => void;
}) {
  const [range, setRange] = useState("1Y");
  const factor: Record<string, number> = {
    "1M": 0.16,
    "3M": 0.35,
    "6M": 0.61,
    "1Y": 1,
  };
  const holding = state.holdings.find((h) => h.vaultId === vault.id);
  const value = holding ? holdingValue(state, holding) : 0;
  return (
    <>
      <a href="#/explore" className="back-link">
        <Icon name="back" size={16} />
        Explore vaults
      </a>
      <div className="page-heading vault-heading">
        <div className="row">
          <VaultIcon vault={vault} large />
          <div>
            <h1 tabIndex={-1}>{vault.name}</h1>
            <div className="row wrap">
              <span className="badge official">{vault.category}</span>
              <span className="muted small-text">by {vault.author}</span>
              {vault.archived && <span className="badge">Archived</span>}
            </div>
          </div>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={!holding}
            onClick={() => onAction({ kind: "Withdraw", vaultId: vault.id })}
          >
            Withdraw
          </button>
          <button
            className="button primary"
            disabled={vault.archived}
            onClick={() => onAction({ kind: "Invest", vaultId: vault.id })}
          >
            Invest demo funds
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>
      <p className="detail-intro">{vault.description}</p>
      {vault.archived && (
        <p className="notice">
          This vault is closed to new investments. Existing holdings can still
          be withdrawn.
        </p>
      )}
      <div className="detail-grid">
        <section className="panel performance-panel">
          <div className="section-heading">
            <div>
              <h2>Performance</h2>
              <p>Illustrative history, not a forecast</p>
            </div>
            <div
              className="range-buttons"
              role="group"
              aria-label="Performance period"
            >
              {Object.keys(factor).map((r) => (
                <button
                  key={r}
                  className={range === r ? "selected" : ""}
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="performance-value">
            <Return value={vault.returnYear * factor[range]} />
            <span className="muted small-text">over {range}</span>
          </div>
          <Chart
            value={vault.returnYear * factor[range]}
            color={vault.returnYear < 0 ? "#f3a3a3" : vault.color}
            label={`${range} illustrative return: ${percent(vault.returnYear * factor[range])}`}
          />
          <div className="chart-axis">
            <span>Period start</span>
            <span>Period end</span>
          </div>
          <div className="performance-stats">
            <Stat label="Assets" value={vault.allocations.length} />
            <Stat label="Risk level" value={vault.risk} />
            <Stat
              label="Example investors"
              value={vault.popularity.toLocaleString()}
            />
          </div>
        </section>
        <section className="panel composition">
          <h2>Portfolio composition</h2>
          <AllocationBar allocations={vault.allocations} />
          <AllocationList allocations={vault.allocations} />
          <div className="composition-total">
            <span>Total allocation</span>
            <strong>100%</strong>
          </div>
        </section>
      </div>
      <div className="detail-grid lower-detail">
        <section className="panel">
          <h2>Your investment</h2>
          <div className="investment-stats">
            <Stat label="Current demo value" value={currency(value)} />
            <Stat
              label="Invested capital"
              value={currency(holding?.cost ?? 0)}
            />
            <Stat
              label="Unrealized return"
              value={currency(value - (holding?.cost ?? 0))}
            />
          </div>
          {!holding && (
            <p className="muted">Start with as little as $1 in demo funds.</p>
          )}
        </section>
        <section className="panel">
          <h2>Historical returns</h2>
          <dl className="returns-list">
            {Object.entries(factor).map(([r, f]) => (
              <div key={r}>
                <dt>{r} example</dt>
                <dd>
                  <Return value={vault.returnYear * f} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <div className="notice page-notice">
        <Icon name="info" />
        <p>
          Charts show illustrative example data. New investments start at the
          current demo share price ({currency(vault.nav)}); use market scenarios
          in your portfolio to change their value. No fees are simulated.
        </p>
      </div>
    </>
  );
}

function TransactionModal({
  action,
  state,
  onClose,
  onConfirm,
}: {
  action: Action;
  state: State;
  onClose: () => void;
  onConfirm: (kind: Action["kind"], cents: number, id?: string) => State;
}) {
  const [amount, setAmount] = useState("100");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const vault = state.vaults.find((v) => v.id === action.vaultId);
  const holding = state.holdings.find((h) => h.vaultId === action.vaultId);
  const available =
    action.kind === "Withdraw"
      ? holding
        ? holdingValue(state, holding)
        : 0
      : state.cash;
  const cents = parseMoney(amount);
  const label =
    action.kind === "Deposit" ? "Add demo funds" : `${action.kind} demo funds`;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      onConfirm(action.kind, cents, action.vaultId);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
      amountRef.current?.focus();
    }
  };
  return (
    <Modal title={done ? "Simulation complete" : label} onClose={onClose}>
      {done ? (
        <div className="transaction-success">
          <span className="success-mark">
            <Icon name="check" size={30} />
          </span>
          <h3>
            {currency(cents)}{" "}
            {action.kind === "Invest"
              ? "invested"
              : action.kind === "Withdraw"
                ? "withdrawn"
                : "added"}
          </h3>
          <p>
            {action.kind === "Invest"
              ? `Your investment in ${vault?.name} is now in your portfolio.`
              : action.kind === "Withdraw"
                ? "Your demo cash balance has been updated."
                : "Your demo funds are ready to invest."}
          </p>
          <p className="small-text muted">
            Simulated transaction. No real money moved.
          </p>
          <div className="button-row">
            <button className="button secondary" onClick={onClose}>
              Done
            </button>
            <a href="#/portfolio" className="button primary" onClick={onClose}>
              View portfolio
              <Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {vault && (
            <div className="transaction-vault row">
              <VaultIcon vault={vault} />
              <div>
                <strong>{vault.name}</strong>
                <span className="muted small-text">
                  {vault.category} vault · {vault.allocations.length} assets
                </span>
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="transaction-amount">Amount in USD</label>
            <div className="amount-field">
              <span>$</span>
              <input
                ref={amountRef}
                data-autofocus="true"
                id="transaction-amount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                aria-invalid={!!error}
                aria-describedby={
                  error ? "transaction-error" : "transaction-hint"
                }
              />
              {action.kind !== "Deposit" && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setAmount((Math.min(available, 100000000) / 100).toFixed(2))
                  }
                >
                  Max
                </button>
              )}
            </div>
            <span id="transaction-hint" className="small-text muted">
              {action.kind === "Deposit"
                ? "Add $1 to $1,000,000 in virtual funds."
                : `${action.kind === "Withdraw" ? "Available to withdraw" : "Available demo cash"}: ${currency(available)}`}
            </span>
            {error && (
              <p className="error" id="transaction-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="amount-presets">
            {[100, 500, 1000].map((n) => (
              <button
                type="button"
                className="button secondary"
                key={n}
                onClick={() => {
                  setAmount(String(n));
                  setError("");
                }}
              >
                ${n.toLocaleString()}
              </button>
            ))}
          </div>
          {vault && Number.isFinite(cents) && cents > 0 && (
            <div className="allocation-preview">
              <h3>
                {action.kind === "Invest"
                  ? "Your allocation"
                  : "Withdrawal breakdown"}
              </h3>
              {allocateCents(cents, vault.allocations).map((a) => (
                <div className="row between" key={a.asset}>
                  <span className="row">
                    <Coin asset={a.asset} small />
                    {a.asset}
                  </span>
                  <span>{currency(a.cents)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="notice">
            <Icon name="info" />
            <p>
              This is a simulated transaction using virtual funds. No fees,
              wallet, or real transfers.
            </p>
          </div>
          <button className="button primary full" type="submit">
            {action.kind === "Deposit"
              ? "Add demo funds"
              : `Confirm ${action.kind.toLowerCase()}`}
            <Icon name="arrow" size={18} />
          </button>
        </form>
      )}
    </Modal>
  );
}

function Portfolio({
  state,
  onAction,
  onAdvance,
  onReset,
}: {
  state: State;
  onAction: (a: Action) => void;
  onAdvance: (s: "growth" | "decline") => void;
  onReset: () => void;
}) {
  const [scenario, setScenario] = useState<"growth" | "decline">("growth");
  const value = portfolioValue(state);
  const cost = state.holdings.reduce((s, h) => s + h.cost, 0);
  const totalReturn = value - cost + state.realized;
  const download = () => {
    const rows = [
      ["Date", "Action", "Vault", "Amount USD"],
      ...state.transactions.map((t) => [
        t.date,
        t.kind,
        t.vaultName,
        (t.cents / 100).toFixed(2),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value)
                .replace(/^[=+@\-]/, "'$&")
                .replace(/"/g, '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "cryptovault-demo-transactions.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>Your demo portfolio</h1>
          <p>Track virtual holdings, gains, and losses.</p>
        </div>
        <button
          className="button primary"
          onClick={() => onAction({ kind: "Deposit" })}
        >
          <Icon name="plus" size={18} />
          Add demo funds
        </button>
      </div>
      <div className="portfolio-stats">
        <Stat
          label="Total account value"
          value={currency(value + state.cash)}
        />
        <Stat label="Invested in vaults" value={currency(value)} />
        <Stat label="Available demo cash" value={currency(state.cash)} />
        <Stat
          label="Total profit / loss"
          value={
            <span className={totalReturn < 0 ? "negative" : "positive"}>
              {totalReturn >= 0 ? "+" : ""}
              {currency(totalReturn)}
            </span>
          }
          detail={`Includes ${currency(state.realized)} realized`}
        />
      </div>
      <section className="panel portfolio-chart">
        <div className="section-heading">
          <div>
            <h2>Portfolio performance</h2>
            <p>
              {state.month
                ? `${state.month} simulated month${state.month === 1 ? "" : "s"} · Includes cash and deposits`
                : "Your simulation starts here"}
            </p>
          </div>
          <span className="badge">Demo history</span>
        </div>
        <Chart
          values={state.history.map((h) => h.value)}
          label={`Total account value in recorded market scenarios. Latest: ${currency(state.history.at(-1)?.value ?? 0)}. Includes cash and deposits.`}
        />
        <div className="chart-axis">
          <span>Month 0</span>
          <span>Month {state.month}</span>
        </div>
        <div className="simulation-controls">
          <div>
            <strong>Explore a market scenario</strong>
            <p>Apply one hypothetical month to your vault holdings.</p>
          </div>
          <label className="sr-only" htmlFor="scenario">
            Market scenario
          </label>
          <select
            id="scenario"
            value={scenario}
            onChange={(e) =>
              setScenario(e.target.value as "growth" | "decline")
            }
          >
            <option value="growth">Rising market</option>
            <option value="decline">Falling market</option>
          </select>
          <button
            className="button secondary"
            disabled={!state.holdings.length}
            onClick={() => onAdvance(scenario)}
          >
            Simulate next month
            <Icon name="arrow" size={16} />
          </button>
        </div>
        {!state.holdings.length && (
          <p className="small-text muted">
            Invest in a vault to try a market scenario.
          </p>
        )}
      </section>
      <section className="holdings-section">
        <div className="section-heading">
          <h2>Your vault holdings</h2>
          <a href="#/explore" className="text-button">
            Explore vaults
            <Icon name="arrow" size={16} />
          </a>
        </div>
        {!state.holdings.length ? (
          <Empty
            icon="chart"
            title="A blank canvas for your portfolio"
            action={
              <a className="button secondary" href="#/explore">
                Find your first vault
                <Icon name="arrow" size={16} />
              </a>
            }
          >
            Invest your demo cash in a vault to start exploring.
          </Empty>
        ) : (
          <div className="holdings-list">
            {state.holdings.map((h) => {
              const v = state.vaults.find((v) => v.id === h.vaultId)!;
              const current = holdingValue(state, h);
              const profit = current - h.cost;
              return (
                <article className="holding-row" key={v.id}>
                  <div className="row">
                    <VaultIcon vault={v} />
                    <div>
                      <a href={`#/vault/${v.id}`}>
                        <strong>{v.name}</strong>
                      </a>
                      <span className="muted small-text">
                        {v.category} · {v.allocations.length} assets
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="muted small-text">Current value</span>
                    <strong>{currency(current)}</strong>
                  </div>
                  <div>
                    <span className="muted small-text">Profit / loss</span>
                    <strong className={profit < 0 ? "negative" : "positive"}>
                      {profit >= 0 ? "+" : ""}
                      {currency(profit)}
                    </strong>
                  </div>
                  <div className="button-row">
                    <button
                      className="button secondary"
                      onClick={() =>
                        onAction({ kind: "Withdraw", vaultId: v.id })
                      }
                    >
                      Withdraw
                    </button>
                    <button
                      className="icon-button bordered"
                      aria-label={`Invest more in ${v.name}`}
                      disabled={v.archived}
                      onClick={() =>
                        onAction({ kind: "Invest", vaultId: v.id })
                      }
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <div className="section-heading">
          <h2>Recent activity</h2>
          <button
            className="text-button"
            disabled={!state.transactions.length}
            onClick={download}
          >
            <Icon name="download" size={16} />
            Export CSV
          </button>
        </div>
        {!state.transactions.length ? (
          <p className="activity-empty muted">
            Your simulated investments, withdrawals, and deposits will appear
            here.
          </p>
        ) : (
          <div className="activity-list">
            {state.transactions.slice(0, 10).map((t) => (
              <div className="activity-row" key={t.id}>
                <span className="activity-icon">
                  <Icon
                    name={
                      t.kind === "Invest"
                        ? "up"
                        : t.kind === "Withdraw"
                          ? "down"
                          : "plus"
                    }
                    size={18}
                  />
                </span>
                <div>
                  <strong>
                    {t.kind === "Deposit"
                      ? "Demo funds added"
                      : `${t.kind} · ${t.vaultName}`}
                  </strong>
                  <span className="muted small-text">
                    {new Date(t.date).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · Simulated
                  </span>
                </div>
                <strong>{currency(t.cents)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="portfolio-footnote">
        <span>
          Stored in this browser. CSV includes all {state.transactions.length}{" "}
          transactions.
        </span>
        <button className="text-button" onClick={onReset}>
          <Icon name="reset" size={15} />
          Reset demo
        </button>
      </div>
    </>
  );
}

function Creator({
  state,
  onSave,
  official = false,
  existing,
}: {
  state: State;
  onSave: (v: Vault) => void;
  official?: boolean;
  existing?: Vault;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [risk, setRisk] = useState<Vault["risk"]>(existing?.risk ?? "High");
  const [allocations, setAllocations] = useState<Allocation[]>(
    existing?.allocations ?? [
      { asset: "BTC", percent: 50 },
      { asset: "ETH", percent: 30 },
      { asset: "SOL", percent: 20 },
    ],
  );
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState(false);
  const [asset, setAsset] = useState<Asset>("LINK");
  const nameRef = useRef<HTMLInputElement>(null);
  const allocationRef = useRef<HTMLInputElement>(null);
  const total = allocations.reduce((s, a) => s + a.percent, 0);
  const remaining = (Object.keys(ASSETS) as Asset[]).filter(
    (a) => !allocations.some((x) => x.asset === a),
  );
  const update = (asset: Asset, value: number) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.asset === asset
          ? { ...a, percent: Number.isFinite(value) ? value : 0 }
          : a,
      ),
    );
    setError("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3 || name.trim().length > 50) {
      setNameError(true);
      setError("Give your vault a name between 3 and 50 characters.");
      requestAnimationFrame(() => nameRef.current?.focus());
      return;
    }
    if (
      state.vaults.some(
        (v) =>
          v.id !== existing?.id &&
          v.name.toLowerCase() === name.trim().toLowerCase(),
      )
    ) {
      setNameError(true);
      setError(
        "A vault with this name already exists. Choose a different name.",
      );
      requestAnimationFrame(() => nameRef.current?.focus());
      return;
    }
    const invalid = validateAllocations(allocations);
    if (invalid) {
      setNameError(false);
      setError(invalid);
      requestAnimationFrame(() => allocationRef.current?.focus());
      return;
    }
    const vault: Vault = {
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      description:
        description.trim() ||
        `A custom portfolio of ${allocations.length} crypto assets.`,
      category: official ? "Official" : "Community",
      author: official ? "CryptoVault" : "You · this browser",
      risk,
      allocations,
      returnYear: existing?.returnYear ?? 0,
      popularity: existing?.popularity ?? 0,
      color: existing?.color ?? "#c5f277",
      icon: existing?.icon ?? "layers",
      nav: existing?.nav ?? 10000,
      local: true,
      archived: existing?.archived,
    };
    onSave(vault);
  };
  const even = () => {
    const whole = Math.floor(100 / allocations.length);
    setAllocations(
      allocations.map((a, i) => ({
        ...a,
        percent: i === allocations.length - 1 ? 100 - whole * i : whole,
      })),
    );
    setError("");
  };
  const gradient = allocations
    .map(
      (a, i) =>
        `${ASSETS[a.asset].color} ${allocations.slice(0, i).reduce((s, b) => s + b.percent, 0)}% ${allocations.slice(0, i + 1).reduce((s, b) => s + b.percent, 0)}%`,
    )
    .join(",");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>
            {existing
              ? "Refine your official vault."
              : official
                ? "Create an official vault."
                : "Create a crypto vault"}
          </h1>
          <p>
            {official
              ? "Admin demo · Changes apply only in this browser."
              : "Choose assets and set allocations totaling 100%."}
          </p>
        </div>
      </div>
      <form className="creator-grid" onSubmit={submit} noValidate>
        <div>
          <section className="panel">
            <h2>1. Give it an identity</h2>
            <div className="field">
              <label htmlFor="vault-name">Vault name</label>
              <input
                ref={nameRef}
                id="vault-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(false);
                  setError("");
                }}
                maxLength={50}
                placeholder="e.g. My long-term conviction"
                aria-invalid={nameError}
                aria-describedby={nameError ? "creator-error" : undefined}
              />
              {error && nameError && (
                <p className="error" id="creator-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor="vault-description">
                Strategy <span className="muted">(optional)</span>
              </label>
              <textarea
                id="vault-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={240}
                rows={3}
                placeholder="What is the idea behind this portfolio?"
              />
              <span className="small-text muted">
                {description.length}/240 characters
              </span>
            </div>
            <div className="field">
              <label htmlFor="vault-risk">Risk level</label>
              <select
                id="vault-risk"
                value={risk}
                onChange={(e) => setRisk(e.target.value as Vault["risk"])}
              >
                <option>Moderate</option>
                <option>High</option>
                <option>Very high</option>
              </select>
              <span className="small-text muted">
                A relative label for the demo, not a risk assessment.
              </span>
            </div>
          </section>
          <section className="panel assets-panel">
            <div className="section-heading">
              <h2>2. Compose your portfolio</h2>
              <button className="text-button" type="button" onClick={even}>
                Split equally
              </button>
            </div>
            <p className="muted">
              Choose at least two assets. Allocations must total 100%.
            </p>
            {error && !nameError && (
              <p className="error" id="creator-error" role="alert">
                {error}
              </p>
            )}
            <div className="allocation-editor">
              {allocations.map((a, i) => (
                <div className="asset-editor" key={a.asset}>
                  <div className="row">
                    <Coin asset={a.asset} />
                    <div>
                      <strong>{ASSETS[a.asset].name}</strong>
                      <span className="muted small-text">{a.asset}</span>
                    </div>
                  </div>
                  <label className="sr-only" htmlFor={`range-${a.asset}`}>
                    {a.asset} allocation slider
                  </label>
                  <input
                    id={`range-${a.asset}`}
                    type="range"
                    min="0"
                    max="100"
                    value={a.percent}
                    onChange={(e) => update(a.asset, Number(e.target.value))}
                  />
                  <div className="percent-field">
                    <label className="sr-only" htmlFor={`percent-${a.asset}`}>
                      {a.asset} allocation percent
                    </label>
                    <input
                      ref={i === 0 ? allocationRef : undefined}
                      id={`percent-${a.asset}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.01"
                      value={a.percent}
                      onChange={(e) => update(a.asset, Number(e.target.value))}
                      aria-invalid={!!error && !nameError}
                      aria-describedby={
                        error && !nameError ? "creator-error" : undefined
                      }
                    />
                    <span>%</span>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${ASSETS[a.asset].name}`}
                    disabled={allocations.length <= 2}
                    onClick={() => {
                      setAllocations(
                        allocations.filter((x) => x.asset !== a.asset),
                      );
                      setError("");
                    }}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              ))}
            </div>
            {remaining.length > 0 && (
              <div className="add-asset">
                <label className="sr-only" htmlFor="add-asset">
                  Asset to add
                </label>
                <select
                  id="add-asset"
                  value={remaining.includes(asset) ? asset : remaining[0]}
                  onChange={(e) => setAsset(e.target.value as Asset)}
                >
                  {remaining.map((a) => (
                    <option key={a} value={a}>
                      {ASSETS[a].name} ({a})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setAllocations([
                      ...allocations,
                      {
                        asset: remaining.includes(asset) ? asset : remaining[0],
                        percent: 0,
                      },
                    ])
                  }
                >
                  <Icon name="plus" size={16} />
                  Add asset
                </button>
              </div>
            )}
            <div className="composition-total">
              <span>Total allocation</span>
              <strong
                className={
                  Math.abs(total - 100) < 0.00001 ? "positive" : "negative"
                }
              >
                {Number(total.toFixed(2))}% / 100%
              </strong>
            </div>
          </section>
        </div>
        <aside className="creator-preview panel">
          <h2>Portfolio preview</h2>
          <div
            className="donut"
            role="img"
            aria-label={`Portfolio allocation total: ${total}%`}
            style={{ background: `conic-gradient(${gradient})` }}
          >
            <div>
              <strong>{allocations.length}</strong>
              <span className="muted small-text">assets</span>
            </div>
          </div>
          <h3 className="preview-name">{name.trim() || "Your new vault"}</h3>
          <AllocationList allocations={allocations} />
          <div className="notice">
            <Icon name="info" />
            <p>
              {official
                ? "Official vaults can be managed only through this local admin demo."
                : "Publish to your local community gallery. This demo does not share vaults with other visitors."}
            </p>
          </div>
          <button type="submit" className="button primary full">
            {existing
              ? "Save official vault"
              : official
                ? "Create official vault"
                : "Publish community vault"}
            <Icon name="arrow" size={16} />
          </button>
          <a href={official ? "#/admin" : "#/explore"} className="cancel-link">
            Cancel
          </a>
        </aside>
      </form>
    </>
  );
}

function Admin({
  state,
  enabled,
  enable,
  onToggle,
}: {
  state: State;
  enabled: boolean;
  enable: () => void;
  onToggle: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState<Vault | null>(null);
  const official = state.vaults.filter((v) => v.category === "Official");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>Official vault studio.</h1>
          <p>Create and manage the platform’s index portfolios.</p>
        </div>
        {enabled && (
          <a href="#/admin/new" className="button primary">
            <Icon name="plus" size={18} />
            Create official vault
          </a>
        )}
      </div>
      <div className="notice page-notice">
        <Icon name="shield" />
        <p>
          This is an admin demonstration, without authentication. Changes are
          saved only in this browser and do not affect other visitors.
          Production administration requires a secured backend.
        </p>
      </div>
      {!enabled ? (
        <Empty
          icon="lock"
          title="Try the administrator workspace"
          action={
            <button className="button primary" onClick={enable}>
              Enter admin demo
              <Icon name="arrow" size={16} />
            </button>
          }
        >
          Explore official vault management using your local demo data.
        </Empty>
      ) : (
        <>
          <div className="portfolio-stats admin-stats">
            <Stat label="Official vaults" value={official.length} />
            <Stat
              label="Open for investment"
              value={official.filter((v) => !v.archived).length}
            />
            <Stat
              label="Archived"
              value={official.filter((v) => v.archived).length}
            />
          </div>
          <div className="admin-vaults">
            {official.map((v) => (
              <article className="admin-vault" key={v.id}>
                <div className="row">
                  <VaultIcon vault={v} />
                  <div>
                    <a href={`#/vault/${v.id}`}>
                      <strong>{v.name}</strong>
                    </a>
                    <span className="muted small-text">
                      {v.allocations
                        .map((a) => `${a.asset} ${a.percent}%`)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
                <span className={`badge ${v.archived ? "" : "official"}`}>
                  {v.archived ? "Archived" : "Active"}
                </span>
                <div className="button-row">
                  <a className="button secondary" href={`#/admin/edit/${v.id}`}>
                    <Icon name="edit" size={16} />
                    Edit
                  </a>
                  <button
                    className="button ghost"
                    onClick={() => setConfirm(v)}
                  >
                    {v.archived ? "Restore" : "Archive"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {confirm && (
        <Modal
          title={`${confirm.archived ? "Restore" : "Archive"} ${confirm.name}?`}
          onClose={() => setConfirm(null)}
        >
          <p className="muted">
            {confirm.archived
              ? "This vault will appear in Explore and accept new demo investments."
              : "This vault will be hidden from Explore and closed to new investments. Existing holdings can still be withdrawn."}
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                onToggle(confirm.id);
                setConfirm(null);
              }}
            >
              {confirm.archived ? "Restore vault" : "Archive vault"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function NotFound() {
  return (
    <>
      <h1 tabIndex={-1}>This vault took a different path.</h1>
      <Empty
        title="Page not found"
        action={
          <a href="#/explore" className="button primary">
            Explore vaults
            <Icon name="arrow" size={16} />
          </a>
        }
      >
        This link may point to a vault saved in a different browser.
      </Empty>
    </>
  );
}
