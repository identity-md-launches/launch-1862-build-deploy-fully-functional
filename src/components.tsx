import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ASSETS,
  currency,
  percent,
  type Allocation,
  type Asset,
  type Vault,
} from "./model";

export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m16 8-3 5-5 3 3-5Z" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 15l4-5 4 2 5-7" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    up: <path d="M6 17 18 5M6 5h12v12" />,
    down: <path d="m6 7 12 12M6 19h12V7" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    stack: (
      <>
        <rect x="4" y="5" width="16" height="5" rx="1" />
        <rect x="4" y="14" width="16" height="5" rx="1" />
      </>
    ),
    diamond: (
      <>
        <path d="m12 2 7 10-7 4-7-4Zm-7 13 7 7 7-7M12 2v14" />
      </>
    ),
    wave: (
      <>
        <path d="m3 8 5-4 8 8 5-4M3 16l5-4 8 8 5-4" />
      </>
    ),
    orbit: (
      <>
        <circle cx="12" cy="12" r="4" />
        <ellipse cx="12" cy="12" rx="11" ry="6" transform="rotate(-40 12 12)" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M17 11h4v5h-4a2.5 2.5 0 0 1 0-5ZM4 5V3h14v2" />
      </>
    ),
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    edit: (
      <>
        <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6m3 3a6 6 0 0 1 3 5v2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10h.01" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    reset: (
      <>
        <path d="M3 3v6h6M3 9a9 9 0 1 1 0 7" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
      </>
    ),
  };
  return (
    <svg
      {...props}
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.layers}
    </svg>
  );
}
export function Logo() {
  return (
    <a className="logo" href="#/" aria-label="CryptoVault home">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m5 5 11 22L27 5M11 5l5 10 5-10"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        CryptoVault<span className="logo-dot">.</span>
      </span>
    </a>
  );
}
export function VaultIcon({
  vault,
  large = false,
}: {
  vault: Vault;
  large?: boolean;
}) {
  return (
    <span
      className={`vault-icon ${large ? "large" : ""}`}
      style={{ "--vault-color": vault.color } as CSSProperties}
    >
      <Icon name={vault.icon} size={large ? 32 : 25} />
    </span>
  );
}
export function Coin({
  asset,
  small = false,
}: {
  asset: Asset;
  small?: boolean;
}) {
  return (
    <span
      className={`coin ${small ? "small" : ""}`}
      aria-hidden="true"
      style={{ "--coin-color": ASSETS[asset].color } as CSSProperties}
    >
      {ASSETS[asset].glyph}
    </span>
  );
}
export function CoinStack({ allocations }: { allocations: Allocation[] }) {
  return (
    <div
      className="coin-stack"
      role="img"
      aria-label={allocations.map((a) => `${a.asset} ${a.percent}%`).join(", ")}
    >
      {allocations.map((a) => (
        <Coin key={a.asset} asset={a.asset} small />
      ))}
    </div>
  );
}
export function Return({ value }: { value: number }) {
  return (
    <span className={`return ${value < 0 ? "negative" : ""}`}>
      <Icon name={value < 0 ? "down" : "up"} size={15} />
      {percent(value)}
    </span>
  );
}
const wave = [
  0, 0.03, 0.12, 0.07, 0.19, 0.15, 0.24, 0.11, 0.2, 0.31, 0.26, 0.42, 0.37,
  0.44, 0.38, 0.46, 0.59, 0.55, 0.48, 0.63, 0.58, 0.7, 0.65, 0.73, 0.68, 0.8,
  0.76, 0.89, 0.82, 0.94, 0.91, 1,
];
export function Chart({
  value = 24.8,
  mini = false,
  color = "#c5f277",
  label = "Illustrative vault performance",
  values,
}: {
  value?: number;
  mini?: boolean;
  color?: string;
  label?: string;
  values?: number[];
}) {
  const id = useId().replace(/:/g, "");
  const width = 600,
    height = mini ? 95 : 190,
    pad = mini ? 4 : 12;
  const data = values?.length
    ? values.length === 1
      ? [values[0], values[0]]
      : values
    : wave.map(
        (v, i) =>
          100 +
          value *
            (v +
              (i > 0 && i < wave.length - 1 ? Math.sin(i * 1.8) * 0.045 : 0)),
      );
  const lo = Math.min(...data),
    hi = Math.max(...data),
    range = hi - lo || 1;
  const coords = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (width - 2 * pad),
    hi === lo
      ? height / 2
      : height - pad - ((v - lo) / range) * (height - 2 * pad),
  ]);
  const path = coords
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  return (
    <svg
      className={`chart ${mini ? "mini" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop
            offset="0%"
            stopColor={color}
            stopOpacity={mini ? 0.08 : 0.15}
          />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {!mini &&
        [0.15, 0.5, 0.85].map((y) => (
          <line
            key={y}
            x1="0"
            x2={width}
            y1={height * y}
            y2={height * y}
            stroke="#2a3029"
            strokeDasharray="3 6"
          />
        ))}
      <path
        d={`${path} L${width - pad},${height} L${pad},${height} Z`}
        fill={`url(#${id})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={mini ? 2 : 2.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {!mini && (
        <circle
          cx={coords.at(-1)![0]}
          cy={coords.at(-1)![1]}
          r="4"
          fill={color}
        />
      )}
    </svg>
  );
}
export function AllocationBar({ allocations }: { allocations: Allocation[] }) {
  return (
    <div
      className="allocation-bar"
      role="img"
      aria-label={allocations
        .map((a) => `${ASSETS[a.asset].name} ${a.percent}%`)
        .join(", ")}
    >
      {allocations.map((a) => (
        <span
          key={a.asset}
          style={{ width: `${a.percent}%`, background: ASSETS[a.asset].color }}
        />
      ))}
    </div>
  );
}
export function VaultCard({ vault }: { vault: Vault }) {
  return (
    <article className="vault-card">
      <div className="row between">
        <VaultIcon vault={vault} />
        <span
          className={`badge ${vault.category === "Official" ? "official" : ""}`}
        >
          {vault.category === "Official" && <Icon name="shield" size={13} />}{" "}
          {vault.category}
        </span>
      </div>
      <h3>
        <a href={`#/vault/${vault.id}`}>
          {vault.name}
          <Icon name="up" size={18} />
        </a>
      </h3>
      <p>{vault.description}</p>
      <div className="card-return">
        <Return value={vault.returnYear} />
        <span className="muted small-text">1Y example</span>
      </div>
      <Chart
        value={vault.returnYear}
        mini
        color={vault.returnYear < 0 ? "#f3a3a3" : vault.color}
        label={`${vault.name}: ${percent(vault.returnYear)} illustrative one-year return`}
      />
      <AllocationBar allocations={vault.allocations} />
      <div className="row between card-bottom">
        <CoinStack allocations={vault.allocations} />
        <span className="small-text muted">
          {vault.allocations.length} assets
          <span className="dot-separator">·</span>
          {vault.risk} risk
        </span>
      </div>
    </article>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const node = ref.current!;
    const trigger = document.activeElement as HTMLElement;
    node.showModal();
    node.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      node.close();
      trigger?.focus();
    };
  }, []);
  useEffect(() => {
    if (ref.current?.open) {
      (
        ref.current.querySelector<HTMLElement>("[data-autofocus]") ??
        ref.current.querySelector<HTMLElement>("h2")
      )?.focus();
    }
  }, [title]);
  const trap = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const controls = [
      ...e.currentTarget.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
      ),
    ].filter((el) => el.getClientRects().length > 0);
    const first = controls[0],
      last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };
  return (
    <dialog
      onKeyDown={trap}
      ref={ref}
      className={wide ? "wide" : ""}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-head">
        <h2 tabIndex={-1} id={id}>
          {title}
        </h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  icon = "layers",
  title,
  children,
  action,
}: {
  icon?: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name={icon} size={36} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="stat">
      <span className="muted small-text">{label}</span>
      <strong>{value}</strong>
      {detail && <span className="small-text">{detail}</span>}
    </div>
  );
}
export function AllocationList({
  allocations,
  amount,
}: {
  allocations: Allocation[];
  amount?: number;
}) {
  return (
    <ul className="allocation-list">
      {allocations.map((a) => (
        <li key={a.asset}>
          <Coin asset={a.asset} />
          <div>
            <strong>{ASSETS[a.asset].name}</strong>
            <span className="muted small-text">{a.asset}</span>
          </div>
          <span className="allocation-percent">
            {a.percent}%
            {amount !== undefined && (
              <small className="muted">
                {currency(Math.round((amount * a.percent) / 100))}
              </small>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
