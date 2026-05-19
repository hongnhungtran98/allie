import { auth } from "@/auth";
import { notFound } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") notFound();

  return <UsersClient currentUserId={session.user.id} />;
}
