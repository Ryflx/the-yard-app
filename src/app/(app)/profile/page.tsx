import { getUserProfile, getUserMaxes } from "@/app/actions";
import { ProfileSetup } from "@/components/profile-setup";
import { ProfileMaxes } from "@/components/profile-maxes";
import { LeaderboardToggle } from "@/components/leaderboard-toggle";
import { SignOutButton } from "@clerk/nextjs";
import type { Sex } from "@/lib/strength-standards";

export default async function ProfilePage() {
  const [profile, maxes] = await Promise.all([getUserProfile(), getUserMaxes()]);

  const profileComplete = profile?.bodyweightKg != null && profile?.sex != null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          ACCOUNT SETTINGS
        </p>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">
          YOUR PROFILE
        </h2>
      </section>

      <section>
        <ProfileSetup
          currentName={profile?.displayName ?? undefined}
          currentWeight={profile?.bodyweightKg ?? undefined}
          currentSex={(profile?.sex as Sex) ?? undefined}
          compact={profileComplete}
        />
      </section>

      <section>
        <ProfileMaxes maxes={maxes} />
      </section>

      <section className="flex flex-col gap-4">
        <LeaderboardToggle initialOptIn={profile?.leaderboardOptIn ?? false} />

        <div className="bg-surface-container p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-headline text-sm font-bold uppercase tracking-tight">
                SIGN OUT
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                LOG OUT OF YOUR ACCOUNT
              </p>
            </div>
            <SignOutButton>
              <button className="squishy bg-surface-variant px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-bright">
                <span className="material-symbols-outlined mr-1 align-middle text-sm">
                  logout
                </span>
                SIGN OUT
              </button>
            </SignOutButton>
          </div>
        </div>
      </section>
    </div>
  );
}
