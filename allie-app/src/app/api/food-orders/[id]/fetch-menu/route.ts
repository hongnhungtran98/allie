import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

type Params = { params: Promise<{ id: string }> };

interface RawItem {
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  discountedPrice: number | null;
  options: { group: string; choices: { label: string; price: number }[] }[];
}

function parseVnPrice(text: string): number {
  // "59.000" → 59000, "53.100" → 53100
  return parseInt(text.replace(/\./g, "").replace(/[^\d]/g, ""), 10) || 0;
}

// Parse modifier groups from a raw GrabFood API item.
// GrabFood uses several field names across API versions; we try each in order.
function parseGrabModifierGroups(
  raw: unknown
): { group: string; choices: { label: string; price: number }[] }[] {
  if (!Array.isArray(raw)) return [];
  const result: { group: string; choices: { label: string; price: number }[] }[] = [];
  for (const g of raw) {
    const group = g as Record<string, unknown>;
    const groupName = String(group.name ?? group.label ?? "").trim();
    const rawChoices = (
      group.modifiers ?? group.options ?? group.selections ?? group.items
    ) as unknown[] | undefined;
    if (!Array.isArray(rawChoices)) continue;
    const choices = rawChoices
      .map((c) => {
        const ch = c as Record<string, unknown>;
        const label = String(ch.name ?? ch.label ?? "").trim();
        const price = Number(
          ch.priceInMinorUnit ?? ch.price ?? ch.priceModifier ?? ch.additionalPrice ?? 0
        );
        return { label, price };
      })
      .filter((c) => c.label);
    if (choices.length > 0) result.push({ group: groupName, choices });
  }
  return result;
}

// Try to parse a GrabFood internal API JSON response into restaurant name + items.
// Actual shape (portal.grab.com/foodweb/guest/v2/merchants/{id}):
//   { merchant: { name, menu: { categories: [{ items: [{ priceInMinorUnit, imgHref, modifierGroups }] }] } } }
function parseGrabApiJson(
  data: unknown
): { restaurantName: string; items: RawItem[] } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const merchant = d.merchant as Record<string, unknown> | undefined;
  if (!merchant) return null;

  const restaurantName = String(merchant.name ?? "").trim();

  const menu = merchant.menu as Record<string, unknown> | undefined;
  const categories = menu?.categories as unknown[] | undefined;
  if (!Array.isArray(categories) || categories.length === 0) return null;

  const items: RawItem[] = [];
  for (const cat of categories) {
    const c = cat as Record<string, unknown>;
    const catItems = c.items as unknown[] | undefined;
    if (!Array.isArray(catItems)) continue;

    for (const raw of catItems) {
      const item = raw as Record<string, unknown>;
      const name = String(item.name ?? "").trim();
      if (!name) continue;

      // GrabFood uses priceInMinorUnit (VND, already in full units for VN)
      const originalPrice = Number(item.priceInMinorUnit ?? item.price ?? 0);
      if (!originalPrice) continue;

      const imageUrl = (item.imgHref as string | undefined) ?? null;

      const discountedRaw = Number(item.discountedPriceInMinorUnit ?? item.discountedPrice ?? 0);
      const discountedPrice =
        discountedRaw > 0 && discountedRaw !== originalPrice ? discountedRaw : null;

      const options = parseGrabModifierGroups(item.modifierGroups ?? []);

      items.push({ name, imageUrl, originalPrice, discountedPrice, options });
    }
  }

  return items.length > 0 ? { restaurantName, items } : null;
}

