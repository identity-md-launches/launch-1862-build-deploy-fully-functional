import { createRequire } from "node:module";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
const root = process.argv[2] || ".";
const require = createRequire(resolve(root, "package.json"));
const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const font = readFileSync("public/fonts/inter-latin.woff2").toString(
    "base64",
  );
  await page.setContent(
    `<!doctype html><html><head><style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#101210;color:#f0f2ec;font-family:Inter;padding:60px 70px;width:1200px;height:630px}.brand{display:flex;gap:16px;align-items:center;font-size:30px;font-weight:600}.brand svg{color:#c5f277}h1{font-size:74px;letter-spacing:-4px;line-height:1.12;max-width:750px;font-weight:600;margin:60px 0 24px}h1 span{color:#c5f277}p{color:#a4aca0;font-size:25px;margin:0}.tag{position:absolute;bottom:55px;left:70px;display:flex;align-items:center;gap:12px;font-size:19px;color:#a4aca0}.dot{background:#c5f277;width:8px;height:8px;border-radius:50%}.art{position:absolute;right:60px;top:140px;width:280px;height:300px}.line{fill:none;stroke:#c5f277;stroke-width:2}.button{position:absolute;right:70px;bottom:52px;background:#c5f277;color:#18210f;padding:17px 25px;border-radius:10px;font-size:20px;font-weight:600}</style></head><body><div class="brand"><svg width="42" height="42" viewBox="0 0 32 32" fill="none"><path d="m5 5 11 22L27 5M11 5l5 10 5-10" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/></svg>CryptoVault.</div><h1>A portfolio,<br>not a <span>prediction.</span></h1><p>Your crypto investment sandbox.</p><svg class="art" viewBox="0 0 280 300"><g stroke="#3c4d2d" fill="#192115"><path d="m140 25 120 70-120 70L20 95Z"/><path d="m20 135 120 70 120-70M20 175l120 70 120-70M20 215l120 70 120-70" fill="none"/></g><path class="line" d="M30 240 65 218 92 225 112 185 140 192 171 140 193 153 225 100 255 75"/></svg><div class="tag"><span class="dot"></span>Demo funds. Real curiosity.</div><div class="button">Explore vaults ↗</div></body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/share.png" });
  console.log("Generated 1200 × 630 share image from local HTML and fonts.");
} finally {
  await browser.close();
}
