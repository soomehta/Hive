import { redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/auth/get-user";
import { getUserOrganizations } from "@/lib/db/queries/organizations";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PAPanel } from "@/components/pa/pa-panel";
import { MainContent } from "@/components/layout/main-content";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

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
    <div className="flex h-screen">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <Sidebar orgs={orgs} user={userProfile} />
      <MobileSidebar orgs={orgs} user={userProfile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={userProfile} />
        <MainContent>{children}</MainContent>
      </div>
      <PAPanel />
    </div>
  );
}
