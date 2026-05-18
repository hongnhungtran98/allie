import puppeteer from "puppeteer";
const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu","--disable-blink-features=AutomationControlled"],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => false });
});
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
const r = await page.goto("https://gappapi.deliverynow.vn/api/meta/get_minimal_metadata", { waitUntil: "domcontentloaded", timeout: 20000 });
console.log("status:", r.status());
console.log("response headers (subset):");
const h = r.headers();
for (const k of ["set-cookie","server","cf-ray","content-type","access-control-allow-origin"]) console.log("  ", k, "=", h[k]);
const body = await page.evaluate(() => document.body.innerText);
console.log("body[0:500]:", body.slice(0, 500));
const cookies = await page.browserContext().cookies();
console.log("all cookies:", cookies.map(c => `${c.domain}:${c.name}`).join(", "));
await browser.close();
