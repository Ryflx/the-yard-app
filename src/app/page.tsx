import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/schedule");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-6xl text-primary-container">
          fitness_center
        </span>
        <h1 className="font-headline text-5xl font-black uppercase tracking-tighter md:text-7xl">
          BARBELL
          <br />
          TRACKER
        </h1>
        <div className="h-[2px] w-16 bg-primary-container" />
        <p className="max-w-sm font-label text-sm tracking-wide text-on-surface-variant">
          Track your workouts. Log your weights. Get automatic percentage-based
          suggestions for every session.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/sign-up"
          className="digital-texture squishy block w-full py-4 text-center font-headline font-black uppercase tracking-widest text-on-primary-fixed"
        >
          GET STARTED
        </Link>
        <Link
          href="/sign-in"
          className="squishy block w-full bg-surface-variant py-4 text-center font-headline text-sm font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright"
        >
          SIGN IN
        </Link>
      </div>
    </div>
  );
}
