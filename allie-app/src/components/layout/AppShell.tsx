import { auth } from "@/auth";
import Sidebar from "./Sidebar";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={user.name} userRole={user.role} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
