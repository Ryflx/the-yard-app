import { isCurrentUserAdmin, hasAnyAdmin } from "@/app/actions";
import { redirect } from "next/navigation";
import { ClaimAdmin } from "@/components/claim-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, anyAdminExists] = await Promise.all([
    isCurrentUserAdmin(),
    hasAnyAdmin(),
  ]);

  if (!anyAdminExists) {
    return (
      <div className="flex flex-col gap-8">
        <ClaimAdmin />
      </div>
    );
  }

  if (!isAdmin) {
    redirect("/schedule");
  }

  return <>{children}</>;
}
