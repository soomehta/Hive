import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { LandingPage } from "@/components/landing/landing-page";

export default async function HomePage() {
  const user = await getAuthUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
