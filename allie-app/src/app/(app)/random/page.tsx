import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import RandomClient from "./RandomClient";

export default async function RandomPage() {
  const session = await auth();
  const userId = session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";

  const items = await prisma.randomItem.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: { createdAt: "asc" },
  });

  const mapped = items.map((i) => ({
    id: i.id,
    name: i.name,
    isSystem: i.userId === null,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">🎲 What to eat today?</h1>
        <p className="text-sm text-ink-soft mt-1">Let Allie decide for you</p>
      </div>
      <RandomClient initialItems={mapped} isAdmin={isAdmin} />
    </div>
  );
}
