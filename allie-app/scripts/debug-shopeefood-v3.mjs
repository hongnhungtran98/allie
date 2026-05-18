// v3: After loading the shop page (to establish session/cookies on gappapi.deliverynow.vn),
// navigate directly to the API URL — top-level nav bypasses CORS.
import puppeteer from "puppeteer";

const url = process.argv[2] || "https://shopeefood.vn/now-food/shop/1218654";

async function main() {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  const isShopIdForm = parts[0] === "now-food" && parts[1] === "shop";
  const restaurantId = isShopIdForm ? parts[2] : null;
  console.log("[v3] restaurantId:", restaurantId);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1366,768",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}), app: {} };
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["vi-VN", "vi", "en-US", "en"] });
    });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Step 1: visit homepage to let server set any anti-bot / session cookies
    console.log("[v3] visiting homepage...");
    try {
      await page.goto("https://shopeefood.vn/", { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));

    // Step 2: visit the shop page to trigger metadata calls
    console.log("[v3] visiting shop page...");
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {}
    await new Promise((r) => setTimeout(r, 4000));

    // Show cookies
    const cookies = await page.browserContext().cookies();
    console.log(
      "[v3] cookies on deliverynow.vn:",
      cookies.filter((c) => c.domain.includes("deliverynow")).map((c) => c.name).join(", ") || "(none)"
    );
    console.log(
      "[v3] cookies on shopeefood.vn:",
      cookies.filter((c) => c.domain.includes("shopeefood")).map((c) => c.name).join(", ") || "(none)"
    );

    if (!restaurantId) {
      console.log("[v3] no restaurantId, stopping");
      return;
    }

    // Step 3: try API URL via top-level nav — no CORS
    const cityIds = ["217", "56", "330", "1", "3", "136", "4", "19", "5"];
    for (const cid of cityIds) {
      const apiUrl = `https://gappapi.deliverynow.vn/api/delivery/get_detail?id_type=2&request_id=${restaurantId}&city_id=${cid}`;
      console.log("\n[v3] navigating to", apiUrl);
      let bodyText = "";
      try {
        const resp = await page.goto(apiUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
        bodyText = await page.evaluate(() => document.body.innerText);
        console.log("[v3] status:", resp?.status(), " body[0:200]:", bodyText.slice(0, 200));
      } catch (e) {
        console.log("[v3] nav err:", String(e).slice(0, 120));
        continue;
      }
      if (bodyText.includes("menu_infos")) {
        try {
          const json = JSON.parse(bodyText);
          const detail = json?.reply?.delivery_detail || {};
          const menu = detail.menu_infos || [];
          let count = 0;
          let first = null;
          for (const cat of menu) for (const f of cat?.foods || []) { count++; first ||= f; }
          console.log("\n[v3] ✅ MENU FOUND via city_id=" + cid);
          console.log("  restaurant:", detail.restaurant?.name);
          console.log("  categories:", menu.length, "dishes:", count);
          console.log("  first food name:", first?.name);
          console.log("  first food price:", first?.price);
          console.log("  first food photo:", first?.photos?.[0]?.value);
          return;
        } catch (e) {
          console.log("[v3] parse err:", String(e).slice(0, 120));
        }
      }
    }

    console.log("\n[v3] ❌ none of the city_ids returned menu_infos");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
