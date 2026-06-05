import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.foodOrder.findMany({
    where: { creatorId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { menuItems: true, selections: true } },
    },
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceUrl, orderType, restaurantName, menuImageUrl, countdownMinutes, paymentMode, shippingFee, discount } = await req.json();

  const type = orderType === "manual" ? "manual" : "link";

  if (type === "link") {
    if (!sourceUrl?.trim())
      return NextResponse.json({ error: "Source URL is required" }, { status: 400 });
  } else {
    if (!menuImageUrl || typeof menuImageUrl !== "string" || !menuImageUrl.startsWith("/api/food-orders/menu-image/"))
      return NextResponse.json({ error: "Menu image is required" }, { status: 400 });
  }

  if (!["orderer_pays", "split"].includes(paymentMode))
    return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 });

  const shareToken = randomBytes(16).toString("hex");
  const countdownEnd = countdownMinutes && countdownMinutes > 0
    ? new Date(Date.now() + countdownMinutes * 60 * 1000)
    : null;

  const order = await prisma.foodOrder.create({
    data: {
      creatorId: session.user.id,
      sourceUrl: type === "link" ? sourceUrl.trim() : "",
      orderType: type,
      menuImageUrl: type === "manual" ? menuImageUrl : null,
      restaurantName: typeof restaurantName === "string" ? restaurantName.trim() : "",
      status: "open",
      countdownEnd,
      paymentMode,
      shippingFee: Math.max(0, parseInt(shippingFee) || 0),
      discount: Math.max(0, parseInt(discount) || 0),
      shareToken,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