async function fetchGrabMenu(
  url: string
): Promise<{ restaurantName: string; items: RawItem[] }> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Intercept GrabFood's internal API responses to capture items with modifierGroups.
    // This mirrors the ShopeeFood approach and is far more reliable than DOM scraping for options.
    const pending: Promise<void>[] = [];
    let capturedData: { restaurantName: string; items: RawItem[] } | null = null;

    await page.setRequestInterception(true);
    page.on("request", (req) => req.continue());

    page.on("response", (response) => {
      if (capturedData) return;
      const responseUrl = response.url();
      if (!responseUrl.includes("grab.com") && !responseUrl.includes("grabfood")) return;
      const ct = response.headers()["content-type"] ?? "";
      if (!ct.includes("json")) return;

      console.log("[GrabFood] intercepted JSON:", responseUrl);

      const p = response
        .json()
        .then((json) => {
          const parsed = parseGrabApiJson(json);
          if (parsed && parsed.items.length > 0 && !capturedData) {
            console.log(
              "[GrabFood] menu captured:",
              parsed.items.length,
              "items, first item options:",
              JSON.stringify(parsed.items[0]?.options)
            );
            capturedData = parsed;
          } else {
            // Log top-level keys + larger sample to diagnose parser mismatch
            const keys = json && typeof json === "object" ? Object.keys(json as object).join(", ") : "(non-object)";
            console.log("[GrabFood] not matched — top-level keys:", keys);
            console.log("[GrabFood] not matched — sample:", JSON.stringify(json).slice(0, 1500));
          }
        })
        .catch(() => {});
      pending.push(p);
    });

    // domcontentloaded avoids timeout on SPAs that never reach networkidle
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {
      // navigation timeout is acceptable; keep waiting for API responses below
    }

    // Poll up to 30 s for the menu API response (same pattern as ShopeeFood)
    await new Promise<void>((resolve) => {
      const start = Date.now();
      const tick = setInterval(async () => {
        await Promise.all(pending.splice(0));
        if (capturedData || Date.now() - start > 30_000) {
          clearInterval(tick);
          resolve();
        }
      }, 500);
    });

    if (capturedData) return capturedData;

    // ── Fallback: DOM scraping (no modifiers available) ─────────────────────
    try {
      await page.waitForSelector('[class*="menuItemWrapper"]', { timeout: 15000 });
    } catch {
      return { restaurantName: "GrabFood Restaurant", items: [] };
    }

    // Scroll to bottom so lazy-loaded images get their src populated
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let scrolled = 0;
        const step = 800;
        const interval = setInterval(() => {
          window.scrollBy(0, step);
          scrolled += step;
          if (scrolled >= document.body.scrollHeight) {
            clearInterval(interval);
            resolve();
          }
        }, 120);
      });
    });

    const result = await page.evaluate(() => {
      const titleEl =
        document.querySelector("h1") ||
        document.querySelector('[class*="restaurantName"]');
      const restaurantName =
        titleEl?.textContent?.trim() || document.title.split("|")[0].trim();

      const itemEls = document.querySelectorAll('[class*="menuItemWrapper"]');
      const items: {
        name: string;
        imageUrl: string | null;
        originalPriceText: string;
        discountedPriceText: string;
      }[] = [];

      itemEls.forEach((el) => {
        const nameEl = el.querySelector('[class*="itemNameTitle"]');
        if (!nameEl) return;
        const name = nameEl.textContent?.trim() ?? "";

        const imgEl = el.querySelector<HTMLImageElement>('[class*="realImage"]');
        // GrabFood lazy-loads images; real URL may be in data-src or srcset before scroll
        const imageUrl =
          imgEl?.getAttribute("data-src") ||
          imgEl?.getAttribute("data-lazy-src") ||
          (imgEl?.src && !imgEl.src.startsWith("data:") ? imgEl.src : null) ||
          imgEl?.getAttribute("srcset")?.split(",")[0]?.trim().split(" ")[0] ||
          null;

        const originPriceEl = el.querySelector('[class*="originPrice"]');
        const discountedPriceEl = el.querySelector('[class*="discountedPrice"]');
        items.push({
          name,
          imageUrl,
          originalPriceText: originPriceEl?.textContent?.trim() ?? "",
          discountedPriceText: discountedPriceEl?.textContent?.trim() ?? "",
        });
      });

      return { restaurantName, items };
    });

    const items: RawItem[] = result.items
      .filter((i) => i.name)
      .map((i) => {
        const hasDiscount =
          i.originalPriceText !== "" && i.discountedPriceText !== "";
        const originalPrice = hasDiscount
          ? parseVnPrice(i.originalPriceText)
          : parseVnPrice(i.discountedPriceText || i.originalPriceText);
        const discountedPrice = hasDiscount
          ? parseVnPrice(i.discountedPriceText)
          : null;

        if (originalPrice === 0) return null;

        return {
          name: i.name,
          imageUrl: i.imageUrl,
          originalPrice,
          discountedPrice:
            discountedPrice !== null && discountedPrice !== originalPrice
              ? discountedPrice
              : null,
          options: [] as RawItem["options"],
        };
      })
      .filter((i): i is RawItem => i !== null);

    return { restaurantName: result.restaurantName, items };
  } finally {
    await browser.close();
  }
}

