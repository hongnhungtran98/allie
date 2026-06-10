import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await prisma.systemWebhook.findUnique({ where: { id: "system" } });

  return NextResponse.json({
    webhookUrl: record?.webhookUrl ?? "",
    messageTemplate: record?.messageTemplate ?? "",
    listRowTemplate: record?.listRowTemplate ?? "",
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : null;
  const messageTemplate = typeof body.messageTemplate === "string" ? body.messageTemplate : null;
  const listRowTemplate = typeof body.listRowTemplate === "string" ? body.listRowTemplate : null;

  if (webhookUrl === null || messageTemplate === null || listRowTemplate === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = await prisma.systemWebhook.upsert({
    where: { id: "system" },
    update: { webhookUrl, messageTemplate, listRowTemplate },
    create: { id: "system", webhookUrl, messageTemplate, listRowTemplate },
  });

  return NextResponse.json({
    webhookUrl: record.webhookUrl,
    messageTemplate: record.messageTemplate,
    listRowTemplate: record.listRowTemplate,
  });
}
