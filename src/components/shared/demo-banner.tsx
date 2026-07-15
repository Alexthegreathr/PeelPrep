import { BetaNotice } from "@/components/shared/beta-notice";

/**
 * Beta/demo strip (PRODUCT_SPEC §Development and Demo Mode). Renders only when
 * NEXT_PUBLIC_DEMO_MODE=1 so it's obvious the data is fictional, the mock AI
 * provider is active, and this is a preview build. The interactive limitations
 * notice lives in the client BetaNotice.
 */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-sidebar px-4 py-1.5 text-center text-xs text-sidebar-foreground print:hidden">
      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
        Beta
      </span>
      <span>
        Preview build · simulated AI and fictional data — please don&apos;t
        enter real personal information.
      </span>
      <BetaNotice />
    </div>
  );
}