// Parse ShopeeFood API JSON response (gappapi.deliverynow.vn)
function parseShopeeFoodApiResponse(
  data: unknown
): { restaurantName: string; items: RawItem[] } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  // Shape: { reply: { delivery_detail: { restaurant: {...}, menu_infos: [...] } } }
  const reply = d.reply as Record<string, unknown> | undefined;
  const detail = reply?.delivery_detail as Record<string, unknown> | undefined;
  if (!detail) return null;

  const restaurant = detail.restaurant as Record<string, unknown> | undefined;
  const menuInfos = detail.menu_infos as unknown[] | undefined;
  if (!restaurant || !Array.isArray(menuInfos)) return null;

  const restaurantName = String(restaurant.name ?? "ShopeeFood Restaurant");
  const items: RawItem[] = [];

  for (const cat of menuInfos) {
    const foods = (cat as Record<string, unknown>).foods as unknown[] | undefined;
    if (!Array.isArray(foods)) continue;
    for (const food of foods) {
      const f = food as Record<string, unknown>;
      const name = String(f.name ?? "").trim();
      if (!name) continue;

      const priceObj = f.price as Record<string, unknown> | undefined;
      const originalPrice = Number(priceObj?.value ?? f.total_price ?? 0);
      if (!originalPrice) continue;

      const photos = f.photos as { value?: string }[] | undefined;
      const imageUrl = photos?.[0]?.value ?? null;

      const discountedRaw = Number(f.discount_price ?? 0);
      const discountedPrice =
        discountedRaw > 0 && discountedRaw !== originalPrice ? discountedRaw : null;

      items.push({ name, imageUrl, originalPrice, discountedPrice, options: [] });
    }
  }

  return items.length > 0 ? { restaurantName, items } : null;
}

const CITY_SLUG_TO_ID: Record<string, string> = {
  "ho-chi-minh": "217",
  "ha-noi": "56",
  "da-nang": "330",
  "can-tho": "1",
  "hai-phong": "3",
  "bien-hoa": "136",
  "vung-tau": "4",
  "nha-trang": "19",
  "hue": "5",
};

const FOODY_HEADERS = {
  "x-foody-client-id": "1",
  "x-foody-client-version": "5",
  "x-foody-api-version": "2",
  "x-foody-client-language": "vi",
};

