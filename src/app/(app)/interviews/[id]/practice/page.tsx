import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getInterview } from "@/lib/data/interviews";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Mock practice" };

export default async function PracticePage(
  props: PageProps<"/interviews/[id]/practice">,
) {
  const { id } = await props.params;
  const interview = await getInterview(id);
  if (!interview) notFound();

  return (
    <div>
      <PageHeader
        title="Mock practice"
        description="Typed mock interviews with structured feedback."
      />
      <EmptyState
        title="Practice is coming next"
        description="Typed mock-interview sessions and answer feedback arrive in the next phase. Your saved questions and stories will feed straight into them."
      />
    </div>
  );
}
