import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { RestTimerProvider } from "@/components/rest-timer";
import { PRCelebrationProvider } from "@/components/pr-celebration";
import { isCurrentUserAdmin } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#0e0e0e] px-6">
        <div className="flex items-center gap-4">
          <img src="/yard-logo-32.png" alt="The Yard Peckham" className="h-7 w-7" />
          <Link href="/schedule">
            <h1 className="font-headline text-xl font-black uppercase tracking-widest text-white">
              THE YARD PECKHAM
            </h1>
          </Link>
        </div>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-10 h-10 border border-outline-variant",
            },
          }}
        />
      </header>
      <PRCelebrationProvider>
        <RestTimerProvider>
          <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-28 pt-24 md:px-8">
            {children}
          </main>
        </RestTimerProvider>
      </PRCelebrationProvider>
      <BottomNav isAdmin={isAdmin} />
      <span className="sr-only" aria-hidden="true">
        Olympic weightlifting icon created by Freepik - Flaticon (https://www.flaticon.com)
      </span>
    </div>
  );
}
