import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = process.env.IMD_PLAYWRIGHT
  ? await import(pathToFileURL(process.env.IMD_PLAYWRIGHT).href)
  : await import("playwright");
const baseline = process.argv.includes("--baseline");
const output = `test/scratch/revision-${baseline ? "before" : "after"}`;
await mkdir(output, { recursive: true });
const types = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = path.slice("/preview/".length) || "index.html";
  if (!path.startsWith("/preview/") || relative.includes("..")) {
    res.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile(resolve("dist", relative));
    res.setHeader("Content-Type", types[extname(relative)] || "application/octet-stream");
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
const checks = [];
const failures = [];
const longName = "W".repeat(50);
let browser;

async function check(name, measure, verify) {
  const actual = await measure();
  try {
    verify(actual);
    checks.push({ name, passed: true, actual });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, passed: false, actual, reason: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}
async function go(page, route) {
  await page.goto(`${base}#${route}`);
  await page.locator("main h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function nameFits(page, selector, surface, label) {
  await check(label, () => page.locator(selector).first().evaluate((el, surface) => {
    const box = el.closest(surface);
    const bounds = box.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    return {
      name: el.textContent,
      pageWidth: document.documentElement.clientWidth,
      pageScroll: document.documentElement.scrollWidth,
      surfaceWidth: box.clientWidth,
      surfaceScroll: box.scrollWidth,
      textContained: [...range.getClientRects()].every((r) =>
        r.left >= bounds.left && r.right <= bounds.right &&
        r.top >= bounds.top && r.bottom <= bounds.bottom),
    };
  }, surface), (r) => {
    assert.ok(r.name.includes(longName), "complete accepted name is present");
    assert.ok(r.pageScroll <= r.pageWidth + 1, `page ${r.pageScroll}px exceeds ${r.pageWidth}px`);
    assert.ok(r.surfaceScroll <= r.surfaceWidth + 1, `surface ${r.surfaceScroll}px exceeds ${r.surfaceWidth}px`);
    assert.ok(r.textContained, "all text rectangles fit within the surface");
  });
}
async function errorVisible(page, input, label) {
  await page.locator("#creator-error").waitFor();
  await page.waitForFunction((input) => document.querySelector(input) === document.activeElement, input);
  await check(label, () => page.evaluate((input) => {
    const field = document.querySelector(input);
    const error = document.getElementById("creator-error");
    const bounds = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, visible: r.top >= 0 && r.bottom <= innerHeight };
    };
    return {
      field: bounds(field), error: bounds(error), text: error.textContent,
      focused: field === document.activeElement,
      describedBy: field.getAttribute("aria-describedby"),
      invalid: field.getAttribute("aria-invalid"), role: error.getAttribute("role"),
      errorCount: document.querySelectorAll("#creator-error").length,
    };
  }, input), (r) => {
    assert.equal(r.focused, true);
    assert.equal(r.describedBy, "creator-error");
    assert.equal(r.invalid, "true");
    assert.equal(r.role, "alert");
    assert.equal(r.errorCount, 1);
    assert.ok(r.field.visible && r.error.visible,
      `field y=${r.field.top}, error y=${r.error.top}: both must be in the viewport`);
  });
}

try {
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.setDefaultTimeout(8000);
    page.on("pageerror", (e) => failures.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) failures.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });
    await go(page, "/create");
    await page.getByLabel("Vault name").fill(longName);
    await page.getByRole("button", { name: "Publish community vault" }).click();
    await page.getByRole("heading", { name: longName, exact: true }).waitFor();
    await page.getByRole("button", { name: "Invest demo funds", exact: true }).click();
    await nameFits(page, ".transaction-vault strong", "dialog", `${width}px investment name`);
    if (width === 390) await page.screenshot({ path: `${output}/invest-390.png` });
    await page.getByRole("button", { name: "Confirm invest" }).click();
    await nameFits(page, ".transaction-success p", "dialog", `${width}px confirmation name`);
    if (width === 390) await page.screenshot({ path: `${output}/confirmation-390.png` });
    await page.getByRole("link", { name: "View portfolio", exact: true }).click();
    await nameFits(page, ".holding-row a", ".holding-row", `${width}px holding name`);
    if (width === 390) {
      await page.locator(".holding-row").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/holding-390.png` });
    }
    await page.getByRole("button", { name: "Withdraw", exact: true }).click();
    await nameFits(page, ".transaction-vault strong", "dialog", `${width}px withdrawal name`);
    await page.getByRole("button", { name: "Max", exact: true }).click();
    await page.getByRole("button", { name: "Confirm withdraw" }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await go(page, "/explore");
    await page.getByLabel("Search vaults or assets").fill(longName);
    await nameFits(page, ".vault-card h3 a", ".vault-card", `${width}px community card name`);
    await page.close();

    const admin = await browser.newPage({ viewport: { width, height: 844 } });
    await go(admin, "/admin");
    await admin.getByRole("button", { name: "Enter admin demo" }).click();
    await admin.locator(".admin-vault").filter({ hasText: "Blue Chip Index" })
      .getByRole("link", { name: "Edit", exact: true }).click();
    await admin.getByLabel("Vault name").fill(longName);
    await admin.getByRole("button", { name: "Save official vault" }).click();
    await admin.getByRole("heading", { name: "Official vault studio." }).waitFor();
    await go(admin, "/");
    await nameFits(admin, ".featured-title", ".hero-chart", `${width}px featured name`);
    await nameFits(admin, ".vault-card h3 a", ".vault-card", `${width}px official card name`);
    await admin.screenshot({ path: `${output}/renamed-home-${width}.png`, fullPage: true });
    await admin.close();
  }

  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    for (const [route, heading, description] of [
      ["/explore", "Explore crypto vaults", "Compare example returns and asset allocations."],
      ["/create", "Create a crypto vault", "Choose assets and set allocations totaling 100%."],
      ["/portfolio", "Your demo portfolio", "Track virtual holdings, gains, and losses."],
    ]) {
      await go(page, route);
      await check(`${width}px ${route} task copy`, async () => ({
        heading: await page.locator("h1").textContent(),
        description: await page.locator(".page-heading p").textContent(),
      }), (r) => assert.deepEqual(r, { heading, description }));
      if (width === 390) await page.screenshot({ path: `${output}/${route.slice(1)}-390.png` });
    }
    await go(page, "/create");
    await page.getByRole("button", { name: "Publish community vault" }).click();
    await errorVisible(page, "#vault-name", `${width}px name error beside focused input`);
    if (width === 390) await page.screenshot({ path: `${output}/name-error-390.png` });
    await page.getByLabel("Vault name").fill("Blue Chip Index");
    await page.getByRole("button", { name: "Publish community vault" }).click();
    await errorVisible(page, "#vault-name", `${width}px duplicate-name error beside focused input`);
    await page.getByLabel("Vault name").fill("Unbalanced Index");
    await page.getByLabel("BTC allocation percent").fill("49");
    await page.getByRole("button", { name: "Publish community vault" }).click();
    await errorVisible(page, "#percent-BTC", `${width}px allocation error beside focused input`);
    if (width === 390) await page.screenshot({ path: `${output}/allocation-error-390.png` });
    await page.getByLabel("BTC allocation percent").fill("50");
    await page.getByRole("button", { name: "Publish community vault" }).click();
    await page.getByRole("heading", { name: "Unbalanced Index", exact: true }).waitFor();
    await page.close();
  }
  await check("no page errors or failed resources", async () => failures,
    (r) => assert.deepEqual(r, []));
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  await writeFile(`${output}/results.json`, JSON.stringify({ baseline, checks }, null, 2));
  console.log(`${checks.filter((c) => c.passed).length} passed; ${checks.filter((c) => !c.passed).length} failed.`);
  if (checks.some((c) => !c.passed)) process.exitCode = 1;
}
