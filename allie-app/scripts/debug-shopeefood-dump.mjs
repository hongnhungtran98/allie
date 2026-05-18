import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteerExtra.use(StealthPlugin());
import fs from "node:fs";

const url = process.argv[2] || "https://shopeefood.vn/now-food/shop/1218654";
const browser = await puppeteerExtra.launch({
  headless: true,
  args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu","--window-size=1366,768"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 });

let detail = null, dishes = null;
page.on("response", async (r) => {
  const ru = r.url();
  if (!ru.includes("deliverynow.vn")) return;
  const ct = r.headers()["content-type"] ?? "";
  if (!ct.includes("json")) return;
  try {
    if (ru.includes("/delivery/get_detail") && !detail) {
      detail = await r.json();
    }
    if (ru.includes("/dish/get_delivery_dishes") && !dishes) {
      dishes = await r.json();
    }
  } catch {}
});

try { await page.goto("https://shopeefood.vn/", { waitUntil: "domcontentloaded", timeout: 30000 }); } catch {}
await new Promise((r) => setTimeout(r, 2000));
try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); } catch {}
await new Promise((r) => setTimeout(r, 10000));

if (detail) fs.writeFileSync("scripts/_sf_detail.json", JSON.stringify(detail, null, 2));
if (dishes) fs.writeFileSync("scripts/_sf_dishes.json", JSON.stringify(dishes, null, 2));

console.log("detail saved:", !!detail, " dishes saved:", !!dishes);

if (dishes) {
  const menuInfos = dishes?.reply?.menu_infos || [];
  console.log("\ncategories:", menuInfos.length);
  let total = 0;
  for (const cat of menuInfos) total += (cat.dishes || []).length;
  console.log("total dishes:", total);
  const first = menuInfos[0]?.dishes?.[0];
  console.log("\nfirst dish keys:", Object.keys(first || {}).join(", "));
  console.log("first dish:", JSON.stringify(first, null, 2).slice(0, 2000));
}

if (detail) {
  const dd = detail?.reply?.delivery_detail || {};
  console.log("\ndelivery_detail.name:", dd.name);
  console.log("delivery_detail.id:", dd.id);
  console.log("delivery_detail.restaurant_id:", dd.restaurant_id);
  console.log("delivery_detail keys (subset):", Object.keys(dd).slice(0, 40).join(", "));
}

await browser.close();
