import Link from "next/link";

export default function CoachPage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          ADMIN PANEL
        </p>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          COACH
        </h2>
      </section>

      <div className="flex flex-col gap-4">
        <Link href="/admin/workouts">
          <div className="group flex items-center justify-between bg-surface-container-high p-6 transition-colors hover:bg-surface-bright">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center bg-primary-container">
                <span
                  className="material-symbols-outlined text-2xl text-on-primary-fixed"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  fitness_center
                </span>
              </div>
              <div>
                <p className="font-headline text-lg font-bold uppercase tracking-tight">
                  ADD WORKOUTS
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                  PASTE PROGRAMMING &amp; PUBLISH TO SCHEDULE
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant transition-transform group-hover:translate-x-1">
              chevron_right
            </span>
          </div>
        </Link>

        <Link href="/admin/users">
          <div className="group flex items-center justify-between bg-surface-container-high p-6 transition-colors hover:bg-surface-bright">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center bg-surface-variant">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                  group
                </span>
              </div>
              <div>
                <p className="font-headline text-lg font-bold uppercase tracking-tight">
                  MANAGE USERS
                </p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                  SET ADMIN ROLES &amp; VIEW MEMBERS
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant transition-transform group-hover:translate-x-1">
              chevron_right
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
