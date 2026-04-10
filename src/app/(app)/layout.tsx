import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#0e0e0e] px-6">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary-container">
            fitness_center
          </span>
          <Link href="/schedule">
            <h1 className="font-headline text-xl font-black uppercase tracking-widest text-white">
              BARBELL TRACKER
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-20 md:px-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
