"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/data/documents";
import { writeAuditLog } from "@/lib/audit";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import {
  validateDocumentFile,
  sanitizeFilename,
} from "@/lib/security/file-validation";
import { extractDocumentText } from "@/lib/documents/extract";
import type { CandidateDocumentRow, DocumentKind } from "@/lib/data/types";

export type UploadResult =
  | { ok: true; document: CandidateDocumentRow; extractionFailed: boolean }
  | { ok: false; error: string };

const DOCUMENT_KINDS: DocumentKind[] = [
  "resume",
  "cover_letter",
  "portfolio_note",
  "other",
];

/**
 * Upload a candidate document: validate (MIME + magic bytes + size) server-side,
 * store under the user's private prefix, extract text (with graceful fallback),
 * and record metadata. Rate-limited (SECURITY.md §7).
 */
export async function uploadDocument(
  formData: FormData,
): Promise<UploadResult> {
  const user = await requireUser();

  if (!(await checkUserRateLimit(user.id, "upload"))) {
    return { ok: false, error: "Too many uploads. Please try again later." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose a file to upload." };
  }
  const rawTitle = String(formData.get("title") ?? "").trim();
  const kindInput = String(formData.get("kind") ?? "resume");
  const kind: DocumentKind = DOCUMENT_KINDS.includes(kindInput as DocumentKind)
    ? (kindInput as DocumentKind)
    : "resume";

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateDocumentFile({
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    bytes,
  });
  if (!validation.ok) return { ok: false, error: validation.error };

  const documentId = randomUUID();
  const storagePath = `${user.id}/${documentId}/${sanitizeFilename(file.name)}`;
  const supabase = await createSupabaseServerClient();

  const upload = await supabase.storage
    .from("documents")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upload.error) {
    return { ok: false, error: "Upload failed. Please try again." };
  }

  const extraction = await extractDocumentText(validation.type, bytes);
  const title = (rawTitle || file.name).slice(0, 200);

  const { data, error } = await supabase
    .from("candidate_documents")
    .insert({
      id: documentId,
      user_id: user.id,
      kind,
      title,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      extracted_text:
        extraction.status === "succeeded" ? extraction.text : null,
      extraction_status: extraction.status,
    })
    .select("*")
    .single();

  if (error || !data) {
    // Roll back the orphaned storage object.
    await supabase.storage.from("documents").remove([storagePath]);
    return { ok: false, error: "Couldn't save the document." };
  }

  await writeAuditLog({
    userId: user.id,
    action: "document.upload",
    resourceType: "candidate_document",
    resourceId: documentId,
    metadata: { kind, size_bytes: file.size, extracted: extraction.status },
  });

  revalidatePath("/profile");
  return {
    ok: true,
    document: data,
    extractionFailed: extraction.status === "failed",
  };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** Delete a document: remove the storage object first, then the row + links. */
export async function deleteDocument(
  documentId: string,
): Promise<SimpleResult> {
  const user = await requireUser();
  const doc = await getDocument(documentId);
  if (!doc) return { ok: false, error: "Document not found." };

  const supabase = await createSupabaseServerClient();
  await supabase.storage.from("documents").remove([doc.storage_path]);

  const { error } = await supabase
    .from("candidate_documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't delete the document." };

  await writeAuditLog({
    userId: user.id,
    action: "document.delete",
    resourceType: "candidate_document",
    resourceId: documentId,
  });
  revalidatePath("/profile");
  return { ok: true };
}

/** Set (or clear, with null) the user's default résumé. */
export async function setDefaultResume(
  documentId: string | null,
): Promise<SimpleResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (documentId) {
    const doc = await getDocument(documentId);
    if (!doc) return { ok: false, error: "Document not found." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ default_resume_id: documentId })
    .eq("id", user.id);
  if (error)
    return { ok: false, error: "Couldn't update your default résumé." };

  revalidatePath("/profile");
  return { ok: true };
}
