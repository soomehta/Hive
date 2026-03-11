import { redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/auth/get-user";
import { getUserOrganizations } from "@/lib/db/queries/organizations";
import { KeyboardShortcutsProvider } from "@/components/shared/keyboard-shortcuts-provider";
import { RealtimeProvider } from "@/components/shared/realtime-provider";
import { NavProgress } from "@/components/layout/nav-progress";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthUser();
  const orgs = await getUserOrganizations(user.id);

  if (orgs.length === 0) {
    redirect("/onboarding");
  }

  const userProfile = {
    id: user.id,
    email: user.email ?? "",
    fullName: user.user_metadata?.full_name ?? user.email ?? "User",
  };

  return (
    <>
      <NavProgress />
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <DashboardShell orgs={orgs} user={userProfile}>
        {children}
      </DashboardShell>
      <RealtimeProvider />
      <KeyboardShortcutsProvider />
    </>
  );
}
