"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const TRANSITION_DURATION_MS = 420;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function NavigationMotion() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousRoute = useRef<string | null>(null);

  useEffect(() => {
    const route = `${pathname}?${searchParams.toString()}`;
    if (previousRoute.current === null) {
      previousRoute.current = route;
      return;
    }
    if (previousRoute.current === route) return;
    previousRoute.current = route;

    const reducedMotion = prefersReducedMotion();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    if (reducedMotion) return;

    document.body.classList.remove("route-transitioning");
    window.requestAnimationFrame(() => {
      document.body.classList.add("route-transitioning");
    });

    const timeout = window.setTimeout(() => {
      document.body.classList.remove("route-transitioning");
    }, TRANSITION_DURATION_MS);

    return () => {
      window.clearTimeout(timeout);
      document.body.classList.remove("route-transitioning");
    };
  }, [pathname, searchParams]);

  return null;
}
