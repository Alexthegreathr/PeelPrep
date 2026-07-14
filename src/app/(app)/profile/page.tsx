import type { Metadata } from "next";

import { requireUser, getProfile } from "@/lib/auth/dal";
import { listDocuments } from "@/lib/data/documents";
import { PageHeader } from "@/components/app/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ProfileForm } from "@/app/(app)/profile/profile-form";
import { DocumentManager } from "@/components/documents/document-manager";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile();
  const documents = await listDocuments();

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

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Document library</CardTitle>
            <CardDescription>
              Résumés and other materials, reusable across every interview.
              Files are private and stored securely; only you can access them.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <DocumentManager
              initialDocuments={documents}
              defaultResumeId={profile?.default_resume_id ?? null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
