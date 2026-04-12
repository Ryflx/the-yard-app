"use client";

import { useState } from "react";
import { setUserRole } from "@/app/actions";
import { toast } from "sonner";

interface User {
  clerkId: string;
  email: string;
  name: string;
  imageUrl: string;
  role: "admin" | "member";
  hasProfile: boolean;
}

export function UserRoleManager({ user }: { user: User }) {
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);

  async function toggleRole() {
    const newRole = role === "admin" ? "member" : "admin";
    setLoading(true);
    try {
      await setUserRole(user.clerkId, newRole);
      setRole(newRole);
      toast.success(
        `${user.name || user.email} is now ${newRole === "admin" ? "an admin" : "a member"}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update role";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between bg-surface-container p-4 transition-colors hover:bg-surface-container-high">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 overflow-hidden bg-surface-variant">
          {user.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant">
                person
              </span>
            </div>
          )}
        </div>
        <div>
          <p className="font-headline text-sm font-bold uppercase tracking-tight">
            {user.name}
          </p>
          <p className="text-[10px] font-medium tracking-widest text-on-surface-variant">
            {user.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {role === "admin" && (
          <span className="bg-primary-container px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-on-primary-fixed">
            ADMIN
          </span>
        )}
        <button
          onClick={toggleRole}
          disabled={loading}
          className={`squishy px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${
            role === "admin"
              ? "bg-surface-variant text-on-surface hover:bg-surface-bright"
              : "bg-primary-container text-on-primary-fixed"
          }`}
        >
          {loading
            ? "..."
            : role === "admin"
              ? "REMOVE ADMIN"
              : "MAKE ADMIN"}
        </button>
      </div>
    </div>
  );
}
