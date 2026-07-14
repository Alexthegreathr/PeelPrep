/**
 * Demo-mode indicator (PRODUCT_SPEC §Development and Demo Mode). Renders only
 * when NEXT_PUBLIC_DEMO_MODE=1 so it's obvious the data is fictional and the
 * mock AI provider is active.
 */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return null;
  return (
    <div className="bg-[#13213c] px-4 py-1.5 text-center text-xs text-[#fff8df] print:hidden">
      🍌 Demo mode — all data is fictional and the mock AI provider is active.
      Nothing here reflects a real account.
    </div>
  );
}
