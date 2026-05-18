// Stealth attempt: puppeteer-extra + stealth plugin
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteerExtra.use(StealthPlugin());

const url = process.argv[2] || "https://shopeefood.vn/now-food/shop/1218654";

async function probeDirect(page, restaurantId) {
  const cityIds = ["217", "56", "330", "1", "3", "136", "4", "19", "5"];
  for (const cid of cityIds) {
    const apiUrl = `https://gappapi.deliverynow.vn/api/delivery/get_detail?id_type=2&request_id=${restaurantId}&city_id=${cid}`;
    try {
      const resp = await page.goto(apiUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      const body = await page.evaluate(() => document.body.innerText);
      const status = resp?.status();
      console.log(`  city ${cid}: status=${status}, body[0:120]=${body.slice(0, 120)}`);
      if (body.includes("menu_infos")) {
        const json = JSON.parse(body);
        const detail = json?.reply?.delivery_detail || {};
        const menu = detail.menu_infos || [];
        let count = 0;
        let first = null;
        for (const cat of menu) for (const f of cat?.foods || []) { count++; first ||= f; }
        console.log("\n  ✅ MENU FOUND via city_id=" + cid);
        console.log("    restaurant:", detail.restaurant?.name);
        console.log("    categories:", menu.length, "dishes:", count);
        console.log("    first food name:", first?.name);
        console.log("    first food price:", first?.price);
        return true;
      }
    } catch (e) {
      console.log(`  city ${cid}: ERR ${String(e).slice(0, 100)}`);
    }
  }
  return false;
}

async function main() {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  const restaurantId = parts[0] === "now-food" && parts[1] === "shop" ? parts[2] : null;
  console.log("[stealth] restaurantId:", restaurantId);

  const browser = await puppeteerExtra.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1366,768",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // Capture menu_infos from any deliverynow.vn JSON response
    let menuPayload = null;
    const apiLog = [];
    page.on("response", async (response) => {
      const ru = response.url();
      if (!ru.includes("deliverynow.vn")) return;
      apiLog.push(`${response.status()} ${ru.replace(/^https?:\/\/[^/]+/, "").slice(0, 120)}`);
      const ct = response.headers()["content-type"] ?? "";
      if (!ct.includes("json")) return;
      try {
        const json = await response.json();
        if (JSON.stringify(json).includes("menu_infos") && !menuPayload) {
          menuPayload = json;
          console.log("[stealth] >>> menu_infos captured from response handler");
        }
      } catch {}
    });

    console.log("[stealth] visiting homepage...");
    try {
      await page.goto("https://shopeefood.vn/", { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));

    console.log("[stealth] visiting shop page...");
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {}
    await new Promise((r) => setTimeout(r, 8000));

    console.log("[stealth] API calls observed:", apiLog.length);
    apiLog.slice(0, 20).forEach((l) => console.log("  ", l));

    const cookies = await page.browserContext().cookies();
    console.log(
      "[stealth] cookies on deliverynow.vn:",
      cookies.filter((c) => c.domain.includes("deliverynow")).map((c) => c.name).join(", ") || "(none)"
    );
    console.log(
      "[stealth] cookies on shopeefood.vn:",
      cookies.filter((c) => c.domain.includes("shopeefood")).map((c) => c.name).join(", ") || "(none)"
    );

    if (menuPayload) {
      const detail = menuPayload?.reply?.delivery_detail || {};
      const menu = detail.menu_infos || [];
      let count = 0;
      for (const cat of menu) for (const _ of cat?.foods || []) count++;
      console.log("\n[stealth] ✅ MENU CAPTURED PASSIVELY");
      console.log("  restaurant:", detail.restaurant?.name);
      console.log("  categories:", menu.length, "dishes:", count);
      return;
    }

    if (restaurantId) {
      console.log("\n[stealth] trying direct API navigation...");
      const ok = await probeDirect(page, restaurantId);
      if (!ok) console.log("\n[stealth] ❌ all direct attempts failed");
    }

    // Final: dump page text snippet
    if (!menuPayload) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        const txt = await page.evaluate(() => document.body.innerText.slice(0, 300));
        console.log("\n[stealth] page text head:", txt);
      } catch {}
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
