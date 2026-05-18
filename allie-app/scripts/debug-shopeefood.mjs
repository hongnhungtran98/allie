// Debug script: try to scrape ShopeeFood menu for a given URL via Puppeteer.
// Usage: node scripts/debug-shopeefood.mjs "https://shopeefood.vn/now-food/shop/1218654"
import puppeteer from "puppeteer";

const url = process.argv[2] || "https://shopeefood.vn/now-food/shop/1218654";
const FOODY_HEADERS = {
  "x-foody-client-id": "1",
  "x-foody-client-version": "5",
  "x-foody-api-version": "2",
  "x-foody-client-language": "vi",
};

const CITY_IDS = ["217", "56", "330", "1", "3", "136", "4", "19", "5"];

function summarize(json) {
  try {
    const s = JSON.stringify(json);
    return s.length > 600 ? s.slice(0, 600) + "..." : s;
  } catch {
    return String(json);
  }
}

async function main() {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  console.log("[debug] pathname parts:", parts);
  // For /now-food/shop/{id}: parts = ["now-food", "shop", "1218654"]
  const restaurantId =
    parts[0] === "now-food" && parts[1] === "shop" ? parts[2] : null;
  console.log("[debug] restaurantId guess:", restaurantId);

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

    // Pre-set HCM city cookie (will refine after metadata loads)
    await page.browserContext().setCookie({
      name: "city_id",
      value: "217",
      domain: ".shopeefood.vn",
      path: "/",
    });

    const apiLog = [];
    let menuPayload = null;
    let restaurantMeta = null;

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().includes("deliverynow.vn") || req.url().includes("shopeefood.vn/api")) {
        req.continue({ headers: { ...req.headers(), ...FOODY_HEADERS } });
      } else {
        req.continue();
      }
    });

    page.on("response", async (response) => {
      const ru = response.url();
      if (!ru.includes("deliverynow.vn")) return;
      const ct = response.headers()["content-type"] ?? "";
      const path = ru.replace(/^https?:\/\/[^/]+/, "").slice(0, 110);
      apiLog.push(`${response.status()} ${path}`);
      if (!ct.includes("json")) return;
      try {
        const json = await response.json();
        // Look for menu_infos anywhere in the response
        const s = JSON.stringify(json);
        if (s.includes("menu_infos") && !menuPayload) {
          menuPayload = json;
          console.log("[debug] >>> menu_infos captured from:", path);
        }
        if (
          (ru.includes("get_detail") || ru.includes("get_from_url") || ru.includes("get_delivery")) &&
          !restaurantMeta
        ) {
          restaurantMeta = { url: path, sample: summarize(json) };
        }
      } catch {}
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[page-err]", msg.text().slice(0, 200));
    });

    console.log("[debug] navigating...");
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e) {
      console.log("[debug] goto threw:", String(e).slice(0, 120));
    }

    // Wait for SPA to call its APIs
    await new Promise((r) => setTimeout(r, 8000));

    console.log("\n[debug] API calls observed (deliverynow.vn):");
    apiLog.slice(0, 60).forEach((l) => console.log("  ", l));

    if (restaurantMeta) {
      console.log("\n[debug] restaurant metadata sample from", restaurantMeta.url);
      console.log(restaurantMeta.sample);
    }

    // Try scrolling to trigger menu load
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let s = 0;
        const t = setInterval(() => {
          window.scrollBy(0, 600);
          s += 600;
          if (s >= document.body.scrollHeight) {
            clearInterval(t);
            resolve();
          }
        }, 200);
      });
    });
    await new Promise((r) => setTimeout(r, 4000));

    console.log("\n[debug] total API calls now:", apiLog.length);

    if (menuPayload) {
      const reply = menuPayload.reply || menuPayload;
      const detail = reply?.delivery_detail || reply;
      const restaurant = detail?.restaurant || {};
      const menu = detail?.menu_infos || [];
      let count = 0;
      for (const cat of menu) for (const _ of cat?.foods || []) count++;
      console.log("\n[debug] ✅ MENU FOUND");
      console.log("  restaurant.name:", restaurant.name);
      console.log("  categories:", menu.length, " total dishes:", count);
      console.log("  first dish sample:", summarize(menu[0]?.foods?.[0]));
    } else {
      console.log("\n[debug] ❌ no menu_infos captured");
      // Fallback: try direct API by restaurant id from page context (cookies set now)
      if (restaurantId) {
        console.log("[debug] trying direct API by restaurant id from page context...");
        const direct = await page.evaluate(
          async (id, headers, cityIds) => {
            const tries = [];
            const eps = (cid) => [
              `https://gappapi.deliverynow.vn/api/delivery/get_detail?id_type=2&request_id=${id}&city_id=${cid}`,
              `https://gappapi.deliverynow.vn/api/dish/get_delivery_dishes?id_type=2&request_id=${id}&city_id=${cid}`,
              `https://gappapi.deliverynow.vn/api/delivery/get_from_url?url=${encodeURIComponent(`https://shopeefood.vn/now-food/shop/${id}`)}&city_id=${cid}`,
            ];
            for (const cid of cityIds) {
              for (const ep of eps(cid)) {
                try {
                  const res = await fetch(ep, { headers, credentials: "include" });
                  const body = await res.text();
                  tries.push({ status: res.status, ep: ep.slice(40, 140), hasMenu: body.includes("menu_infos"), preview: body.slice(0, 200) });
                  if (res.ok && body.includes("menu_infos")) return { ok: true, json: JSON.parse(body), tries };
                } catch (e) {
                  tries.push({ status: 0, ep: ep.slice(40, 140), err: String(e).slice(0, 80) });
                }
              }
              // Stop scanning cities if we get a non-403 (city is correct or irrelevant)
              if (tries[tries.length - 1]?.status === 200) break;
            }
            return { ok: false, tries };
          },
          restaurantId,
          FOODY_HEADERS,
          CITY_IDS
        );
        console.log("[debug] direct attempts:");
        direct.tries.forEach((t) => console.log("  ", t.status, t.ep, t.hasMenu ? "✅" : t.err || ""));
        if (direct.ok) {
          const detail = direct.json?.reply?.delivery_detail || {};
          const menu = detail.menu_infos || [];
          let count = 0;
          for (const cat of menu) for (const _ of cat?.foods || []) count++;
          console.log("[debug] ✅ DIRECT API HIT — restaurant:", detail.restaurant?.name, "dishes:", count);
        }
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
