import Link from "next/link";
import { getUpcomingWorkouts, getRecentWorkouts } from "@/app/actions";
import { AdminWorkoutsClient } from "@/components/admin-workouts-client";

export default async function AdminWorkoutsPage() {
  const [upcoming, recent] = await Promise.all([
    getUpcomingWorkouts(),
    getRecentWorkouts(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin" className="text-sm text-primary">← Admin</Link>
        <h1 className="font-headline text-xl font-black uppercase tracking-tight text-on-surface">
          WORKOUTS
        </h1>
        <div className="w-12" />
      </div>
      <AdminWorkoutsClient upcoming={upcoming} recent={recent} />
    </div>
  );
}
