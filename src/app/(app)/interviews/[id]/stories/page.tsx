import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getInterview } from "@/lib/data/interviews";
import { listStories } from "@/lib/data/stories";
import { getEffectivePlan } from "@/lib/data/subscription";
import { PageHeader } from "@/components/app/page-header";
import { InterviewSubnav } from "@/components/interviews/interview-subnav";
import { StoriesView } from "@/components/stories/stories-view";

export const metadata: Metadata = { title: "Story bank" };

export default async function StoriesPage(
  props: PageProps<"/interviews/[id]/stories">,
) {
  const { id } = await props.params;
  const interview = await getInterview(id);
  if (!interview) notFound();

  const [stories, { entitlements }] = await Promise.all([
    listStories(),
    getEffectivePlan(),
  ]);
  const canSuggest = entitlements.limits.story_suggest > 0;

  return (
    <div>
      <PageHeader
        title="Story bank"
        description="Reusable STAR stories you can tell across interviews."
      />
      <InterviewSubnav interviewId={id} active="stories" />
      <StoriesView interviewId={id} stories={stories} canSuggest={canSuggest} />
    </div>
  );
}
