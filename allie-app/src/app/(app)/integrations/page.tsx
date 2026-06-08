import { auth } from "@/auth";
import { redirect } from "next/navigation";
import WebhookSettingsForm from "./WebhookSettingsForm";

export default async function IntegrationsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");
  return <WebhookSettingsForm isAdmin />;
}
