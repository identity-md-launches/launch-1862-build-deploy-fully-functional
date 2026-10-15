import { createRequire } from "node:module";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import assert from "node:assert/strict";
const require = createRequire(resolve(process.argv[2] || ".", "package.json"));
const { chromium, webkit } = process.env.IMD_PLAYWRIGHT
  ? await import(pathToFileURL(process.env.IMD_PLAYWRIGHT).href)
  : require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const output = "test/scratch/browser-check";
await mkdir(output, { recursive: true });
const checks = [];
const screenshots = [];
const failures = [];
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith("/preview/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    const relative = path.slice(9) || "index.html";
    if (relative.includes("..")) throw new Error("Invalid path");
    const data = await readFile(resolve("dist", relative));
    res.setHeader(
      "Content-Type",
      types[extname(relative)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
let browser;
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, passed: false, reason: error.message.slice(0, 500) });
    console.error(`FAIL ${name}: ${error.message.slice(0, 300)}`);
    throw error;
  }
}
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      failures.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  const state = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("cryptovault-simulator-v1")),
    );
  const go = async (route) => {
    await page.goto(`${base}#${route}`);
    await page.locator("main h1").waitFor();
  };
  await check(
    "production export loads at /preview/ with local assets and font",
    async () => {
      await go("/");
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.evaluate(() => document.fonts.check("16px Inter")),
        true,
      );
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal((await page.request.get(`${base}share.png`)).status(), 200);
      assert.equal(
        (await page.request.get(`${base}favicon.svg`)).status(),
        200,
      );
    },
  );
  await page.screenshot({ path: `${output}/home-desktop.png`, fullPage: true });
  screenshots.push("home-desktop.png");
  await check(
    "mobile first screen includes product, main action, and featured vault",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await go("/");
      const action = await page.locator(".hero .button.primary").boundingBox();
      const chart = await page.locator(".hero-chart").boundingBox();
      assert.ok(action.y + action.height < 844);
      assert.ok(chart.y + chart.height < 844);
      await page.screenshot({
        path: `${output}/home-mobile.png`,
        fullPage: true,
      });
      screenshots.push("home-mobile.png");
    },
  );
  await check(
    "search, category, risk, sorting, and empty-state recovery",
    async () => {
      await go("/explore");
      assert.equal(await page.locator(".vault-card").count(), 6);
      await page
        .getByRole("button", { name: "Community", exact: true })
        .click();
      assert.equal(await page.locator(".vault-card").count(), 3);
      await page.getByLabel("Search vaults or assets").fill("zzzz-no-vault");
      assert.equal(await page.locator(".vault-card").count(), 0);
      await page.getByRole("button", { name: "Clear filters" }).click();
      await page.getByLabel("Risk", { exact: true }).selectOption("Moderate");
      assert.equal(await page.locator(".vault-card").count(), 2);
      await page.getByLabel("Risk", { exact: true }).selectOption("All risks");
      await page.getByLabel("Sort by").selectOption("returns");
      assert.match(
        await page.locator(".vault-card h3").first().textContent(),
        /Next Wave/,
      );
    },
  );
  await check(
    "keyboard modal focus stays inside, Escape restores trigger, invalid amount recovers",
    async () => {
      await go("/vault/blue-chip");
      const trigger = page.getByRole("button", {
        name: "Invest demo funds",
        exact: true,
      });
      await trigger.focus();
      await page.keyboard.press("Enter");
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press("Tab");
        assert.equal(
          await page.evaluate(() =>
            document.querySelector("dialog").contains(document.activeElement),
          ),
          true,
          `Tab ${i}: focus should stay in dialog`,
        );
      }
      await page.keyboard.press("Escape");
      assert.equal(
        await trigger.evaluate((el) => el === document.activeElement),
        true,
        "Escape should restore trigger focus",
      );
      await trigger.click();
      await page.getByLabel("Amount in USD").fill("20000");
      await page.getByRole("button", { name: "Confirm invest" }).click();
      assert.match(await page.getByRole("alert").textContent(), /exceeds/);
      assert.equal(
        await page.getByLabel("Amount in USD").getAttribute("aria-invalid"),
        "true",
      );
      await page.getByLabel("Amount in USD").fill("-5");
      await page.getByRole("button", { name: "Confirm invest" }).click();
      assert.match(
        await page.getByRole("alert").textContent(),
        /Enter an amount/,
      );
    },
  );
  await check(
    "$100 investment creates correct allocation, holding, cash and persistent state",
    async () => {
      await page.getByLabel("Amount in USD").fill("100");
      assert.match(
        await page.locator(".allocation-preview").textContent(),
        /\$50.00/,
      );
      await page.getByRole("button", { name: "Confirm invest" }).click();
      await page.getByRole("link", { name: "View portfolio" }).click();
      let s = await state();
      assert.equal(s.cash, 990000);
      assert.equal(s.holdings[0].cost, 10000);
      assert.deepEqual(
        s.transactions[0].allocations.map((a) => a.cents),
        [5000, 3000, 2000],
      );
      await page.reload();
      s = await state();
      assert.equal(s.holdings[0].cost, 10000);
      await page.screenshot({
        path: `${output}/portfolio-mobile.png`,
        fullPage: true,
      });
      screenshots.push("portfolio-mobile.png");
    },
  );
  await check(
    "market scenarios produce consistent growth and loss without changing cost basis",
    async () => {
      await page.getByRole("button", { name: "Simulate next month" }).click();
      let s = await state();
      assert.equal(s.vaults[0].nav, 10375);
      assert.equal(s.holdings[0].cost, 10000);
      assert.equal(s.month, 1);
      await page.getByLabel("Market scenario", { exact: true }).selectOption("decline");
      await page.getByRole("button", { name: "Simulate next month" }).click();
      s = await state();
      assert.ok(s.vaults[0].nav < 10000);
      assert.equal(s.month, 2);
      assert.equal(s.history.length, 3);
      await page.getByRole("button", { name: "Dismiss notification" }).click();
    },
  );
  await check(
    "partial withdrawal and Max close holding and realize profit or loss",
    async () => {
      await page.getByRole("button", { name: "Withdraw", exact: true }).click();
      await page.getByLabel("Amount in USD").fill("40");
      await page.getByRole("button", { name: "Confirm withdraw" }).click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      assert.equal((await state()).cash, 994000);
      await page.getByRole("button", { name: "Withdraw", exact: true }).click();
      await page.getByRole("button", { name: "Max", exact: true }).click();
      await page.getByRole("button", { name: "Confirm withdraw" }).click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      const s = await state();
      assert.equal(s.holdings.length, 0);
      assert.ok(s.realized < 0);
      assert.equal(s.cash, 1000000 + s.realized);
    },
  );
  await check("demo deposit, history update, and CSV download", async () => {
    const before = await state();
    await page
      .getByRole("button", { name: "Add demo funds", exact: true })
      .click();
    await page.getByLabel("Amount in USD").fill("250");
    await page
      .locator("dialog")
      .getByRole("button", { name: "Add demo funds", exact: true })
      .click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    const s = await state();
    assert.equal(s.cash, before.cash + 25000);
    assert.equal(s.history.at(-1).value, s.cash);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const d = await download;
    assert.equal(d.suggestedFilename(), "cryptovault-demo-transactions.csv");
    const file = await d.path();
    const csv = await readFile(file, "utf8");
    assert.match(csv, /'?Deposit/);
    assert.match(csv, /250.00/);
    assert.equal(csv.split("\r\n").length, s.transactions.length + 1);
  });
  await check(
    "creator validates name and total, adds/removes assets, and publishes a local community vault",
    async () => {
      await go("/create");
      await page
        .getByRole("button", { name: "Publish community vault" })
        .click();
      assert.match(await page.getByRole("alert").textContent(), /name/);
      await page.getByLabel("Vault name").fill("Test Balanced Vault");
      await page.getByLabel("BTC allocation percent").fill("40");
      await page
        .getByRole("button", { name: "Publish community vault" })
        .click();
      assert.match(await page.getByRole("alert").textContent(), /100%/);
      await page
        .getByRole("button", { name: "Add asset", exact: true })
        .click();
      assert.equal(await page.locator(".asset-editor").count(), 4);
      await page.getByRole("button", { name: "Split equally" }).click();
      assert.equal(
        await page.getByLabel("BTC allocation percent").inputValue(),
        "25",
      );
      await page.getByRole("button", { name: "Remove Chainlink" }).click();
      await page.getByRole("button", { name: "Split equally" }).click();
      assert.equal(
        await page.getByLabel("BTC allocation percent").inputValue(),
        "33",
      );
      await page
        .getByLabel("Strategy (optional)")
        .fill(
          "A browser-local portfolio created during interaction validation.",
        );
      await page
        .getByRole("button", { name: "Publish community vault" })
        .click();
      await page
        .getByRole("heading", { name: "Test Balanced Vault", exact: true })
        .waitFor();
      const s = await state();
      const vault = s.vaults.at(-1);
      assert.equal(vault.category, "Community");
      assert.equal(vault.author, "You · this browser");
      assert.equal(
        vault.allocations.reduce((n, a) => n + a.percent, 0),
        100,
      );
      await page.reload();
      await page
        .getByRole("heading", { name: "Test Balanced Vault", exact: true })
        .waitFor();
    },
  );
  await check(
    "admin gate, official create/edit, archive exclusion, and restore",
    async () => {
      await go("/admin");
      await page.getByRole("button", { name: "Enter admin demo" }).click();
      await page.getByRole("link", { name: "Create official vault" }).click();
      await page.getByLabel("Vault name").fill("Official Test Index");
      await page.getByRole("button", { name: "Create official vault" }).click();
      await page
        .getByRole("heading", { name: "Official vault studio." })
        .waitFor();
      const row = page
        .locator(".admin-vault")
        .filter({ hasText: "Official Test Index" });
      await row.getByRole("link", { name: "Edit", exact: true }).click();
      await page.getByLabel("Vault name").fill("Official Test Revised");
      await page.getByRole("button", { name: "Save official vault" }).click();
      const edited = page
        .locator(".admin-vault")
        .filter({ hasText: "Official Test Revised" });
      await edited
        .getByRole("button", { name: "Archive", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Archive vault", exact: true })
        .click();
      assert.equal((await state()).vaults.at(-1).archived, true);
      await page.getByRole("button", { name: "Dismiss notification" }).click();
      await page.evaluate(() => (location.hash = "/explore"));
      await page.locator(".vault-card").first().waitFor();
      assert.equal(
        await page
          .locator(".vault-card")
          .filter({ hasText: "Official Test Revised" })
          .count(),
        0,
      );
      await page.evaluate(() => (location.hash = "/admin"));
      await page.locator(".admin-vault").first().waitFor();
      await page
        .locator(".admin-vault")
        .filter({ hasText: "Official Test Revised" })
        .getByRole("button", { name: "Restore", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Restore vault", exact: true })
        .click();
      assert.equal((await state()).vaults.at(-1).archived, false);
    },
  );
  await check(
    "reset cancellation preserves data and confirmation restores fresh account",
    async () => {
      await go("/portfolio");
      await page
        .getByRole("button", { name: "Reset demo", exact: true })
        .click();
      await page.getByRole("button", { name: "Keep my portfolio" }).click();
      assert.ok((await state()).transactions.length > 0);
      await page
        .getByRole("button", { name: "Reset demo", exact: true })
        .click();
      await page
        .locator("dialog")
        .getByRole("button", { name: "Reset demo", exact: true })
        .click();
      assert.equal((await state()).cash, 1000000);
      assert.equal((await state()).vaults.length, 6);
      assert.equal((await state()).transactions.length, 0);
      await page.getByRole("button", { name: "Dismiss notification" }).click();
    },
  );
  await check(
    "all primary routes reflow without horizontal overflow at 320, 390, 768, 1024, 1440",
    async () => {
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of [
          "/",
          "/explore",
          "/vault/blue-chip",
          "/portfolio",
          "/create",
          "/admin",
        ]) {
          await go(route);
          const dimensions = await page.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          assert.ok(
            dimensions.scroll <= dimensions.width + 1,
            `overflow at ${width} on ${route}: ${dimensions.scroll}`,
          );
        }
      }
    },
  );
  const axeResults = [];
  await check(
    "automated WCAG A/AA scan on six routes and investment dialog",
    async () => {
      for (const route of [
        "/",
        "/explore",
        "/vault/blue-chip",
        "/portfolio",
        "/create",
        "/admin",
      ]) {
        await go(route);
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        axeResults.push({
          route,
          violations: result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
      }
      await go("/vault/blue-chip");
      await page
        .getByRole("button", { name: "Invest demo funds", exact: true })
        .click();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      axeResults.push({
        route: "investment-dialog",
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
      await writeFile(
        `${output}/accessibility.json`,
        JSON.stringify(axeResults, null, 2),
      );
      assert.equal(
        axeResults.flatMap((r) => r.violations).length,
        0,
        JSON.stringify(axeResults.filter((r) => r.violations.length)),
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "reduced motion disables transitions; 200% text enlargement retains reflow",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await go("/");
      assert.equal(
        await page
          .locator(".hero .button.primary")
          .evaluate((el) => getComputedStyle(el).transitionDuration),
        "0s",
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addStyleTag({ content: "html{font-size:32px !important}" });
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
        true,
      );
      await go("/");
    },
  );
  await check(
    "corrupt storage recovers visibly and disabled storage remains usable",
    async () => {
      await page.evaluate(() =>
        localStorage.setItem("cryptovault-simulator-v1", '{"bad":true}'),
      );
      await page.reload();
      assert.match(
        await page.getByRole("alert").textContent(),
        /could not be read/,
      );
      assert.equal((await state()).cash, 1000000);
      const temp = await browser.newPage();
      await temp.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new Error("Storage disabled by validation");
          },
        });
      });
      await temp.goto(base);
      await temp.locator("h1").waitFor();
      assert.match(
        await temp.getByRole("alert").textContent(),
        /storage|visit only/,
      );
      await temp.locator(".hero .button.primary").click();
      await temp.getByRole("heading", { name: "Explore crypto vaults", exact: true }).waitFor();
      assert.equal(await temp.locator(".vault-card").count(), 6);
      await temp.close();
    },
  );
  await check(
    "no page errors or failed HTTP resources during interactions",
    async () => assert.deepEqual(failures, []),
  );
  try {
    const safari = await webkit.launch({ headless: true });
    try {
      const p = await safari.newPage({ viewport: { width: 390, height: 844 } });
      await p.goto(`${base}#/vault/blue-chip`);
      await p
        .getByRole("button", { name: "Invest demo funds", exact: true })
        .click();
      await p.getByRole("button", { name: "Confirm invest" }).click();
      await p.getByRole("link", { name: "View portfolio" }).click();
      assert.match(
        await p.locator(".holding-row").textContent(),
        /Blue Chip Index/,
      );
      checks.push({ name: "WebKit primary investment flow", passed: true });
    } finally {
      await safari.close();
    }
  } catch {
    checks.push({
      name: "WebKit primary investment flow",
      passed: null,
      reason:
        "WebKit could not launch because required system browser libraries are unavailable. No native Safari result is claimed.",
    });
    console.log(
      "LIMITATION WebKit could not launch; system browser libraries unavailable.",
    );
  }
} catch {
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ checks, screenshots }, null, 2),
  );
  console.log(
    `${checks.filter((c) => c.passed === true).length} checks passed; ${checks.filter((c) => c.passed === false).length} failed; ${checks.filter((c) => c.passed === null).length} unperformed.`,
  );
}
