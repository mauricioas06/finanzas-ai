import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { DesktopSidebar, MobileNav } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge, Disclaimer } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const displayName = profile.fullName ?? profile.email;

  return (
    <div className="min-h-screen">
      <DesktopSidebar />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6">
          <MobileNav />
          <div className="flex-1" />
          <Badge tone={profile.plan === "premium" ? "brand" : "neutral"}>
            Plan {profile.plan === "premium" ? "Premium" : "Gratuito"}
          </Badge>
          <span className="hidden max-w-48 truncate text-sm text-muted sm:inline" title={profile.email}>{displayName}</span>
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-negative" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
          <Disclaimer />
        </footer>
      </div>
    </div>
  );
}
