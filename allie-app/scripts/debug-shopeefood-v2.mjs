// v2: do NOT inject custom headers into the SPA's own requests (breaks CORS).
// Just observe responses and let the page load naturally.
import puppeteer from "puppeteer";

const url = process.argv[2] || "https://shopeefood.vn/now-food/shop/1218654";

function summarize(json) {
  try {
    const s = JSON.stringify(json);
    return s.length > 800 ? s.slice(0, 800) + "..." : s;
  } catch {
    return String(json);
  }
}

async function main() {
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
    await page.browserContext().setCookie({
      name: "city_id",
      value: "217",
      domain: ".shopeefood.vn",
      path: "/",
    });

    const apiLog = [];
    const interesting = [];
    let menuPayload = null;

    // NO request interception — let the SPA's own headers/CORS work
    page.on("response", async (response) => {
      const ru = response.url();
      if (!ru.includes("deliverynow.vn")) return;
      const path = ru.replace(/^https?:\/\/[^/]+/, "");
      apiLog.push(`${response.status()} ${path.slice(0, 140)}`);
      const ct = response.headers()["content-type"] ?? "";
      if (!ct.includes("json")) return;
      try {
        const json = await response.json();
        const s = JSON.stringify(json);
        if (s.includes("menu_infos") && !menuPayload) {
          menuPayload = { path, json };
          console.log("[v2] >>> menu_infos captured from:", path.slice(0, 140));
        }
        if (path.includes("get_detail") || path.includes("get_from_url") || path.includes("get_delivery")) {
          interesting.push({ path: path.slice(0, 140), sample: summarize(json) });
        }
      } catch {}
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[page-err]", msg.text().slice(0, 200));
    });

    console.log("[v2] navigating...");
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e) {
      console.log("[v2] goto threw:", String(e).slice(0, 120));
    }

    await new Promise((r) => setTimeout(r, 6000));
    console.log("[v2] URL after navigation:", page.url());

    // Scroll to trigger lazy menu load
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let s = 0;
        const t = setInterval(() => {
          window.scrollBy(0, 600);
          s += 600;
          if (s >= document.body.scrollHeight + 2000) {
            clearInterval(t);
            resolve();
          }
        }, 250);
      });
    });
    await new Promise((r) => setTimeout(r, 5000));

    console.log("\n[v2] API calls observed (deliverynow.vn), total =", apiLog.length);
    apiLog.slice(0, 50).forEach((l) => console.log("  ", l));

    if (interesting.length) {
      console.log("\n[v2] interesting responses:");
      interesting.slice(0, 5).forEach((i) => {
        console.log("  -", i.path);
        console.log("    ", i.sample.slice(0, 400));
      });
    }

    if (menuPayload) {
      const reply = menuPayload.json.reply || menuPayload.json;
      const detail = reply?.delivery_detail || reply;
      const restaurant = detail?.restaurant || {};
      const menu = detail?.menu_infos || [];
      let count = 0;
      let firstFood = null;
      for (const cat of menu) for (const f of cat?.foods || []) { count++; firstFood ||= f; }
      console.log("\n[v2] ✅ MENU CAPTURED");
      console.log("  source:", menuPayload.path);
      console.log("  restaurant:", restaurant.name);
      console.log("  categories:", menu.length, "dishes:", count);
      console.log("  first food:", summarize(firstFood));
    } else {
      console.log("\n[v2] ❌ no menu_infos seen");
      // dump the HTML title at least
      const title = await page.title();
      console.log("[v2] page title:", title);
      // try to find an embedded delivery_id or url_name in the DOM
      const inspect = await page.evaluate(() => {
        const text = document.documentElement.innerText.slice(0, 500);
        const og = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
        return { text, og, href: location.href };
      });
      console.log("[v2] location.href:", inspect.href);
      console.log("[v2] og:url:", inspect.og);
      console.log("[v2] body text head:", inspect.text);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