async function fetchShopeeFoodMenu(
  url: string
): Promise<{ restaurantName: string; items: RawItem[] }> {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  const citySlug = parts[0] ?? "";
  const restaurantSlug = parts[1] ?? "";
  const cityId = CITY_SLUG_TO_ID[citySlug] ?? "217";

  const fallbackName = restaurantSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "ShopeeFood Restaurant";

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
      (window as Window & { chrome?: unknown }).chrome = {
        runtime: {},
        loadTimes: () => ({}),
        csi: () => ({}),
        app: {},
      };
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", {
        get: () => ["vi-VN", "vi", "en-US", "en"],
      });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    // Pre-set city cookie — app needs this to skip city-selection step and load restaurant data
    await page.browserContext().setCookie({
      name: "city_id",
      value: cityId,
      domain: ".shopeefood.vn",
      path: "/",
    });

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().includes("deliverynow.vn") || req.url().includes("shopeefood.vn/api")) {
        console.log("[ShopeeFood REQ]", req.method(), req.url().slice(0, 100));
        req.continue({ headers: { ...req.headers(), ...FOODY_HEADERS } });
      } else {
        req.continue();
      }
    });

    const pending: Promise<void>[] = [];
    let capturedData: { restaurantName: string; items: RawItem[] } | null = null;

    page.on("response", (response) => {
      if (capturedData) return;
      if (!response.url().includes("deliverynow.vn")) return;
      console.log("[ShopeeFood RES]", response.status(), response.url().slice(0, 100));
      const ct = response.headers()["content-type"] ?? "";
      if (!ct.includes("json")) return;

      const p = response
        .json()
        .then((json) => {
          const parsed = parseShopeeFoodApiResponse(json);
          if (parsed && !capturedData) capturedData = parsed;
        })
        .catch(() => {});
      pending.push(p);
    });

    // Track when the main metadata call completes so we know cookies are set
    let metadataReady = false;
    page.on("response", (response) => {
      if (response.url().includes("get_metadata") && !response.url().includes("minimal")) {
        metadataReady = true;
      }
    });

    // Log JS errors that may explain why the app is stuck
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[ShopeeFood JS]", msg.text().slice(0, 120));
    });
    page.on("pageerror", (err) => {
      console.log("[ShopeeFood PageError]", String(err).slice(0, 120));
    });

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {
      // timeout OK
    }

    // Wait for metadata to land (max 10 s), then try direct API immediately
    await new Promise<void>((resolve) => {
      const start = Date.now();
      const tick = setInterval(async () => {
        await Promise.all(pending.splice(0));
        if (capturedData || metadataReady || Date.now() - start > 10_000) {
          clearInterval(tick);
          resolve();
        }
      }, 300);
    });

    if (capturedData) return capturedData;

    // Direct API from browser context — cookies are now set from metadata calls
    const searchName = restaurantSlug.replace(/-/g, " ");
    console.log("[ShopeeFood] Direct API attempt — slug:", restaurantSlug, "city:", cityId);

    const directResult = await page.evaluate(
      async (
        slug: string,
        cid: string,
        name: string,
        headers: Record<string, string>
      ) => {
        const candidates = [
          `https://gappapi.deliverynow.vn/api/v2/delivery/get_delivery?url_name=${encodeURIComponent(slug)}&city_id=${cid}`,
          `https://gappapi.deliverynow.vn/api/v1/delivery/get_delivery?url_name=${encodeURIComponent(slug)}&city_id=${cid}`,
          `https://gappapi.deliverynow.vn/api/v2/delivery/get_detail?url_name=${encodeURIComponent(slug)}&city_id=${cid}`,
          `https://gappapi.deliverynow.vn/api/v1/search/search_now?keyword=${encodeURIComponent(name)}&city_id=${cid}&foody_client_id=3`,
        ];
        const log: string[] = [];
        for (const endpoint of candidates) {
          try {
            const res = await fetch(endpoint, { headers, credentials: "include" });
            const body = await res.text();
            log.push(`${res.status} ${endpoint.slice(40, 110)} → ${body.slice(0, 120)}`);
            if (res.ok) {
              const json = JSON.parse(body) as Record<string, unknown>;
              if (json?.reply) return { json, log };
            }
          } catch (e) {
            log.push(`ERR ${endpoint.slice(40, 110)} → ${String(e).slice(0, 60)}`);
          }
        }
        return { json: null, log };
      },
      restaurantSlug,
      cityId,
      searchName,
      FOODY_HEADERS
    );

    console.log("[ShopeeFood] Direct API log:\n", directResult.log.join("\n"));
    if (directResult.json) {
      const parsed = parseShopeeFoodApiResponse(directResult.json);
      if (parsed) return parsed;
      console.log("[ShopeeFood] Unknown response shape:", JSON.stringify(directResult.json).slice(0, 400));
    }

    return { restaurantName: fallbackName, items: [] };
  } finally {
    await browser.close();
  }
}

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.foodOrder.findUnique({
    where: { id },
    include: { _count: { select: { menuItems: true } } },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.creatorId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (order._count.menuItems > 0) {
    return NextResponse.json({ restaurantName: order.restaurantName, alreadyFetched: true });
  }

  const sourceUrl = order.sourceUrl.toLowerCase();
  const isGrab =
    sourceUrl.includes("grab.com") || sourceUrl.includes("r.grab.com");

  let restaurantName: string;
  let items: RawItem[];
  let scraperError: string | null = null;

  if (isGrab) {
    try {
      ({ restaurantName, items } = await fetchGrabMenu(order.sourceUrl));
      if (items.length === 0) {
        scraperError = "No menu items found on the GrabFood page. The page may have changed its layout.";
      }
    } catch (err) {
      scraperError = err instanceof Error ? err.message : "Failed to fetch GrabFood menu";
      restaurantName = "GrabFood Restaurant";
      items = [];
    }
  } else {
    try {
      ({ restaurantName, items } = await fetchShopeeFoodMenu(order.sourceUrl));
      if (items.length === 0) {
        scraperError =
          "Could not load ShopeeFood menu automatically (the site may have blocked the request). Please add menu items manually, or try a GrabFood link.";
      }
    } catch (err) {
      scraperError = err instanceof Error ? err.message : "Failed to fetch ShopeeFood menu";
      restaurantName = "ShopeeFood Restaurant";
      items = [];
    }
  }

  if (items.length > 0) {
    await prisma.$transaction([
      prisma.foodOrder.update({ where: { id }, data: { restaurantName } }),
      prisma.foodMenuItem.createMany({
        data: items.map((item) => ({
          orderId: id,
          name: item.name,
          imageUrl: item.imageUrl,
          originalPrice: item.originalPrice,
          discountedPrice: item.discountedPrice ?? null,
          options: item.options as object,
          isAvailable: true,
        })),
      }),
    ]);
    return NextResponse.json({ restaurantName, itemCount: items.length });
  }

  // No items — still update restaurant name, but return error info
  await prisma.foodOrder.update({ where: { id }, data: { restaurantName } });
  return NextResponse.json(
    { restaurantName, itemCount: 0, error: scraperError },
    { status: scraperError ? 422 : 200 }
  );
}
