"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { profileSchema } from "@/lib/validation/auth";
import { type FormState } from "@/lib/validation/form-state";

/**
 * Sign out (ROUTES.md §2 `/auth/signout`). Clears the session cookies and
 * returns the user to the marketing home page.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Update the caller's own profile. Re-verifies the session and validates
 * input server-side (reachable by direct POST regardless of UI state).
 */
export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    headline: formData.get("headline"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: {
        fullName: String(formData.get("fullName") ?? ""),
        headline: String(formData.get("headline") ?? ""),
        timezone: String(formData.get("timezone") ?? ""),
      },
    };
  }

  const { fullName, headline, timezone } = parsed.data;
  const supabase = await createSupabaseServerClient();

  // RLS restricts this update to the caller's own row; the role guard trigger
  // blocks any attempt to escalate. We only ever write these three columns.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      headline: headline || null,
      timezone,
    })
    .eq("id", user.id);

  if (error) {
    return {
      status: "error",
      message: "Couldn't save your changes. Please try again.",
      values: { fullName, headline, timezone },
    };
  }

  revalidatePath("/profile");
  revalidatePath("/settings");
  return { status: "success", message: "Profile saved." };
}
