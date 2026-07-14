"use client";

import { usePathname } from "next/navigation";

/**
 * Gentle settle-in cross-fade on navigation. Keyed by pathname so the content
 * re-fades when the route changes. Opacity-only, so there's no layout shift;
 * disabled for reduced-motion via the motion-safe variant.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="motion-safe:animate-[fade-in_.35s_ease-out]">
      {children}
    </div>
  );
}
