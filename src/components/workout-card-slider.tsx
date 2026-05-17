"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface WorkoutCardSliderProps {
  days: string[];
  selectedDay: string;
  children: ReactNode;
}

/**
 * Horizontal, snap-paginated workout cards. All days render at once so a
 * swipe is a smooth pan rather than a page navigation. The URL `day` param
 * stays in sync via router.replace (silent — no scroll-to-top, no history
 * pollution), so deep-links and refreshes still land on the right card.
 *
 * Uses native CSS scroll-snap (best mobile feel — momentum scrolling matches
 * the OS) plus an IntersectionObserver to detect the active pane.
 */
export function WorkoutCardSlider({
  days,
  selectedDay,
  children,
}: WorkoutCardSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const childArray = Children.toArray(children);

  // Track whether a programmatic scroll is in progress so the observer
  // doesn't fight it (e.g. when a day-tab click triggers scrollIntoView,
  // we don't want the resulting intersection event to push another URL update).
  const programmaticScrollUntil = useRef<number>(0);

  // Sync container scroll position to selectedDay. Runs on mount (auto-jump,
  // no animation) and on prop changes from outside (smooth animation).
  const isInitialMount = useRef(true);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const idx = days.indexOf(selectedDay);
    if (idx === -1) return;
    const pane = container.children[idx] as HTMLElement | undefined;
    if (!pane) return;

    // offsetLeft is relative to the nearest *positioned* ancestor, which isn't
    // necessarily the scroll container. Use bounding rects instead — they give
    // us a viewport-relative position that's safe to convert into a scroll target.
    const target =
      container.scrollLeft + pane.getBoundingClientRect().left - container.getBoundingClientRect().left;
    if (Math.abs(container.scrollLeft - target) < 4) return; // already there

    programmaticScrollUntil.current = Date.now() + 600;
    container.scrollTo({
      left: target,
      behavior: isInitialMount.current ? "auto" : "smooth",
    });
    isInitialMount.current = false;
  }, [selectedDay, days]);

  const updateUrl = useCallback(
    (date: string) => {
      if (date === selectedDay) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("day", date);
      router.replace(`/schedule?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, selectedDay],
  );

  // Observe which pane is active and update URL (silently) when it changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < programmaticScrollUntil.current) return;
        const winner = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.6)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!winner) return;
        const idx = Array.from(container.children).indexOf(winner.target);
        const date = days[idx];
        if (date) updateUrl(date);
      },
      {
        root: container,
        threshold: [0.6, 0.9, 1],
      },
    );

    Array.from(container.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [days, updateUrl]);

  return (
    <div
      ref={containerRef}
      className="-mx-5 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {childArray.map((child, i) => (
        <div
          key={days[i] ?? i}
          className="w-screen flex-shrink-0 snap-start snap-always px-5 sm:w-full"
        >
          {child}
        </div>
      ))}
    </div>
  );
}
