import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AccessLogsClient from "./AccessLogsClient";

export default async function AccessLogsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") notFound();

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return <AccessLogsClient users={users} />;
}
