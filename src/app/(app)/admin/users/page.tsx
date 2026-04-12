import { getAllUserProfiles } from "@/app/actions";
import { clerkClient } from "@clerk/nextjs/server";
import { UserRoleManager } from "@/components/user-role-manager";

export default async function AdminUsersPage() {
  const profiles = await getAllUserProfiles();

  const clerk = await clerkClient();
  const clerkUsers = await clerk.users.getUserList({
    limit: 100,
  });

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  const users = clerkUsers.data.map((u) => {
    const profile = profileMap.get(u.id);
    const email =
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
        ?.emailAddress ?? "—";

    const clerkName = [u.firstName, u.lastName].filter(Boolean).join(" ");
    const oauthName =
      u.externalAccounts?.[0]?.firstName && u.externalAccounts?.[0]?.lastName
        ? `${u.externalAccounts[0].firstName} ${u.externalAccounts[0].lastName}`
        : u.externalAccounts?.[0]?.firstName || "";
    const emailPrefix = email.split("@")[0].replace(/[._-]/g, " ");
    const name = profile?.displayName || clerkName || oauthName || emailPrefix;

    return {
      clerkId: u.id,
      email,
      name,
      imageUrl: u.imageUrl,
      role: (profile?.role ?? "member") as "admin" | "member",
      hasProfile: !!profile,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <a
        href="/admin"
        className="flex items-center gap-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        COACH
      </a>
      <section>
        <p className="mb-2 font-label text-xs uppercase tracking-[0.2em] text-primary">
          ADMIN PANEL
        </p>
        <h2 className="font-headline text-4xl font-bold uppercase tracking-tighter">
          MANAGE USERS
        </h2>
        <p className="mt-2 font-label text-xs tracking-widest text-on-surface-variant">
          {users.length} REGISTERED USER{users.length !== 1 ? "S" : ""}
        </p>
      </section>

      <div className="flex flex-col gap-px">
        {users.map((user) => (
          <UserRoleManager key={user.clerkId} user={user} />
        ))}
      </div>
    </div>
  );
}
