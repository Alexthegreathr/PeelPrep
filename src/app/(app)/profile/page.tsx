import type { Metadata } from "next";

import { requireUser, getProfile } from "@/lib/auth/dal";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/app/(app)/profile/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile();

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your name, headline, and time zone personalize your preparation."
      />

      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Signed in as <span className="text-foreground">{user.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ProfileForm
              defaultValues={{
                fullName: profile?.full_name ?? "",
                headline: profile?.headline ?? "",
                timezone: profile?.timezone ?? "UTC",
              }}
            />
          </CardContent>
        </Card>

        <Card className="bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Document library
              <Badge variant="outline">Later phase</Badge>
            </CardTitle>
            <CardDescription>
              Résumés and other materials you upload will appear here, reusable
              across every interview. Uploads arrive with the interviews &amp;
              documents phase.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
