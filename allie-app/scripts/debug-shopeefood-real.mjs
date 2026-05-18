// Try puppeteer-real-browser to bypass Shopee Gateway's escalated detection
import { connect } from "puppeteer-real-browser";

const url = process.argv[2] || "https://shopeefood.vn/now-food/shop/1218654";

const { browser, page } = await connect({
  headless: true,
  turnstile: true,             // auto-solve Cloudflare-style challenges if any
  fingerprint: false,
  customConfig: {},
  args: ["--start-maximized"],
  connectOption: {},
});

let detailJson = null, dishesJson = null;
const apiLog = [];
let totalResponses = 0;
const pending = [];

page.on("response", (r) => {
  totalResponses++;
  const ru = r.url();
  if (!ru.includes("deliverynow.vn")) return;
  apiLog.push(`${r.status()} ${ru.replace(/^https?:\/\/[^/]+/, "").slice(0, 100)}`);
  const ct = r.headers()["content-type"] ?? "";
  if (!ct.includes("json")) return;
  const isDetail = ru.includes("/delivery/get_detail");
  const isDishes = ru.includes("/dish/get_delivery_dishes");
  if (!isDetail && !isDishes) return;
  pending.push(r.json().then((j) => {
    if (isDetail && !detailJson) detailJson = j;
    if (isDishes && !dishesJson) dishesJson = j;
  }).catch(() => {}));
});

console.log("[real] navigating homepage...");
try { await page.goto("https://shopeefood.vn/", { waitUntil: "domcontentloaded", timeout: 30000 }); } catch (e) { console.log("homepage err:", String(e).slice(0, 100)); }
await new Promise((r) => setTimeout(r, 3000));

console.log("[real] navigating shop page...");
try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); } catch (e) { console.log("shop err:", String(e).slice(0, 100)); }

await new Promise((resolve) => {
  const start = Date.now();
  const t = setInterval(async () => {
    await Promise.all(pending.splice(0));
    if ((detailJson && dishesJson) || Date.now() - start > 25000) { clearInterval(t); resolve(); }
  }, 400);
});

console.log("\n[real] totalResponses:", totalResponses);
console.log("[real] apiLog (" + apiLog.length + "):");
apiLog.slice(0, 30).forEach((l) => console.log("  ", l));
console.log("[real] detailJson:", !!detailJson, " dishesJson:", !!dishesJson);

if (dishesJson) {
  const menu = dishesJson?.reply?.menu_infos || [];
  let count = 0;
  for (const cat of menu) for (const _ of cat?.dishes || []) count++;
  console.log("[real] ✅ MENU dishes:", count);
}

await browser.close();
