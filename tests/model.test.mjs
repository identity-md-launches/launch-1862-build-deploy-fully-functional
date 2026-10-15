import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(process.argv.at(-1)).href);
test("new account has $10,000 cash, no holdings, and valid persistent state", () => {
  const s = m.freshState();
  assert.equal(s.cash, 1000000);
  assert.equal(s.holdings.length, 0);
  assert.equal(m.validState(s), true);
});
test("$100 investment allocates $50 BTC, $30 ETH, $20 SOL and preserves account value", () => {
  const original = m.freshState();
  const s = m.transact(original, "Invest", 10000, "blue-chip");
  assert.equal(original.cash, 1000000);
  assert.equal(s.cash, 990000);
  assert.equal(m.portfolioValue(s), 10000);
  assert.deepEqual(s.transactions[0].allocations, [
    { asset: "BTC", cents: 5000 },
    { asset: "ETH", cents: 3000 },
    { asset: "SOL", cents: 2000 },
  ]);
});
test("repeat investment merges a holding; partial and full withdrawal conserve cash and basis", () => {
  let s = m.transact(m.freshState(), "Invest", 10000, "blue-chip");
  s = m.transact(s, "Invest", 25000, "blue-chip");
  assert.equal(s.holdings.length, 1);
  assert.equal(s.holdings[0].cost, 35000);
  s = m.transact(s, "Withdraw", 10000, "blue-chip");
  assert.equal(s.holdings[0].cost, 25000);
  s = m.transact(s, "Withdraw", 25000, "blue-chip");
  assert.equal(s.holdings.length, 0);
  assert.equal(s.cash, 1000000);
  assert.equal(s.realized, 0);
});
test("growth and decline scenarios affect NAV; profit becomes realized at withdrawal", () => {
  let s = m.transact(m.freshState(), "Invest", 100000, "blue-chip");
  s = m.advanceMonth(s, "growth");
  assert.ok(m.portfolioValue(s) > 100000);
  const value = m.portfolioValue(s);
  s = m.transact(s, "Withdraw", value, "blue-chip");
  assert.equal(s.realized, value - 100000);
  assert.equal(s.cash, 1000000 + s.realized);
  const falling = m.advanceMonth(
    m.transact(m.freshState(), "Invest", 100000, "blue-chip"),
    "decline",
  );
  assert.ok(m.portfolioValue(falling) < 100000);
  assert.equal(falling.history.length, 2);
});
test("invalid money, insufficient cash, excessive withdrawals, and archived investments are rejected", () => {
  for (const n of [NaN, Infinity, -10, 0, 99, 100.5, 100000001])
    assert.throws(() => m.transact(m.freshState(), "Invest", n, "blue-chip"));
  assert.throws(
    () => m.transact(m.freshState(), "Invest", 1000001, "blue-chip"),
    /exceeds/,
  );
  assert.throws(
    () => m.transact(m.freshState(), "Withdraw", 100, "blue-chip"),
    /no investment/,
  );
  const s = m.transact(m.freshState(), "Invest", 10000, "blue-chip");
  assert.throws(() => m.transact(s, "Withdraw", 10001, "blue-chip"), /exceeds/);
  s.vaults[0].archived = true;
  assert.throws(() => m.transact(s, "Invest", 100, "blue-chip"), /archived/);
  assert.doesNotThrow(() => m.transact(s, "Withdraw", 10000, "blue-chip"));
});
test("monetary parser rejects ambiguous or fractional cent values", () => {
  assert.equal(m.parseMoney("100.01"), 10001);
  assert.equal(m.parseMoney(" 1 "), 100);
  for (const s of ["", "-1", "1e3", "NaN", "10.999", "1,000", "$100"])
    assert.ok(Number.isNaN(m.parseMoney(s)));
});
test("vault validation enforces two unique assets and 100 percent total", () => {
  assert.equal(
    m.validateAllocations([
      { asset: "BTC", percent: 50 },
      { asset: "ETH", percent: 50 },
    ]),
    null,
  );
  for (const a of [
    [{ asset: "BTC", percent: 100 }],
    [
      { asset: "BTC", percent: 50 },
      { asset: "BTC", percent: 50 },
    ],
    [
      { asset: "BTC", percent: 50 },
      { asset: "ETH", percent: 49 },
    ],
    [
      { asset: "BTC", percent: 0 },
      { asset: "ETH", percent: 100 },
    ],
    [
      { asset: "BTC", percent: NaN },
      { asset: "ETH", percent: 50 },
    ],
  ])
    assert.ok(m.validateAllocations(a));
});
test("cent allocations preserve exact totals even for uneven splits", () => {
  const a = [
    { asset: "BTC", percent: 33 },
    { asset: "ETH", percent: 33 },
    { asset: "SOL", percent: 34 },
  ];
  for (const amount of [100, 101, 999, 10001])
    assert.equal(
      m.allocateCents(amount, a).reduce((s, a) => s + a.cents, 0),
      amount,
    );
});
test("deposits affect cash and contributions, not investment profits", () => {
  const s = m.transact(m.freshState(), "Deposit", 50000);
  assert.equal(s.cash, 1050000);
  assert.equal(s.deposited, 1050000);
  assert.equal(s.realized, 0);
  assert.equal(s.transactions[0].kind, "Deposit");
  assert.throws(() => m.transact(s, "Deposit", 100000000), /at or below/);
});
test("persistent state rejects malformed data and invalid vault references", () => {
  for (const v of [
    null,
    {},
    [],
    { version: 1 },
    { ...m.freshState(), cash: -1 },
    { ...m.freshState(), vaults: [{}] },
    {
      ...m.freshState(),
      holdings: [{ vaultId: "missing", units: 1, cost: 100 }],
    },
  ])
    assert.equal(m.validState(v), false);
});
test("decimal percentages are accepted without floating point false negatives", () => {
  assert.equal(m.validateAllocations([{asset:'BTC',percent:29.61},{asset:'ETH',percent:70.39}]),null);
});
test("a sub-dollar holding can be fully withdrawn after a decline", () => {
  let s=m.transact(m.freshState(),'Invest',100,'blue-chip');
  s=m.advanceMonth(s,'decline');
  const value=m.portfolioValue(s);
  assert.ok(value<100 && value>0);
  s=m.transact(s,'Withdraw',value,'blue-chip');
  assert.equal(s.holdings.length,0);
});
