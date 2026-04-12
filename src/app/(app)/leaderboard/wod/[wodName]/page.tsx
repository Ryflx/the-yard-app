import { getWodDrilldown } from "@/app/actions";
import { WodDrilldownClient } from "@/components/wod-drilldown";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function WodDrilldownPage({
  params,
}: {
  params: Promise<{ wodName: string }>;
}) {
  const { wodName } = await params;
  const decodedName = decodeURIComponent(wodName);

  const initialData = await getWodDrilldown(decodedName, "RX");
  if (!initialData) notFound();

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/leaderboard"
        className="flex items-center gap-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        LEADERBOARD
      </Link>

      <section>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          {decodedName}
        </h2>
        <p className="mt-2 font-label text-xs tracking-widest text-on-surface-variant">
          {initialData.wod.description.toUpperCase()}
        </p>
      </section>

      <WodDrilldownClient wodName={decodedName} initialData={initialData} />
    </div>
  );
}
