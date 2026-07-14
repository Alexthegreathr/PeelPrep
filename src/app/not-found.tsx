import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-accent-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          We couldn&rsquo;t find that page
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have
          moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
