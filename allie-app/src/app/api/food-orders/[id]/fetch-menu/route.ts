import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { connect as connectRealBrowser } from "puppeteer-real-browser";

// ShopeeFood note: Shopee Gateway (SGW) silently refuses to load the SPA's menu
// data when it detects Puppeteer — even with puppeteer-extra + stealth plugin
// (the plugin stopped working when SGW tightened detection in May 2026).
// puppeteer-real-browser uses a patched runtime that still passes those checks.

type Params = { params: Promise<{ id: string }> };

interface RawItem {
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  discountedPrice: number | null;
  options: { group: string; choices: { label: string; price: number }[] }[];
  category: string | null;
  categorySortOrder: number;
  itemSortOrder: number;
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
    // GrabFood marks disabled groups/choices by omitting `available` (or setting it false).
    // Present-and-true is the only "enabled" signal.
    if (group.available !== true) continue;
    const groupName = String(group.name ?? group.label ?? "").trim();
    const rawChoices = (
      group.modifiers ?? group.options ?? group.selections ?? group.items
    ) as unknown[] | undefined;
    if (!Array.isArray(rawChoices)) continue;
    const choices = rawChoices
      .map((c) => {
        const ch = c as Record<string, unknown>;
        if (ch.available !== true) return null;
        const label = String(ch.name ?? ch.label ?? "").trim();
        const price = Number(
          ch.priceInMinorUnit ?? ch.price ?? ch.priceModifier ?? ch.additionalPrice ?? 0
        );
        return { label, price };
      })
      .filter((c): c is { label: string; price: number } => c !== null && c.label !== "");
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
  // Keep GrabFood's category structure (same as on the Grab page). A dish may
  // appear in multiple categories; we preserve each occurrence so the UI can
  // group items the same way Grab does.
  const catNameLog: string[] = [];
  categories.forEach((cat, catIdx) => {
    const c = cat as Record<string, unknown>;
    const catItems = c.items as unknown[] | undefined;
    if (!Array.isArray(catItems)) return;
    // GrabFood's primary field is `name`; allow common alternates defensively in
    // case a section (e.g. "Recommended") uses a translation map or different key.
    const customisedName = (() => {
      const cd = c.CustomisedData as Record<string, unknown> | undefined;
      const nameField = cd?.Name as Record<string, unknown> | undefined;
      const value = nameField?.Value as Record<string, string> | undefined;
      return value?.vi ?? value?.en;
    })();
    const categoryName =
      String(
        c.name ?? c.categoryName ?? c.label ?? c.title ?? customisedName ?? ""
      ).trim() || null;
    const categorySortOrder = Number(c.sortOrder ?? c.sequence ?? catIdx);
    catNameLog.push(`${categoryName ?? "(none)"}[${catItems.length}]`);

    catItems.forEach((raw, itemIdx) => {
      const item = raw as Record<string, unknown>;
      // Skip items GrabFood has disabled (out-of-stock / hidden). Disabled items
      // omit `available` entirely on the foodweb API, so present-and-true is the
      // only "enabled" signal.
      if (item.available !== true) return;
      const name = String(item.name ?? "").trim();
      if (!name) return;

      // GrabFood uses priceInMinorUnit (VND, already in full units for VN)
      const originalPrice = Number(item.priceInMinorUnit ?? item.price ?? 0);
      if (!originalPrice) return;

      const imageUrl = (item.imgHref as string | undefined) ?? null;

      const discountedRaw = Number(item.discountedPriceInMinorUnit ?? item.discountedPrice ?? 0);
      const discountedPrice =
        discountedRaw > 0 && discountedRaw !== originalPrice ? discountedRaw : null;

      const options = parseGrabModifierGroups(item.modifierGroups ?? []);
      const itemSortOrder = Number(item.sortOrder ?? itemIdx);

      items.push({
        name,
        imageUrl,
        originalPrice,
        discountedPrice,
        options,
        category: categoryName,
        categorySortOrder,
        itemSortOrder,
      });
    });
  });

  // Diagnostic: show what category labels we got (helps catch silent name-field changes)
  console.log("[GrabFood] categories:", catNameLog.join(" | "));

  return items.length > 0 ? { restaurantName, items } : null;
}

