import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { getEffectivePlan } from "@/lib/data/subscription";
import { PageHeader } from "@/components/app/page-header";
import { AddInterviewButton } from "@/components/interviews/add-interview-button";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "New interview" };

export default async function NewInterviewPage(
  props: PageProps<"/interviews/new">,
) {
  const searchParams = await props.searchParams;
  const limitHit = searchParams.limit === "1";
  const { entitlements, planKey } = await getEffectivePlan();

  return (
    <div>
      <PageHeader
        title="New interview"
        description="Add the interview you're preparing for. You can save a draft and finish later."
      />

      {limitHit ? (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            <p>
              Your {entitlements.name} plan includes{" "}
              {entitlements.activeInterviews} active interview
              {entitlements.activeInterviews === 1 ? "" : "s"}. Archive or
              delete an existing one, or upgrade for unlimited interviews.
            </p>
            <p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href="/billing">View plans</Link>
              </Button>
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Start preparing</CardTitle>
          <CardDescription>
            We&apos;ll walk you through five short steps: the opportunity, the
            interview, interviewers, your materials, and a review before we
            build your Peel Brief.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {limitHit ? (
            <Button asChild variant="outline">
              <Link href="/history">Back to interviews</Link>
            </Button>
          ) : (
            <AddInterviewButton label="Create interview" />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {planKey === "free"
              ? "Free plan: one active interview at a time."
              : "Your plan includes unlimited active interviews."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
