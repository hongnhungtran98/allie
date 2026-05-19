import AppShell from "@/components/layout/AppShell";
import ReminderPoller from "@/components/layout/ReminderPoller";
import AccessLogger from "@/components/layout/AccessLogger";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
      <ReminderPoller />
      <AccessLogger />
    </ToastProvider>
  );
}