async function fetchGrabMenu(
  url: string
): Promise<{ restaurantName: string; items: RawItem[] }> {
  const browser = await puppeteer.launch({
    headless: true,
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
      .map((i, idx): RawItem | null => {
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
          options: [],
          category: null,
          categorySortOrder: 0,
          itemSortOrder: idx,
        };
      })
      .filter((i): i is RawItem => i !== null);

    return { restaurantName: result.restaurantName, items };
  } finally {
    await browser.close();
  }
}

// Parse ShopeeFood modifier groups → unified RawItem.options shape.
// ShopeeFood shape: dish.options[] = [{ name, ntop, mandatory, option_items: { items: [{ name, price: { value } }] } }]
function parseShopeeFoodOptions(
  raw: unknown
): { group: string; choices: { label: string; price: number }[] }[] {
  if (!Array.isArray(raw)) return [];
  const result: { group: string; choices: { label: string; price: number }[] }[] = [];
  for (const g of raw) {
    const group = g as Record<string, unknown>;
    if (group.is_deleted === true || group.is_active === false) continue;
    const groupName = String(group.name ?? group.ntop ?? "").trim();
    const optionItems = group.option_items as Record<string, unknown> | undefined;
    const items = optionItems?.items as unknown[] | undefined;
    if (!Array.isArray(items)) continue;
    const choices = items
      .map((it) => {
        const item = it as Record<string, unknown>;
        if (item.is_deleted === true || item.is_active === false) return null;
        const label = String(item.name ?? "").trim();
        const priceObj = item.price as Record<string, unknown> | undefined;
        const price = Number(priceObj?.value ?? 0);
        return { label, price };
      })
      .filter((c): c is { label: string; price: number } => c !== null && c.label !== "");
    if (choices.length > 0) result.push({ group: groupName, choices });
  }
  return result;
}

// Parse the `dish/get_delivery_dishes` payload (the menu data).
// Shape: { reply: { menu_infos: [{ dish_type_name, dishes: [{ name, price: { value }, photos: [...], options: [...] }] }] } }
function parseShopeeFoodDishesPayload(data: unknown): RawItem[] | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const reply = d.reply as Record<string, unknown> | undefined;
  const menuInfos = reply?.menu_infos as unknown[] | undefined;
  if (!Array.isArray(menuInfos)) return null;

  const items: RawItem[] = [];
  menuInfos.forEach((cat, catIdx) => {
    const catObj = cat as Record<string, unknown>;
    const dishes = catObj.dishes as unknown[] | undefined;
    if (!Array.isArray(dishes)) return;
    const categoryName =
      String(catObj.dish_type_name ?? catObj.name ?? "").trim() || null;
    const categorySortOrder = Number(catObj.dish_type_id ?? catIdx);
    dishes.forEach((dish, itemIdx) => {
      const f = dish as Record<string, unknown>;
      if (f.is_deleted === true || f.is_active === false) return;
      const name = String(f.name ?? "").trim();
      if (!name) return;

      const priceObj = f.price as Record<string, unknown> | undefined;
      const originalPrice = Number(priceObj?.value ?? 0);
      if (!originalPrice) return;

      // Prefer a mid-size photo (~400px) for nicer UI thumbnails; fall back to first available
      const photos = f.photos as { width?: number; value?: string }[] | undefined;
      const preferred = photos?.find((p) => p.width === 400) ?? photos?.[Math.min(2, (photos?.length ?? 1) - 1)] ?? photos?.[0];
      const imageUrl = preferred?.value ?? null;

      const discountedRaw = Number(f.discount_price ?? 0);
      const discountedPrice =
        discountedRaw > 0 && discountedRaw !== originalPrice ? discountedRaw : null;

      const options = parseShopeeFoodOptions(f.options ?? []);

      items.push({
        name,
        imageUrl,
        originalPrice,
        discountedPrice,
        options,
        category: categoryName,
        categorySortOrder,
        itemSortOrder: Number(f.display_order ?? itemIdx),
      });
    });
  });
  return items.length > 0 ? items : null;
}

