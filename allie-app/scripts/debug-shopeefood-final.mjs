// E2E test of the new fetchShopeeFoodMenu logic (mirrors route.ts)
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteerExtra.use(StealthPlugin());

const url = process.argv[2] || "https://shopeefood.vn/now-food/shop/1218654";

function parseDetailName(data) {
  const detail = data?.reply?.delivery_detail;
  return typeof detail?.name === "string" && detail.name.trim() ? detail.name.trim() : null;
}

function parseOptions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const g of raw) {
    const groupName = (g?.name ?? g?.ntop ?? "").toString().trim();
    const items = g?.option_items?.items;
    if (!Array.isArray(items)) continue;
    const choices = items
      .map((it) => ({ label: (it?.name ?? "").toString().trim(), price: Number(it?.price?.value ?? 0) }))
      .filter((c) => c.label);
    if (choices.length) out.push({ group: groupName, choices });
  }
  return out;
}

function parseDishes(data) {
  const menu = data?.reply?.menu_infos;
  if (!Array.isArray(menu)) return null;
  const items = [];
  for (const cat of menu) {
    const dishes = cat?.dishes;
    if (!Array.isArray(dishes)) continue;
    for (const f of dishes) {
      if (f?.is_deleted === true || f?.is_active === false) continue;
      const name = (f?.name ?? "").toString().trim();
      if (!name) continue;
      const originalPrice = Number(f?.price?.value ?? 0);
      if (!originalPrice) continue;
      const photos = f?.photos;
      const preferred =
        photos?.find((p) => p.width === 400) ??
        photos?.[Math.min(2, (photos?.length ?? 1) - 1)] ??
        photos?.[0];
      const imageUrl = preferred?.value ?? null;
      const discountedRaw = Number(f?.discount_price ?? 0);
      const discountedPrice = discountedRaw > 0 && discountedRaw !== originalPrice ? discountedRaw : null;
      items.push({ name, imageUrl, originalPrice, discountedPrice, options: parseOptions(f?.options ?? []) });
    }
  }
  return items.length ? items : null;
}

const browser = await puppeteerExtra.launch({
  headless: true,
  args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu","--window-size=1366,768"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 });

let detailJson = null, dishesJson = null;
const pending = [];
page.on("response", (r) => {
  const ru = r.url();
  if (!ru.includes("deliverynow.vn")) return;
  const ct = r.headers()["content-type"] ?? "";
  if (!ct.includes("json")) return;
  const isDetail = ru.includes("/delivery/get_detail");
  const isDishes = ru.includes("/dish/get_delivery_dishes");
  if (!isDetail && !isDishes) return;
  if ((isDetail && detailJson) || (isDishes && dishesJson)) return;
  pending.push(r.json().then((j) => {
    if (isDetail && !detailJson) detailJson = j;
    if (isDishes && !dishesJson) dishesJson = j;
  }).catch(() => {}));
});

try { await page.goto("https://shopeefood.vn/", { waitUntil: "domcontentloaded", timeout: 20000 }); } catch {}
try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); } catch {}

await new Promise((resolve) => {
  const start = Date.now();
  const t = setInterval(async () => {
    await Promise.all(pending.splice(0));
    if ((detailJson && dishesJson) || Date.now() - start > 25000) { clearInterval(t); resolve(); }
  }, 400);
});

console.log("detailJson:", !!detailJson, "dishesJson:", !!dishesJson);

if (detailJson && !dishesJson) {
  const id = detailJson?.reply?.delivery_detail?.id;
  console.log("fallback nav with deliveryId=", id);
  if (id) {
    try {
      await page.goto(`https://gappapi.deliverynow.vn/api/dish/get_delivery_dishes?id_type=2&request_id=${id}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      const txt = await page.evaluate(() => document.body.innerText);
      if (txt.trim().startsWith("{")) dishesJson = JSON.parse(txt);
    } catch (e) { console.log("fallback err:", String(e).slice(0, 100)); }
  }
}

const restaurantName = parseDetailName(detailJson) ?? "ShopeeFood Restaurant";
const items = parseDishes(dishesJson) ?? [];
console.log("\n=== RESULT ===");
console.log("restaurantName:", restaurantName);
console.log("itemCount:", items.length);
if (items.length) {
  console.log("\nfirst 3 items:");
  for (const it of items.slice(0, 3)) {
    console.log(`  - ${it.name} | ${it.originalPrice}đ${it.discountedPrice ? ` → ${it.discountedPrice}đ` : ""} | img=${it.imageUrl?.slice(0, 60)} | opts=${it.options.length}`);
    for (const o of it.options.slice(0, 1)) {
      console.log(`      group "${o.group}": ${o.choices.slice(0, 3).map((c) => `${c.label}(+${c.price})`).join(", ")}${o.choices.length > 3 ? ", ..." : ""}`);
    }
  }
}

await browser.close();
