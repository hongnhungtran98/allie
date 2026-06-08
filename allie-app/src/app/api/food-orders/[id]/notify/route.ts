import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { dispatchToWebhook, renderWebhookMessage } from "@/lib/dispatchToWebhook";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.foodOrder.findUnique({
    where: { id },
    include: {
      selections: {
        include: {
          user: { select: { name: true } },
          menuItem: { select: { name: true } },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "closed") {
    return NextResponse.json({ error: "Order is not closed" }, { status: 400 });
  }

  const webhook = await prisma.systemWebhook.findUnique({ where: { id: "system" } });

  if (!webhook?.webhookUrl) {
    return NextResponse.json(
      { error: "no_webhook", message: "Chưa cấu hình Webhook URL. Vào Integrations → Webhook để cài đặt." },
      { status: 422 },
    );
  }

  const lines = order.selections.map((sel) => ({
    userName: sel.user.name,
    itemName: sel.menuItem?.name ?? sel.customName ?? "(chưa đặt tên)",
  }));

  const text = renderWebhookMessage(webhook.messageTemplate, order.restaurantName, lines);

  // fire-and-forget — response is returned immediately
  dispatchToWebhook(webhook.webhookUrl, text);

  return NextResponse.json({ ok: true });
}
