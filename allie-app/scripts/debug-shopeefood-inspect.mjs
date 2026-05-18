// Dump every deliverynow.vn JSON response containing dish-like data
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

const captured = [];
page.on("response", async (response) => {
  const ru = response.url();
  if (!ru.includes("deliverynow.vn")) return;
  const ct = response.headers()["content-type"] ?? "";
  if (!ct.includes("json")) return;
  try {
    const text = await response.text();
    if (
      text.includes("menu_infos") ||
      text.includes("delivery_detail") ||
      text.includes("dish") ||
      text.includes("\"foods\"") ||
      text.includes("price\":")
    ) {
      captured.push({ url: ru, len: text.length, sample: text.slice(0, 600) });
    }
  } catch {}
});

console.log("loading...");
try { await page.goto("https://shopeefood.vn/", { waitUntil: "domcontentloaded", timeout: 30000 }); } catch {}
await new Promise((r) => setTimeout(r, 2000));
try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); } catch {}
await new Promise((r) => setTimeout(r, 10000));

// Scroll to trigger lazy menu
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let s = 0;
    const t = setInterval(() => {
      window.scrollBy(0, 600);
      s += 600;
      if (s >= document.body.scrollHeight + 3000) { clearInterval(t); resolve(); }
    }, 200);
  });
});
await new Promise((r) => setTimeout(r, 5000));

console.log("captured", captured.length, "interesting responses");
captured.forEach((c, i) => {
  console.log(`\n--- [${i}] ${c.url.replace(/^https?:\/\/[^/]+/, "")} (len=${c.len})`);
  console.log(c.sample);
});

// Also save the largest one fully for offline inspection
const largest = captured.sort((a, b) => b.len - a.len)[0];
if (largest) {
  // re-fetch via page so we can save full
  console.log("\nlargest URL:", largest.url);
}

await browser.close();
