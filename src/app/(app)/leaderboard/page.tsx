import { getLeaderboardData } from "@/app/actions";
import { LeaderboardTabs } from "@/components/leaderboard-tabs";
import Link from "next/link";

export default async function LeaderboardPage() {
  const barbellData = await getLeaderboardData();

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/schedule"
        className="flex items-center gap-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        SCHEDULE
      </Link>

      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          FRIENDLY COMPETITION
        </p>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          LEADERBOARD
        </h2>
      </section>

      <LeaderboardTabs barbellData={barbellData} />
    </div>
  );
}