// Extract restaurant name from the `delivery/get_detail` payload.
function parseShopeeFoodDetailName(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const reply = d.reply as Record<string, unknown> | undefined;
  const detail = reply?.delivery_detail as Record<string, unknown> | undefined;
  const name = detail?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

async function fetchShopeeFoodMenu(
  url: string
): Promise<{ restaurantName: string; items: RawItem[] }> {
  // On Linux servers we run non-headless so the library auto-spawns Xvfb (a real-browser
  // detection bypass technique); on Windows local dev we stay headless to avoid UI popups.
  // Reuse puppeteer's bundled Chromium so we don't need to install google-chrome-stable.
  const isLinux = process.platform === "linux";
  if (isLinux) {
    // One-shot diagnostic so we can tell apt vs PATH issues apart in Railway logs.
    try {
      const { execSync } = await import("node:child_process");
      const xvfbRun = execSync("which xvfb-run 2>/dev/null || echo MISSING", { encoding: "utf8" }).trim();
      const xvfbBin = execSync("which Xvfb 2>/dev/null || echo MISSING", { encoding: "utf8" }).trim();
      console.log("[ShopeeFood] xvfb diag — xvfb-run:", xvfbRun, " Xvfb:", xvfbBin);
    } catch (e) {
      console.log("[ShopeeFood] xvfb diag failed:", String(e).slice(0, 120));
    }
  }
  const { browser, page } = await connectRealBrowser({
    headless: !isLinux,
    turnstile: true,
    args: [],
    customConfig: { chromePath: puppeteer.executablePath() },
    connectOption: {},
  });

  try {
    let detailJson: unknown = null;
    let dishesJson: unknown = null;
    const pending: Promise<void>[] = [];

    page.on("response", (response: { url: () => string; headers: () => Record<string, string>; json: () => Promise<unknown> }) => {
      const ru = response.url();
      if (!ru.includes("deliverynow.vn")) return;
      const ct = response.headers()["content-type"] ?? "";
      if (!ct.includes("json")) return;

      const isDetail = ru.includes("/delivery/get_detail");
      const isDishes = ru.includes("/dish/get_delivery_dishes");
      if (!isDetail && !isDishes) return;
      if ((isDetail && detailJson) || (isDishes && dishesJson)) return;

      pending.push(
        response
          .json()
          .then((json) => {
            if (isDetail && !detailJson) detailJson = json;
            if (isDishes && !dishesJson) dishesJson = json;
          })
          .catch(() => {})
      );
    });

    // Visit homepage first so Shopee can set its session cookies before the SPA
    // on the shop page calls the dish API.
    try {
      await page.goto("https://shopeefood.vn/", { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch {
      // best-effort warmup
    }

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {
      // navigation timeout is acceptable; we wait below for the API responses
    }

    // Poll up to 25 s for both API responses to arrive
    await new Promise<void>((resolve) => {
      const start = Date.now();
      const tick = setInterval(async () => {
        await Promise.all(pending.splice(0));
        if ((detailJson && dishesJson) || Date.now() - start > 25_000) {
          clearInterval(tick);
          resolve();
        }
      }, 400);
    });

    // Fallback: if get_detail landed but the dishes call didn't fire, call it directly
    // using the delivery_id we already have. Top-level navigation bypasses CORS.
    if (detailJson && !dishesJson) {
      const detail = (detailJson as Record<string, unknown>)?.reply as
        | Record<string, unknown>
        | undefined;
      const dd = detail?.delivery_detail as Record<string, unknown> | undefined;
      const deliveryId = dd?.id;
      if (typeof deliveryId === "number" || typeof deliveryId === "string") {
        const apiUrl = `https://gappapi.deliverynow.vn/api/dish/get_delivery_dishes?id_type=2&request_id=${deliveryId}`;
        try {
          await page.goto(apiUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
          const bodyText = await page.evaluate(() => document.body.innerText);
          if (bodyText.trim().startsWith("{")) dishesJson = JSON.parse(bodyText);
        } catch {
          // fall through to empty result
        }
      }
    }

    const restaurantName =
      parseShopeeFoodDetailName(detailJson) ?? "ShopeeFood Restaurant";
    const items = parseShopeeFoodDishesPayload(dishesJson) ?? [];
    return { restaurantName, items };
  } finally {
    await browser.close();
  }
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const force = new URL(req.url).searchParams.get("force") === "true";
  const order = await prisma.foodOrder.findUnique({
    where: { id },
    include: { _count: { select: { menuItems: true } } },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.creatorId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (order._count.menuItems > 0) {
    if (!force) {
      return NextResponse.json({ restaurantName: order.restaurantName, alreadyFetched: true });
    }
    // Re-fetch: wipe existing menu items. Selections cascade-delete via FK.
    await prisma.foodMenuItem.deleteMany({ where: { orderId: id } });
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
          category: item.category,
          categorySortOrder: item.categorySortOrder,
          itemSortOrder: item.itemSortOrder,
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
