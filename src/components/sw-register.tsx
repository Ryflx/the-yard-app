"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function ServiceWorkerRegister() {
  const refreshing = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const promptUpdate = (worker: ServiceWorker) => {
      toast("Update available", {
        description: "A new version of the app is ready.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
        },
      });
    };

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // A SW that finished installing while a previous tab was open will be
      // sitting in "waiting". Surface the prompt for it on next page load.
      if (reg.waiting && navigator.serviceWorker.controller) {
        promptUpdate(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New SW is installed but old SW still controls. Don't reload —
            // tell the user a refresh is ready and let them choose when.
            promptUpdate(newWorker);
          }
        });
      });

      // Poll every 60s. update() is a no-op if nothing's changed; it triggers
      // updatefound only when the SW file's bytes differ from the active one.
      setInterval(() => {
        reg.update().catch(() => {});
      }, 60_000);
    });

    // Fires once SKIP_WAITING activates the new SW. At that point the new
    // bundle is in control, so a single reload swaps the app to the new build.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing.current) return;
      refreshing.current = true;
      window.location.reload();
    });
  }, []);

  return null;
}
