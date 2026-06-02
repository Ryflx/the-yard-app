import { getActivePlan, listMyTracks } from "@/app/actions";
import { ActivePlanOverview } from "@/components/programming/active-plan-overview";
import { TrackLibrary } from "@/components/programming/track-library";
import Link from "next/link";

export default async function ProgrammingPage() {
  const [data, tracks] = await Promise.all([getActivePlan(), listMyTracks()]);

  // No tracks at all — pure empty state
  if (tracks.length === 0) {
    return (
      <div className="px-4 py-10">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-container">
            CUSTOM PROGRAMMING
          </p>
          <h1 className="mt-3 font-headline text-3xl font-black uppercase tracking-tight">
            BUILD YOUR SKILL PLAN
          </h1>
          <p className="mt-4 text-sm text-on-surface-variant">
            Pick the skills you want to work on — we&apos;ll weave them into your week around your existing classes.
          </p>
          <Link
            href="/programming/new"
            data-tour="programming-cta"
            className="mt-6 inline-block bg-primary-container px-6 py-3.5 font-headline text-sm font-black uppercase tracking-widest text-on-primary-fixed"
          >
            START YOUR FIRST PLAN
          </Link>
        </div>
      </div>
    );
  }

  // Has tracks but none active — show no-active banner + library
  if (!data) {
    return (
      <div>
        <div className="px-4 py-10">
          <div className="mx-auto max-w-md text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-container">
              CUSTOM PROGRAMMING
            </p>
            <h1 className="mt-3 font-headline text-3xl font-black uppercase tracking-tight">
              NO ACTIVE TRACK
            </h1>
            <p className="mt-4 text-sm text-on-surface-variant">
              Resume a paused track below or start a new one.
            </p>
          </div>
        </div>
        <TrackLibrary tracks={tracks} />
      </div>
    );
  }

  // Active plan exists — show overview then library
  return (
    <div>
      <ActivePlanOverview plan={data.plan} sessions={data.sessions} />
      <TrackLibrary tracks={tracks} />
    </div>
  );
}
