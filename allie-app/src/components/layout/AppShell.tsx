import { auth } from "@/auth";
import ClientShell from "./ClientShell";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  return (
    <ClientShell userName={user.name} userRole={user.role}>
      {children}
    </ClientShell>
  );
}
