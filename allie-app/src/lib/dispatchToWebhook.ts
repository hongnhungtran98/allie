export async function dispatchToWebhook(url: string, text: string): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[webhook] dispatch failed:", err);
  }
}

const DEFAULT_TEMPLATE =
  "Đã có món ở {tên_quán}, mời mọi người nhận món. Danh sách đặt hàng như sau:\n{danh_sách}";
const DEFAULT_ROW_TEMPLATE = "- {tên_người}: {tên_món}";

export function renderWebhookMessage(
  template: string | null | undefined,
  rowTemplate: string | null | undefined,
  restaurantName: string,
  lines: { userName: string; itemName: string }[],
): string {
  const tpl = template || DEFAULT_TEMPLATE;
  const rowTpl = rowTemplate || DEFAULT_ROW_TEMPLATE;
  const list = lines
    .map((l) =>
      rowTpl
        .replace(/\{tên_người\}/g, l.userName)
        .replace(/\{tên_món\}/g, l.itemName),
    )
    .join("\n");
  return tpl
    .replace(/\{tên_quán\}/g, restaurantName)
    .replace(/\{danh_sách\}/g, list);
}
